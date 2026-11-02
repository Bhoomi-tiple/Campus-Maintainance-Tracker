const express = require("express");
const User = require("../models/User");
const Complaint = require("../models/Complaints");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/users/me - Get current logged in user
router.get("/me", authenticate, async (req, res) => {
  return res.status(200).json(req.user);
});

// PUT /api/users/me - Update profile
router.put("/me", authenticate, async (req, res) => {
  try {
    const { name, phone, department, studentId } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (department !== undefined) updates.department = department.trim();
    if (studentId !== undefined && req.user.role === "student") {
      updates.studentId = studentId.trim();
    }
    updates.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not update profile" });
  }
});

// PUT /api/users/me/password - Change password
router.put("/me/password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update password" });
  }
});

// ADMIN ROUTES BELOW:
// GET /api/users - List users with optional role filtering and search
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });

    // Include counts if requested
    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const doc = u.toObject();
        if (doc.role === "student") {
          doc.complaintCount = await Complaint.countDocuments({
            $or: [{ student: u._id }, { studentName: u.name }]
          });
        } else if (doc.role === "staff") {
          doc.assignedCount = await Complaint.countDocuments({ assignedStaff: u._id });
          doc.resolvedCount = await Complaint.countDocuments({
            assignedStaff: u._id,
            status: { $in: ["Resolved", "Closed"] }
          });
        }
        return doc;
      })
    );

    return res.status(200).json(usersWithCounts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/users - Admin creates new user (student/staff/admin)
router.post("/", authenticate,  authorize("admin"), async (req, res) => {
  try {
    const { name, email, password, role, studentId, phone, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || "student",
      studentId: (studentId || "").trim(),
      phone: (phone || "").trim(),
      department: (department || "").trim()
    });

    await user.save();
    return res.status(201).json(user.toJSON());
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// PUT /api/users/:id - Admin updates user
router.put("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { name, email, role, studentId, phone, department, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (role) user.role = role;
    if (studentId !== undefined) user.studentId = studentId.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department !== undefined) user.department = department.trim();
    if (password && password.length >= 6) user.password = password;

    await user.save();
    return res.status(200).json(user.toJSON());
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// DELETE /api/users/:id - Admin deletes user
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own admin account" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
