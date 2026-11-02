const app = require("../server");
const http = require("http");

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log("=== STARTING FULL SUITE: CAMPUS MAINTENANCE MANAGEMENT SYSTEM ===\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test server running at http://localhost:${TEST_PORT}\n`);

  const results = [];
  const testEmail = `test.student.${Date.now()}@college.edu`;
  const testStudentId = `TEST${Date.now().toString().slice(-6)}`;
  let studentToken = null;
  let studentUser = null;
  let staffToken = null;
  let staffUser = null;
  let adminToken = null;
  let adminUser = null;
  let createdComplaintId = null;
  let createdTicketId = null;

  async function step(name, fn) {
    process.stdout.write(`[TEST ${results.length + 1}] ${name} ... `);
    try {
      await fn();
      results.push({ name, pass: true });
      console.log("PASS [OK]");
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
      console.log(`FAIL [ERR] (${err.message})`);
    }
  }

  // 1. Student registration
  await step("1. Student registration", async () => {
    const res = await request("POST", "/auth/register", {
      name: "Test Student Unit",
      email: testEmail,
      password: "TestPassword123!",
      studentId: testStudentId,
      department: "Computer Science",
      phone: "9876500001",
      role: "student"
    });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data.token, "Expected JWT token in registration response");
    assert(res.data.user.role === "student", "Role should be student");
    studentToken = res.data.token;
    studentUser = res.data.user;
  });

  // 2. Student login
  await step("2. Student login", async () => {
    const res = await request("POST", "/auth/login", {
      email: testEmail,
      password: "TestPassword123!"
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.token, "Expected token on login");
    assert(res.data.user.email === testEmail.toLowerCase(), "Email match");
    studentToken = res.data.token;
  });

  // 3. Invalid login
  await step("3. Invalid login credentials handling", async () => {
    const res = await request("POST", "/auth/login", {
      email: testEmail,
      password: "WrongPassword999!"
    });
    assert(res.status === 401, `Expected 401 for wrong password, got ${res.status}`);
    const res2 = await request("POST", "/auth/login", {
      email: "nonexistent@college.edu",
      password: "SomePassword123!"
    });
    assert(res2.status === 401, `Expected 401 for nonexistent user, got ${res2.status}`);
  });

  // 4. Student complaint submission
  await step("4. Student complaint submission", async () => {
    const res = await request(
      "POST",
      "/complaints",
      {
        title: "Broken Fan in Test Room 303",
        category: "Electrical",
        priority: "High",
        building: "Science Block",
        floor: "3rd",
        roomNumber: "303",
        description: "The ceiling fan in room 303 makes a loud sparking sound when turned on."
      },
      studentToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data.ticketId, "Expected generated ticketId");
    assert(res.data.status === "Submitted", `Expected Submitted status, got ${res.data.status}`);
    createdComplaintId = res.data._id;
    createdTicketId = res.data.ticketId;
  });

  // 5. Student viewing own complaints
  await step("5. Student viewing own complaints (/complaints/mine)", async () => {
    const res = await request("GET", "/complaints/mine", null, studentToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), "Expected array of complaints");
    const found = res.data.find((c) => c._id === createdComplaintId);
    assert(found, `Expected to find created complaint ${createdComplaintId}`);
    assert(found.ticketId === createdTicketId, "Ticket ID mismatch");
  });

  // 6. Student unauthorized access attempt (403 Forbidden)
  await step("6. Student attempting unauthorized access to admin/staff endpoints", async () => {
    const resUsers = await request("GET", "/users", null, studentToken);
    assert(resUsers.status === 403, `Expected 403 Forbidden on /users for student, got ${resUsers.status}`);

    const resAssign = await request("PATCH", `/complaints/${createdComplaintId}/assign`, { staffId: "123" }, studentToken);
    assert(resAssign.status === 403, `Expected 403 Forbidden on /complaints/:id/assign for student, got ${resAssign.status}`);
  });

  // 7. Staff login
  await step("7. Staff login", async () => {
    const res = await request("POST", "/auth/login", {
      email: "ramesh.electrical@college.edu",
      password: "StaffPassword123!"
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === "staff", "Role should be staff");
    staffToken = res.data.token;
    staffUser = res.data.user;
  });

  // 8. Admin login
  await step("8. Admin login", async () => {
    const res = await request("POST", "/auth/login", {
      email: "admin@college.edu",
      password: "AdminPassword123!"
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === "admin", "Role should be admin");
    adminToken = res.data.token;
    adminUser = res.data.user;
  });

  // 9. Admin assigning complaint to staff
  await step("9. Admin assigning complaints to staff", async () => {
    const res = await request(
      "PATCH",
      `/complaints/${createdComplaintId}/assign`,
      {
        staffId: staffUser._id,
        note: "Assigned by campus administrator for immediate inspection"
      },
      adminToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === "Assigned", `Expected status Assigned, got ${res.data.status}`);
    assert(res.data.assignedStaff === staffUser._id, "Assigned staff mismatch");
  });

  // 10. Staff viewing assigned complaints
  await step("10. Staff viewing assigned complaints (/complaints/assigned)", async () => {
    const res = await request("GET", "/complaints/assigned", null, staffToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const found = res.data.find((c) => c._id === createdComplaintId);
    assert(found, "Assigned complaint must be listed for staff");
  });

  // 11. Staff updating status to "In Progress" then "Resolved"
  await step("11. Staff updating status to In Progress and Resolved", async () => {
    const resProgress = await request(
      "PATCH",
      `/complaints/${createdComplaintId}/status`,
      { status: "In Progress", note: "Technician arrived on site, inspecting regulator." },
      staffToken
    );
    assert(resProgress.status === 200, `Expected 200, got ${resProgress.status}`);
    assert(resProgress.data.status === "In Progress", "Expected In Progress status");

    const resResolved = await request(
      "PATCH",
      `/complaints/${createdComplaintId}/status`,
      { status: "Resolved", note: "Capacitor replaced and fan tested successfully." },
      staffToken
    );
    assert(resResolved.status === 200, `Expected 200, got ${resResolved.status}`);
    assert(resResolved.data.status === "Resolved", "Expected Resolved status");
    assert(resResolved.data.resolvedAt, "Expected resolvedAt timestamp");
  });

  // 12. Admin viewing all complaints
  await step("12. Admin viewing all complaints (/complaints)", async () => {
    const res = await request("GET", "/complaints", null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), "Expected array of complaints");
    assert(res.data.length >= 1, "Should contain at least 1 complaint");
  });

  // 13. Notification creation and retrieval
  await step("13. Notification creation and retrieval for student", async () => {
    const res = await request("GET", "/notifications/mine", null, studentToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), "Expected array of notifications");
    assert(res.data.length > 0, "Student should have received notifications");

    const notifId = res.data[0]._id;
    const readRes = await request("PATCH", `/notifications/${notifId}/read`, {}, studentToken);
    assert(readRes.status === 200, "Should mark notification as read");
    assert(readRes.data.isRead === true, "Notification isRead should be true");
  });

  // 14. Comments between student and staff
  await step("14. Comments creation and retrieval", async () => {
    const postRes1 = await request(
      "POST",
      `/comments/${createdComplaintId}`,
      { text: "Could you please check before 4 PM?" },
      studentToken
    );
    assert(postRes1.status === 201, `Expected 201, got ${postRes1.status}`);

    const postRes2 = await request(
      "POST",
      `/comments/${createdComplaintId}`,
      { text: "Sure, arriving at 3 PM with replacement parts." },
      staffToken
    );
    assert(postRes2.status === 201, `Expected 201, got ${postRes2.status}`);

    const getRes = await request("GET", `/comments/${createdComplaintId}`);
    assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    assert(getRes.data.length >= 2, "Expected at least 2 comments");
    assert(getRes.data[0].text === "Could you please check before 4 PM?", "Comment text mismatch");
  });

  // 15. Student feedback submission
  await step("15. Student feedback submission on resolved complaint", async () => {
    const res = await request(
      "POST",
      `/feedback/${createdComplaintId}`,
      { rating: 5, message: "Excellent and quick repair! Thank you." },
      studentToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.feedback.rating === 5, "Rating should be 5");

    // Admin feedback list
    const adminFbRes = await request("GET", "/feedback", null, adminToken);
    assert(adminFbRes.status === 200, `Expected 200, got ${adminFbRes.status}`);
    const foundFb = adminFbRes.data.find((c) => c._id === createdComplaintId);
    assert(foundFb, "Admin should see submitted feedback");
  });

  // 16. Analytics metrics calculation
  await step("16. Analytics statistics from real MongoDB data", async () => {
    const res = await request("GET", "/analytics", null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.summary, "Expected summary stats");
    assert(res.data.summary.totalComplaints > 0, "Total complaints should be > 0");
    assert(Array.isArray(res.data.byCategory), "Expected byCategory array");
    assert(Array.isArray(res.data.byStatus), "Expected byStatus array");
  });

  // 17. Search, filtering and pagination
  await step("17. Search, filtering and pagination on complaints", async () => {
    // Search by ticket
    const resSearch = await request("GET", `/complaints?search=${createdTicketId}`, null, adminToken);
    assert(resSearch.status === 200, "Search 200");
    assert(resSearch.data.length >= 1, "Search should return created complaint");

    // Filter by category
    const resFilter = await request("GET", "/complaints?category=Electrical", null, adminToken);
    assert(resFilter.status === 200, "Filter 200");
    assert(resFilter.data.every((c) => c.category === "Electrical"), "All returned should be Electrical");

    // Pagination
    const resPaging = await request("GET", "/complaints?page=1&limit=2", null, adminToken);
    assert(resPaging.status === 200, "Pagination 200");
    assert(resPaging.data.complaints.length <= 2, "Page limit adhered to");
    assert(resPaging.data.total !== undefined, "Total count returned in paged mode");
  });

  // 18. Invalid input and error handling
  await step("18. Invalid input and error handling", async () => {
    // Missing required fields on complaint
    const resBadComplaint = await request("POST", "/complaints", { category: "" }, studentToken);
    assert(resBadComplaint.status === 400, "Expected 400 for empty complaint");

    // Invalid complaint ID
    const resBadId = await request("GET", "/complaints/invalid-mongo-id-999");
    assert(resBadId.status === 404, `Expected 404 for invalid ID, got ${resBadId.status}`);

    // Invalid feedback rating (> 5)
    const resBadRating = await request(
      "POST",
      `/feedback/${createdComplaintId}`,
      { rating: 10, message: "Out of range" },
      studentToken
    );
    assert(resBadRating.status === 400, "Expected 400 for rating > 5");
  });

  // Close server
  await new Promise((resolve) => server.close(resolve));
  console.log("\n=== TEST RUN FINISHED ===");

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${results.length} tests.`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  if (server) server.close();
  process.exit(1);
});

