const express = require("express");
const Complaint = require("../models/Complaints");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/analytics
router.get("/", authenticate, authorize("admin", "staff"), async (req, res) => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      urgentComplaints,
      totalStudents,
      totalStaff,
      recentComplaints,
      categoryStats,
      priorityStats,
      statusStats,
      feedbackStats
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: ["Submitted", "Assigned", "Pending"] } }),
      Complaint.countDocuments({ status: "In Progress" }),
      Complaint.countDocuments({ status: { $in: ["Resolved", "Closed"] } }),
      Complaint.countDocuments({ priority: "Urgent", status: { $nin: ["Resolved", "Closed"] } }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "staff" }),
      Complaint.find()
        .populate("assignedStaff", "name")
        .populate("student", "name email")
        .sort({ createdAt: -1 })
        .limit(10),
      Complaint.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $match: { "feedback.rating": { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$feedback.rating" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const avgRating = feedbackStats.length > 0
      ? Number(feedbackStats[0].avgRating.toFixed(2))
      : 0;
    const feedbackCount = feedbackStats.length > 0
      ? feedbackStats[0].count
      : 0;

    return res.status(200).json({
      summary: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        urgentComplaints,
        totalStudents,
        totalStaff,
        avgRating,
        feedbackCount
      },
      byCategory: categoryStats.map((item) => ({
        category: item._id || "Other",
        count: item.count
      })),
      byPriority: priorityStats.map((item) => ({
        priority: item._id || "Medium",
        count: item.count
      })),
      byStatus: statusStats.map((item) => ({
        status: item._id || "Submitted",
        count: item.count
      })),
      recentComplaints
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

