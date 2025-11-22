const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../routes/auth");

describe("Authentication Middleware", () => {
  test("authenticateToken should return 401 for missing token", () => {
    const req = {
      headers: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Access token required" });
  });

  test("authenticateToken should return 403 for invalid token", () => {
    const req = {
      headers: {
        authorization: "Bearer invalid-token",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired token",
    });
  });
});
