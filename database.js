const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Use different database paths for development and production
const isProduction = process.env.NODE_ENV === "production";
const dbPath = isProduction
  ? path.join(__dirname, "data.db") // Render uses ephemeral storage
  : path.join(__dirname, "inventory.db");

console.log(`Database path: ${dbPath}`);
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

const initializeDatabase = () => {
  db.serialize(() => {
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      unit TEXT,
      category TEXT,
      brand TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'In Stock',
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Inventory history table
    db.run(`CREATE TABLE IF NOT EXISTS inventory_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      old_quantity INTEGER,
      new_quantity INTEGER,
      change_date TEXT,
      user_info TEXT DEFAULT 'System',
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Users table for authentication
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Check if we need to insert sample data (only in development or empty database)
    if (!isProduction) {
      db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (err) {
          console.error("Error checking products count:", err);
          return;
        }

        if (row.count === 0) {
          console.log("Inserting sample data...");
          const sampleProducts = [
            ["Laptop", "Piece", "Electronics", "Dell", 15],
            ["Mouse", "Piece", "Electronics", "Logitech", 25],
            ["Notebook", "Piece", "Stationery", "Classmate", 50],
            ["Pen", "Piece", "Stationery", "Reynolds", 100],
            ["Chair", "Piece", "Furniture", "Ikea", 10],
          ];

          sampleProducts.forEach((product) => {
            db.run(
              "INSERT INTO products (name, unit, category, brand, stock) VALUES (?, ?, ?, ?, ?)",
              product,
              function (err) {
                if (err) {
                  console.error("Error inserting product:", err);
                  return;
                }

                // Create initial inventory history
                db.run(
                  `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info) 
                   VALUES (?, ?, ?, ?, ?)`,
                  [
                    this.lastID,
                    0,
                    product[4],
                    new Date().toISOString(),
                    "System Initialization",
                  ]
                );
              }
            );
          });
          console.log("Sample data inserted successfully");
        }
      });
    }
  });
};

module.exports = { db, initializeDatabase };
