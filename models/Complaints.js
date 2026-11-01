const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    roomNumber: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ["Electrical", "Plumbing", "Cleanliness", "Furniture", "Other"],
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Resolved"],
        default: "Pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Complaint", complaintSchema);