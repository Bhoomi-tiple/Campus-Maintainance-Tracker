const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("../models/Complaints");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Helper to optionally authenticate if token is present
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("../middleware/auth");
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (user) req.user = user;
    } catch (e) {
      // Token invalid or expired, continue as guest
    }
  }
  next();
}

// 1. CREATE COMPLAINT: POST /api/complaints
router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      title,
      category,
      priority,
      building,
      floor,
      roomNumber,
      description,
      studentName
    } = req.body;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }
    if (!roomNumber) {
      return res.status(400).json({ message: "Room number is required" });
    }
    if (!description || description.trim().length < 5) {
      return res.status(400).json({ message: "Description is required (minimum 5 characters)" });
    }

    const studentUser = req.user || null;
    const resolvedStudentName = (studentUser ? studentUser.name : studentName) || "Anonymous Student";

    const complaint = new Complaint({
      student: studentUser ? studentUser._id : null,
      studentName: resolvedStudentName,
      title: title || `${category} Issue in ${roomNumber}`,
      category,
      priority: priority || "Medium",
      building: building || "",
      floor: floor || "",
      roomNumber,
      description,
      status: "Submitted"
    });

    const saved = await complaint.save();

    // Create notification for student if registered
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: "complaint_submitted",
        message: `Your complaint has been submitted successfully (Ticket: ${saved.ticketId}).`,
        relatedComplaint: saved._id
      });
    }

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create Complaint Error:", error);
    return res.status(400).json({ message: error.message || "Failed to submit complaint" });
  }
});

// 2. GET LOGGED-IN STUDENT'S COMPLAINTS: GET /api/complaints/mine
router.get("/mine", authenticate, async (req, res) => {
  try {
    const complaints = await Complaint.find({
      $or: [
        { student: req.user._id },
        { studentName: req.user.name }
      ]
    })
      .populate("assignedStaff", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. GET LOGGED-IN STAFF'S ASSIGNED COMPLAINTS: GET /api/complaints/assigned
router.get("/assigned", authenticate, authorize("staff", "admin"), async (req, res) => {
  try {
    const complaints = await Complaint.find({ assignedStaff: req.user._id })
      .populate("student", "name email studentId phone department")
      .sort({ createdAt: -1 });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. GET ALL COMPLAINTS: GET /api/complaints (with search, filter, pagination, sort)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page,
      limit
    } = req.query;

    const query = {};

    if (status) {
      if (status === "Submitted") {
        query.status = { $in: ["Submitted", "Pending"] };
      } else {
        query.status = status;
      }
    }
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { ticketId: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
        { roomNumber: { $regex: s, $options: "i" } },
        { building: { $regex: s, $options: "i" } },
        { studentName: { $regex: s, $options: "i" } }
      ];
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    // If page and limit provided, return paginated structure
    if (page !== undefined && limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.max(1, parseInt(limit, 10) || 10);
      const total = await Complaint.countDocuments(query);
      const complaints = await Complaint.find(query)
        .populate("student", "name email studentId phone department")
        .populate("assignedStaff", "name email phone")
        .sort(sortObj)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize);

      return res.status(200).json({
        complaints,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / pageSize)
      });
    }

    // Default: return array
    const complaints = await Complaint.find(query)
      .populate("student", "name email studentId phone department")
      .populate("assignedStaff", "name email phone")
      .sort(sortObj);

    return res.status(200).json(complaints);
  } catch (error) {
    console.error("Get All Complaints Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

// 5. GET COMPLAINT BY ID: GET /api/complaints/:id
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let complaint = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      complaint = await Complaint.findById(id)
        .populate("student", "name email studentId phone department")
        .populate("assignedStaff", "name email phone");
    }

    if (!complaint) {
      complaint = await Complaint.findOne({ ticketId: id.toUpperCase() })
        .populate("student", "name email studentId phone department")
        .populate("assignedStaff", "name email phone");
    }

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(400).json({ message: "Invalid complaint identifier" });
  }
});

// 6. UPDATE COMPLAINT STATUS: PATCH /api/complaints/:id/status
router.patch("/:id/status", authenticate, authorize("staff", "admin"), async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const oldStatus = complaint.status;
    complaint.status = status;
    complaint.updatedAt = new Date();

    if (status === "Resolved" || status === "Closed") {
      complaint.resolvedAt = complaint.resolvedAt || new Date();
    }

    complaint.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.name,
      note: note || `Status updated from ${oldStatus} to ${status}`
    });

    await complaint.save();

    // Send notification to student if linked
    if (complaint.student) {
      const notifType = (status === "Resolved" || status === "Closed")
        ? "complaint_resolved"
        : "status_update";
      await Notification.create({
        recipient: complaint.student,
        type: notifType,
        message: `Your complaint (${complaint.ticketId}) status changed to: ${status}. ${note ? `Note: ${note}` : ""}`,
        relatedComplaint: complaint._id
      });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// 7. ASSIGN COMPLAINT TO STAFF: PATCH /api/complaints/:id/assign
router.patch("/:id/assign", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { staffId, note } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required" });
    }

    const staffUser = await User.findOne({ _id: staffId, role: "staff" });
    if (!staffUser) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    complaint.assignedStaff = staffUser._id;
    if (complaint.status === "Submitted" || complaint.status === "Pending") {
      complaint.status = "Assigned";
    }
    complaint.updatedAt = new Date();

    complaint.statusHistory.push({
      status: complaint.status,
      timestamp: new Date(),
      updatedBy: req.user.name,
      note: note || `Assigned to staff member ${staffUser.name}`
    });

    await complaint.save();

    // Notify staff
    await Notification.create({
      recipient: staffUser._id,
      type: "complaint_assigned",
      message: `You have been assigned to complaint ${complaint.ticketId}: "${complaint.title}". Location: Room ${complaint.roomNumber}.`,
      relatedComplaint: complaint._id
    });

    // Notify student
    if (complaint.student) {
      await Notification.create({
        recipient: complaint.student,
        type: "complaint_assigned",
        message: `Your complaint (${complaint.ticketId}) has been assigned to staff member ${staffUser.name}.`,
        relatedComplaint: complaint._id
      });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// 8. UPDATE COMPLAINT (General edit): PUT /api/complaints/:id
router.put("/:id", authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only admin or the student owner can edit
    const isOwner = complaint.student && complaint.student.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to edit this complaint" });
    }

    const fields = ["title", "category", "description", "building", "floor", "roomNumber", "priority"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) complaint[f] = req.body[f];
    });

    if (isAdmin && req.body.status) {
      complaint.status = req.body.status;
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// 9. DELETE COMPLAINT: DELETE /api/complaints/:id
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    return res.status(200).json({ message: "Complaint deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Invalid complaint ID" });
  }
});

module.exports = router;
