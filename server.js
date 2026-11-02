const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

// Import route modules
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const commentRoutes = require("./routes/commentRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure database connection for incoming requests (serverless compatible)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failure:", err.message);
    return res.status(500).json({ message: "Database connection error. Please try again later." });
  }
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

// Static assets
app.use(express.static(path.join(__dirname, "public")));

// Root route serves the login page as homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Legacy complaint form preserved at /legacy
app.get("/legacy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "legacy-complaint-form.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(err.status || 500).json({
    message: err.message || "An internal server error occurred"
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Campus Maintenance Management System server running on port ${PORT}`);
  });
}
