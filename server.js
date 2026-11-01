
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const complaintRoutes = require("./routes/complaintRoutes");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api/complaints", complaintRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");
    })
    .catch((err) => {
        console.log("MongoDB Connection Error:", err);
    });

// Home route
app.get("/", (req, res) => {
    res.send("Campus Maintenance Complaint Tracker API is Running!");
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
