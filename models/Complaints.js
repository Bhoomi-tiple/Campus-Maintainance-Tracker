const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: "System"
  },
  note: {
    type: String,
    default: ""
  }
}, { _id: false });

const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: ""
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true,
    default: ""
  },
  category: {
    type: String,
    enum: [
      "Electrical",
      "Plumbing",
      "Cleanliness",
      "Furniture",
      "Internet and Networking",
      "Laboratory Equipment",
      "Hostel Maintenance",
      "Other"
    ],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  building: {
    type: String,
    trim: true,
    default: ""
  },
  floor: {
    type: String,
    trim: true,
    default: ""
  },
  roomNumber: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium"
  },
  status: {
    type: String,
    enum: ["Submitted", "Assigned", "In Progress", "Resolved", "Closed", "Pending"],
    default: "Submitted"
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  statusHistory: [statusHistorySchema],
  feedback: {
    type: feedbackSchema,
    default: null
  },
  slaDeadline: {
    type: Date
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save to compute ticketId and SLA deadline
complaintSchema.pre("save", function () {
  this.updatedAt = new Date();

  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timeSuffix = Date.now().toString().slice(-4);
    this.ticketId = `CMP-${year}-${timeSuffix}${randomSuffix % 100}`;
  }

  if (!this.title) {
    this.title = `${this.category} Issue in ${this.roomNumber}`;
  }

  if (!this.slaDeadline) {
    const hoursMap = {
      Urgent: 24,
      High: 48,
      Medium: 72,
      Low: 120
    };
    const hours = hoursMap[this.priority] || 72;
    this.slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  if (this.statusHistory && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status === "Pending" ? "Submitted" : this.status,
      timestamp: new Date(),
      updatedBy: this.studentName || "Student",
      note: "Complaint submitted"
    });
  }
});

module.exports = mongoose.model("Complaint", complaintSchema);
