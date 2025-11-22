const request = require("supertest");
const app = require("../server"); // Import the app directly
const { db } = require("../database");

// Mock the database to use a test database
jest.mock("../database", () => {
  const mockDb = {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    serialize: jest.fn(),
  };

  return {
    db: mockDb,
    initializeDatabase: jest.fn(),
  };
});

describe("Products API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/health should return server status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "OK");
    expect(response.body).toHaveProperty("message", "Server is running");
  });

  test("POST /api/auth/register should validate required fields", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "ab", // Too short
      email: "invalid-email", // Invalid email
      password: "123", // Too short
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  test("POST /api/auth/login should validate required fields", async () => {
    const response = await request(app).post("/api/auth/login").send({
      username: "", // Empty
      password: "", // Empty
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });
});

describe("Protected Routes", () => {
  test("GET /api/products without token should return 401", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Access token required");
  });

  test("GET /api/export-products without token should return 401", async () => {
    const response = await request(app).get("/api/export-products");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Access token required");
  });

  test("POST /api/products without token should return 401", async () => {
    const response = await request(app).post("/api/products").send({
      name: "Test Product",
      stock: 10,
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Access token required");
  });
});

describe("Error Handling", () => {
  test("GET non-existent route should return 404", async () => {
    const response = await request(app).get("/api/non-existent-route");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "Route not found");
  });
});
