const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../database");
const { body, validationResult } = require("express-validator");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Register user
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      // Check if user already exists
      db.get(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        [username, email],
        async (err, user) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (user) {
            return res.status(400).json({ error: "User already exists" });
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert new user
          db.run(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Generate JWT token
              const token = jwt.sign(
                { userId: this.lastID, username },
                JWT_SECRET,
                { expiresIn: "24h" }
              );

              res.status(201).json({
                message: "User registered successfully",
                token,
                user: { id: this.lastID, username, email },
              });
            }
          );
        }
      );
    } catch (error) {
      res.status(500).json({ error: "Server error during registration" });
    }
  }
);

// Login user
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user
      db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
          }

          // Check password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: "24h" }
          );

          res.json({
            message: "Login successful",
            token,
            user: { id: user.id, username: user.username, email: user.email },
          });
        }
      );
    } catch (error) {
      res.status(500).json({ error: "Server error during login" });
    }
  }
);

// Verify token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

module.exports = { router, authenticateToken };
