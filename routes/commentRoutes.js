const express = require("express");
const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const Complaint = require("../models/Complaints");
const Notification = require("../models/Notification");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/comments/:complaintId
router.get("/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    let queryId = complaintId;

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      const found = await Complaint.findOne({ ticketId: complaintId.toUpperCase() });
      if (!found) return res.status(200).json([]);
      queryId = found._id;
    }

    const comments = await Comment.find({ complaint: queryId }).sort({ createdAt: 1 });
    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/comments/:complaintId
router.post("/:complaintId", authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    let complaint = null;
    if (mongoose.Types.ObjectId.isValid(req.params.complaintId)) {
      complaint = await Complaint.findById(req.params.complaintId);
    }
    if (!complaint) {
      complaint = await Complaint.findOne({ ticketId: req.params.complaintId.toUpperCase() });
    }
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const comment = new Comment({
      complaint: complaint._id,
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      text: text.trim()
    });

    await comment.save();

    // Trigger notification
    const isStudentAuthor = req.user.role === "student";
    if (isStudentAuthor && complaint.assignedStaff) {
      // Notify assigned staff
      await Notification.create({
        recipient: complaint.assignedStaff,
        type: "status_update",
        message: `${req.user.name} added a comment on complaint ${complaint.ticketId}: "${text.slice(0, 60)}..."`,
        relatedComplaint: complaint._id
      });
    } else if (!isStudentAuthor && complaint.student) {
      // Notify student
      await Notification.create({
        recipient: complaint.student,
        type: "status_update",
        message: `${req.user.name} (${req.user.role}) added an update on complaint ${complaint.ticketId}: "${text.slice(0, 60)}..."`,
        relatedComplaint: complaint._id
      });
    }

    return res.status(201).json(comment);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;

