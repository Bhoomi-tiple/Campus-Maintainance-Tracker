const express = require("express");
const router = express.Router();

const Complaint = require("../models/Complaints");

// 1. CREATE a complaint
router.post("/", async (req, res) => {
    try {
        const complaint = new Complaint(req.body);
        const savedComplaint = await complaint.save();

        res.status(201).json(savedComplaint);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 2. READ all complaints
router.get("/", async (req, res) => {
    try {
        const complaints = await Complaint.find();
        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 3. READ complaint by ID
router.get("/:id", async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json(complaint);
    } catch (error) {
        res.status(400).json({ message: "Invalid complaint ID" });
    }
});

// 4. UPDATE complaint
router.put("/:id", async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json(complaint);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 5. DELETE complaint
router.delete("/:id", async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndDelete(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json({ message: "Complaint deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: "Invalid complaint ID" });
    }
});

module.exports = router;