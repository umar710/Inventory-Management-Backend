const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const { db } = require("../database");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

/*
// Import products from CSV - THIS SHOULD BE /api/products/import
router.post("/import", upload.single("csvFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const results = [];
  const errors = [];
  let added = 0;
  let skipped = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      results.push(data);
    })
    .on("end", () => {
      let processed = 0;

      if (results.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "CSV file is empty" });
      }

      results.forEach((product) => {
        const { name, unit, category, brand, stock } = product;

        if (!name || stock === undefined) {
          errors.push(`Skipped: Missing required fields for product ${name}`);
          skipped++;
          processed++;
          checkCompletion();
          return;
        }

        // Check for duplicate
        db.get(
          "SELECT id FROM products WHERE name = ?",
          [name],
          (err, existing) => {
            if (err) {
              errors.push(`Error checking product ${name}: ${err.message}`);
              skipped++;
            } else if (existing) {
              errors.push(`Skipped: Product "${name}" already exists`);
              skipped++;
            } else {
              // Insert new product
              db.run(
                "INSERT INTO products (name, unit, category, brand, stock) VALUES (?, ?, ?, ?, ?)",
                [name, unit, category, brand, parseInt(stock) || 0],
                function (err) {
                  if (err) {
                    errors.push(`Error adding product ${name}: ${err.message}`);
                    skipped++;
                  } else {
                    added++;
                  }
                  processed++;
                  checkCompletion();
                }
              );
            }
          }
        );
      });

      function checkCompletion() {
        if (processed === results.length) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: "Import completed",
            summary: {
              total: results.length,
              added,
              skipped,
              errors,
            },
          });
        }
      }
    })
    .on("error", (error) => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: `Error processing CSV: ${error.message}` });
    });
});

*/

// Import products from CSV
router.post("/import", upload.single("csvFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const results = [];
  const errors = [];
  let added = 0;
  let skipped = 0;

  console.log("Starting CSV import..."); // Debug log

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      console.log("CSV Row:", data); // Debug each row
      results.push(data);
    })
    .on("headers", (headers) => {
      console.log("CSV Headers:", headers); // Debug headers
    })
    .on("end", () => {
      console.log("CSV parsing completed. Total rows:", results.length); // Debug

      if (results.length === 0) {
        fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ error: "CSV file is empty or invalid format" });
      }

      let processed = 0;

      results.forEach((product, index) => {
        console.log(`Processing row ${index + 1}:`, product); // Debug each product

        // More robust field checking
        const name = product.Name || product.name;
        const unit = product.Unit || product.unit || "";
        const category = product.Category || product.category || "";
        const brand = product.Brand || product.brand || "";
        const stock = product.Stock || product.stock;

        console.log(`Extracted fields - Name: "${name}", Stock: "${stock}"`); // Debug

        if (!name || stock === undefined || stock === null || stock === "") {
          const errorMsg = `Skipped: Missing required fields for product "${
            name || "unnamed"
          }" - Name: "${name}", Stock: "${stock}"`;
          console.log(errorMsg); // Debug
          errors.push(errorMsg);
          skipped++;
          processed++;
          checkCompletion();
          return;
        }

        // Convert stock to number
        const stockNumber = parseInt(stock);
        if (isNaN(stockNumber) || stockNumber < 0) {
          const errorMsg = `Skipped: Invalid stock value for product "${name}": ${stock}`;
          console.log(errorMsg); // Debug
          errors.push(errorMsg);
          skipped++;
          processed++;
          return;
        }

        // Check for duplicate
        db.get(
          "SELECT id FROM products WHERE name = ?",
          [name],
          (err, existing) => {
            if (err) {
              const errorMsg = `Error checking product "${name}": ${err.message}`;
              console.log(errorMsg); // Debug
              errors.push(errorMsg);
              skipped++;
            } else if (existing) {
              const errorMsg = `Skipped: Product "${name}" already exists`;
              console.log(errorMsg); // Debug
              errors.push(errorMsg);
              skipped++;
            } else {
              // Insert new product
              db.run(
                "INSERT INTO products (name, unit, category, brand, stock) VALUES (?, ?, ?, ?, ?)",
                [name, unit, category, brand, stockNumber],
                function (err) {
                  if (err) {
                    const errorMsg = `Error adding product "${name}": ${err.message}`;
                    console.log(errorMsg); // Debug
                    errors.push(errorMsg);
                    skipped++;
                  } else {
                    console.log(`Successfully added product: "${name}"`); // Debug
                    added++;
                  }
                  processed++;
                  checkCompletion();
                }
              );
            }
          }
        );
      });

      function checkCompletion() {
        if (processed === results.length) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          console.log("Import completed:", {
            total: results.length,
            added,
            skipped,
            errors,
          }); // Debug

          res.json({
            message: "Import completed",
            summary: {
              total: results.length,
              added,
              skipped,
              errors,
            },
          });
        }
      }
    })
    .on("error", (error) => {
      console.error("CSV parsing error:", error); // Debug
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: `Error processing CSV: ${error.message}` });
    });
});
//
/*
// Export products to CSV - THIS SHOULD BE /api/products/export
router.get("/export", (req, res) => {
  db.all("SELECT * FROM products", (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Create CSV header
    let csvData = "Name,Unit,Category,Brand,Stock,Status\n";

    // Add product data
    products.forEach((product) => {
      const status = product.stock === 0 ? "Out of Stock" : "In Stock";
      csvData += `"${product.name}","${product.unit || ""}","${
        product.category || ""
      }","${product.brand || ""}",${product.stock},"${status}"\n`;
    });

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="products.csv"');
    res.status(200).send(csvData);
  });
});
*/

// Export products to CSV
router.get("/export", (req, res) => {
  console.log("📤 Export endpoint called"); // Debug log

  db.all("SELECT * FROM products", (err, products) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`📊 Exporting ${products.length} products`); // Debug log

    // Create CSV header
    let csvData = "Name,Unit,Category,Brand,Stock,Status\n";

    // Add product data
    products.forEach((product) => {
      const status = product.stock === 0 ? "Out of Stock" : "In Stock";
      const name = product.name ? `"${product.name.replace(/"/g, '""')}"` : "";
      const unit = product.unit ? `"${product.unit.replace(/"/g, '""')}"` : "";
      const category = product.category
        ? `"${product.category.replace(/"/g, '""')}"`
        : "";
      const brand = product.brand
        ? `"${product.brand.replace(/"/g, '""')}"`
        : "";

      csvData += `${name},${unit},${category},${brand},${product.stock},"${status}"\n`;
    });

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="products_export.csv"'
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvData, "utf8"));

    console.log("✅ Export completed successfully"); // Debug log
    res.status(200).send(csvData);
  });
});

module.exports = router;
