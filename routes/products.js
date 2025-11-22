const express = require("express");
const { db } = require("../database");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// GET all products with search and filter
router.get("/", (req, res) => {
  const {
    search,
    category,
    page = 1,
    limit = 10,
    sort = "name",
    order = "asc",
  } = req.query;

  let query = "SELECT * FROM products WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM products WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND (name LIKE ? OR brand LIKE ?)";
    countQuery += " AND (name LIKE ? OR brand LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    query += " AND category = ?";
    countQuery += " AND category = ?";
    params.push(category);
  }

  // Add sorting
  const validSortFields = ["name", "category", "brand", "stock", "created_at"];
  const sortField = validSortFields.includes(sort) ? sort : "name";
  const sortOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${sortOrder}`;

  // Add pagination
  const offset = (page - 1) * limit;
  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit), offset);

  db.get(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(query, params, (err, products) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Update status based on stock
      products.forEach((product) => {
        product.status = product.stock === 0 ? "Out of Stock" : "In Stock";
      });

      res.json({
        products,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit),
        },
      });
    });
  });
});

// GET product by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.status = product.stock === 0 ? "Out of Stock" : "In Stock";
    res.json(product);
  });
});

// POST /api/products - Create new product
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("stock")
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, unit, category, brand, stock } = req.body;
    const username = req.user?.username || "System";

    // Check for duplicate name
    db.get(
      "SELECT id FROM products WHERE name = ?",
      [name],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existing) {
          return res.status(400).json({ error: "Product name already exists" });
        }

        // Insert new product
        db.run(
          "INSERT INTO products (name, unit, category, brand, stock) VALUES (?, ?, ?, ?, ?)",
          [name, unit, category, brand, stock],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const productId = this.lastID;

            // Create initial inventory history entry
            db.run(
              `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info) 
           VALUES (?, ?, ?, ?, ?)`,
              [
                productId,
                0,
                stock,
                new Date().toISOString(),
                `${username} - Created`,
              ],
              function (historyErr) {
                if (historyErr) {
                  console.error("Error creating history:", historyErr);
                }

                // Get the newly created product
                db.get(
                  "SELECT * FROM products WHERE id = ?",
                  [productId],
                  (err, newProduct) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    newProduct.status =
                      newProduct.stock === 0 ? "Out of Stock" : "In Stock";

                    res.status(201).json({
                      message: "Product created successfully",
                      product: newProduct,
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);

// UPDATE product
router.put(
  "/:id",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("stock")
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, unit, category, brand, stock } = req.body;
    const username = req.user?.username || "Unknown User";

    // Get current product data
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, oldProduct) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!oldProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check for duplicate name (excluding current product)
      db.get(
        "SELECT id FROM products WHERE name = ? AND id != ?",
        [name, id],
        (err, duplicate) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (duplicate) {
            return res
              .status(400)
              .json({ error: "Product name already exists" });
          }

          // Update product
          const updateQuery = `UPDATE products 
                          SET name = ?, unit = ?, category = ?, brand = ?, stock = ?, updated_at = CURRENT_TIMESTAMP 
                          WHERE id = ?`;

          db.run(
            updateQuery,
            [name, unit, category, brand, stock, id],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Track inventory history if stock changed
              if (oldProduct.stock !== parseInt(stock)) {
                const historyQuery = `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info) 
                               VALUES (?, ?, ?, ?, ?)`;
                db.run(historyQuery, [
                  id,
                  oldProduct.stock,
                  stock,
                  new Date().toISOString(),
                  `${username} - Stock Update`,
                ]);
              }

              // Also track history for other field changes (if stock didn't change)
              const fieldsChanged = [];
              if (oldProduct.name !== name) fieldsChanged.push("name");
              if (oldProduct.category !== category)
                fieldsChanged.push("category");
              if (oldProduct.brand !== brand) fieldsChanged.push("brand");
              if (oldProduct.unit !== unit) fieldsChanged.push("unit");

              if (
                fieldsChanged.length > 0 &&
                oldProduct.stock === parseInt(stock)
              ) {
                const historyQuery = `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info) 
                               VALUES (?, ?, ?, ?, ?)`;
                db.run(historyQuery, [
                  id,
                  oldProduct.stock,
                  stock,
                  new Date().toISOString(),
                  `${username} - Updated ${fieldsChanged.join(", ")}`,
                ]);
              }

              res.json({
                message: "Product updated successfully",
                changes: this.changes,
              });
            }
          );
        }
      );
    });
  }
);

// DELETE product
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const username = req.user?.username || "Unknown User";

  // Get product info before deletion for history
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Add deletion history record
      if (product) {
        db.run(
          `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            product.stock,
            0,
            new Date().toISOString(),
            `${username} - Product Deleted`,
          ]
        );
      }

      // Also delete related history (optional - you might want to keep history)
      // db.run('DELETE FROM inventory_history WHERE product_id = ?', [id]);

      res.json({ message: "Product deleted successfully" });
    });
  });
});

// GET inventory history for a product
router.get("/:id/history", (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT * FROM inventory_history 
     WHERE product_id = ? 
     ORDER BY change_date DESC`,
    [id],
    (err, history) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(history);
    }
  );
});

// GET categories
router.get("/data/categories", (req, res) => {
  db.all(
    "SELECT DISTINCT category FROM products WHERE category IS NOT NULL",
    (err, categories) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(categories.map((c) => c.category));
    }
  );
});

module.exports = router;
