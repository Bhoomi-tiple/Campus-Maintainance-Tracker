const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("../models/Complaints");
const Notification = require("../models/Notification");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// POST /api/feedback/:complaintId
router.post("/:complaintId", authenticate, async (req, res) => {
  try {
    const { rating, message } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Please provide a valid rating between 1 and 5 stars" });
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

    complaint.feedback = {
      rating: numericRating,
      message: (message || "").trim(),
      submittedAt: new Date()
    };

    await complaint.save();

    // Notify assigned staff if present
    if (complaint.assignedStaff) {
      await Notification.create({
        recipient: complaint.assignedStaff,
        type: "feedback_received",
        message: `${req.user.name} rated resolution ${numericRating}/5 stars for ticket ${complaint.ticketId}.`,
        relatedComplaint: complaint._id
      });
    }

    return res.status(200).json({
      message: "Feedback submitted successfully",
      feedback: complaint.feedback
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// GET /api/feedback - List all complaints with feedback (admin view)
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const complaintsWithFeedback = await Complaint.find({
      feedback: { $ne: null, $exists: true }
    })
      .select("ticketId title category roomNumber building feedback studentName assignedStaff createdAt resolvedAt")
      .populate("assignedStaff", "name email")
      .sort({ "feedback.submittedAt": -1 });

    return res.status(200).json(complaintsWithFeedback);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

