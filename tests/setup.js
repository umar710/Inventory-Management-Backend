const { db } = require("../database");

// Global test setup
beforeAll(async () => {
  // Use a test database or mock the database
  process.env.NODE_ENV = "test";
});

afterAll(async () => {
  // Close database connections
  if (db && typeof db.close === "function") {
    db.close();
  }
});
