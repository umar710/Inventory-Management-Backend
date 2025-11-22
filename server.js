/*
const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./database");
const { authenticateToken } = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Initialize database
initializeDatabase();

// Import routes
const productsRoutes = require("./routes/products");
const importExportRoutes = require("./routes/importExport");
const { router: authRoutes } = require("./routes/auth");

// Public routes (no authentication required)
app.use("/api/auth", authRoutes);

// Health check (public)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Protected routes (require authentication)
app.use("/api/products", authenticateToken, productsRoutes);
app.use("/api/products", authenticateToken, importExportRoutes);

// DIRECT EXPORT ROUTE
app.get("/api/export-products", authenticateToken, (req, res) => {
  console.log("EXPORT ROUTE CALLED by user:", req.user.username);

  const { db } = require("./database");

  db.all("SELECT * FROM products", (err, products) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`Exporting ${products.length} products`);

    // Create CSV data
    let csvData = "Name,Unit,Category,Brand,Stock,Status\n";

    products.forEach((product) => {
      const status = product.stock === 0 ? "Out of Stock" : "In Stock";
      const escapeCsv = (text) => {
        if (!text) return "";
        return `"${String(text).replace(/"/g, '""')}"`;
      };

      csvData += `${escapeCsv(product.name)},${escapeCsv(
        product.unit
      )},${escapeCsv(product.category)},${escapeCsv(product.brand)},${
        product.stock
      },"${status}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="products_export.csv"'
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvData, "utf8"));
    res.send(csvData);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Only start the server if not in test environment
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app; // Export the app for testing

*/

const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./database");
const { authenticateToken } = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-frontend-domain.vercel.app", // Add your frontend domain later
      process.env.FRONTEND_URL, // Environment variable for frontend URL
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Initialize database
initializeDatabase();

// Import routes
const productsRoutes = require("./routes/products");
const importExportRoutes = require("./routes/importExport");
const { router: authRoutes } = require("./routes/auth");

// Public routes (no authentication required)
app.use("/api/auth", authRoutes);

// Health check (public)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Protected routes (require authentication)
app.use("/api/products", authenticateToken, productsRoutes);
app.use("/api/products", authenticateToken, importExportRoutes);

// DIRECT EXPORT ROUTE
app.get("/api/export-products", authenticateToken, (req, res) => {
  console.log("EXPORT ROUTE CALLED by user:", req.user.username);

  const { db } = require("./database");

  db.all("SELECT * FROM products", (err, products) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`Exporting ${products.length} products`);

    // Create CSV data
    let csvData = "Name,Unit,Category,Brand,Stock,Status\n";

    products.forEach((product) => {
      const status = product.stock === 0 ? "Out of Stock" : "In Stock";
      const escapeCsv = (text) => {
        if (!text) return "";
        return `"${String(text).replace(/"/g, '""')}"`;
      };

      csvData += `${escapeCsv(product.name)},${escapeCsv(
        product.unit
      )},${escapeCsv(product.category)},${escapeCsv(product.brand)},${
        product.stock
      },"${status}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="products_export.csv"'
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvData, "utf8"));
    res.send(csvData);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

module.exports = app;
