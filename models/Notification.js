const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "complaint_submitted",
      "complaint_assigned",
      "status_update",
      "complaint_resolved",
      "feedback_received"
    ],
    default: "status_update"
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  relatedComplaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Notification", notificationSchema);

