require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");

async function seedInitialUsers() {
  await connectDB();
  console.log("Seeding initial accounts...");

  const defaultUsers = [
    {
      name: "Campus Administrator",
      email: "admin@college.edu",
      password: "AdminPassword123!",
      role: "admin",
      department: "Administration",
      phone: "9876543210"
    },
    {
      name: "Ramesh Sharma (Electrician)",
      email: "ramesh.electrical@college.edu",
      password: "StaffPassword123!",
      role: "staff",
      department: "Electrical",
      phone: "9876543211"
    },
    {
      name: "Suresh Kumar (Plumber)",
      email: "suresh.plumbing@college.edu",
      password: "StaffPassword123!",
      role: "staff",
      department: "Plumbing",
      phone: "9876543212"
    },
    {
      name: "Anita Verma (Hostel Superintendent)",
      email: "anita.hostel@college.edu",
      password: "StaffPassword123!",
      role: "staff",
      department: "Hostel Maintenance",
      phone: "9876543213"
    },
    {
      name: "Rahul Sharma (Student)",
      email: "rahul.student@college.edu",
      password: "StudentPassword123!",
      role: "student",
      studentId: "20240110001",
      department: "Computer Science",
      phone: "9876543214"
    }
  ];

  for (const u of defaultUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const created = new User(u);
      await created.save();
      console.log(`Created default user: ${u.email} (${u.role})`);
    } else {
      console.log(`User already exists: ${u.email} (${u.role})`);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seedInitialUsers().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

