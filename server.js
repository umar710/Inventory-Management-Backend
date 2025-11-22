const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./database");
const { authenticateToken } = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://inventory-management-frontend-five-opal.vercel.app",
  "https://inventory-management-frontend.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options("*", cors(corsOptions));

// Middleware
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin);
  next();
});

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
    allowedOrigins: allowedOrigins,
  });
});

// Test CORS endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS is working!",
    yourOrigin: req.headers.origin,
    allowedOrigins: allowedOrigins,
  });
});

// Protected routes (require authentication)
app.use("/api/products", authenticateToken, productsRoutes);
app.use("/api/products", authenticateToken, importExportRoutes);

// DIRECT EXPORT ROUTE
app.get("/api/export-products", authenticateToken, (req, res) => {
  console.log("EXPORT ROUTE CALLED by user:", req.user?.username);

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

// Simple test export (no database) - for debugging
app.get("/api/test-export", authenticateToken, (req, res) => {
  console.log("Test export called by user:", req.user?.username);

  const csvData = `Name,Unit,Category,Brand,Stock,Status
"Test Product","Piece","Electronics","Test Brand",10,"In Stock"
"Wireless Mouse","Piece","Electronics","Logitech",25,"In Stock"
"Notebook","Piece","Stationery","Classmate",50,"In Stock"`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="test_export.csv"'
  );
  res.send(csvData);
  console.log("Test export completed!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS Error",
      message: `Origin ${req.headers.origin} is not allowed`,
      allowedOrigins: allowedOrigins,
    });
  }

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
    method: req.method,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log("=================================");
  console.log(
    "Server running in",
    process.env.NODE_ENV || "development",
    "mode"
  );
  console.log("Port:", PORT);
  console.log("Allowed Origins:");
  allowedOrigins.forEach((origin) => console.log("   -", origin));
  console.log("Health Check: http://localhost:" + PORT + "/api/health");
  console.log("CORS Test: http://localhost:" + PORT + "/api/cors-test");
  console.log("=================================");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

module.exports = app;
