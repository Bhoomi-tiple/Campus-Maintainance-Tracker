const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("../config/db");
const Complaint = require("../models/Complaints");

async function migrateExistingComplaints() {
  await connectDB();
  console.log("Checking complaints for migration...");

  const complaints = await Complaint.find();
  console.log(`Found ${complaints.length} existing complaints.`);

  let updatedCount = 0;
  for (const c of complaints) {
    let modified = false;

    if (!c.ticketId) {
      const year = new Date(c.createdAt || Date.now()).getFullYear();
      const hex = c._id.toString().slice(-4).toUpperCase();
      c.ticketId = `CMP-${year}-${hex}`;
      modified = true;
    }

    if (!c.title) {
      c.title = `${c.category || "Maintenance"} in Room ${c.roomNumber || "Campus"}`;
      modified = true;
    }

    if (!c.priority) {
      c.priority = "Medium";
      modified = true;
    }

    if (!c.statusHistory || c.statusHistory.length === 0) {
      c.statusHistory = [{
        status: c.status === "Pending" ? "Submitted" : (c.status || "Submitted"),
        timestamp: c.createdAt || new Date(),
        updatedBy: c.studentName || "Student",
        note: "Initial complaint recorded"
      }];
      modified = true;
    }

    if (!c.slaDeadline) {
      c.slaDeadline = new Date(new Date(c.createdAt || Date.now()).getTime() + 72 * 60 * 60 * 1000);
      modified = true;
    }

    if (modified) {
      await c.save();
      updatedCount++;
      console.log(`Updated complaint ${c._id} -> ticketId: ${c.ticketId}`);
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} complaints.`);
  process.exit(0);
}

migrateExistingComplaints().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
