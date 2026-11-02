const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, studentId, phone, department, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Full name is required" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Public registration only allows student role
    const assignedRole = (role === "student" || !role) ? "student" : "student";

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: assignedRole,
      studentId: (studentId || "").trim(),
      phone: (phone || "").trim(),
      department: (department || "").trim()
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(400).json({ message: error.message || "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: error.message || "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;

