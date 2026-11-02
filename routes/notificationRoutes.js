const express = require("express");
const Notification = require("../models/Notification");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/notifications/mine
router.get("/mine", authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } },
      { returnDocument: "after" }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(notification);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
