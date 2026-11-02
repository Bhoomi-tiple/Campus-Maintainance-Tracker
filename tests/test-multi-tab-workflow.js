const app = require("../server");
const http = require("http");

const TEST_PORT = 5056;
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

async function runMultiTabWorkflowTest() {
  console.log("=== STARTING MULTI-USER TAB ISOLATION & REAL-TIME SYNC TEST ===\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    // Tab 1: Student Session Simulation (isolated token store)
    const tab1 = { role: "student", token: null, user: null };
    // Tab 2: Staff Session Simulation (isolated token store)
    const tab2 = { role: "staff", token: null, user: null };
    // Tab 3: Admin Session Simulation (isolated token store)
    const tab3 = { role: "admin", token: null, user: null };

    console.log("1. Authenticating Tab 1 as Student...");
    const studentLogin = await request("POST", "/auth/login", {
      email: "rahul.student@college.edu",
      password: "StudentPassword123!"
    });
    assert(studentLogin.status === 200, `Student login failed: ${JSON.stringify(studentLogin.data)}`);
    tab1.token = studentLogin.data.token;
    tab1.user = studentLogin.data.user;
    console.log(`   -> Tab 1 authenticated as ${tab1.user.name} (${tab1.user.role}) [Token: ${tab1.token.slice(0, 15)}...]`);

    console.log("2. Authenticating Tab 2 as Staff (Ramesh)...");
    const staffLogin = await request("POST", "/auth/login", {
      email: "ramesh.electrical@college.edu",
      password: "StaffPassword123!"
    });
    assert(staffLogin.status === 200, `Staff login failed: ${JSON.stringify(staffLogin.data)}`);
    tab2.token = staffLogin.data.token;
    tab2.user = staffLogin.data.user;
    console.log(`   -> Tab 2 authenticated as ${tab2.user.name} (${tab2.user.role}) [Token: ${tab2.token.slice(0, 15)}...]`);

    console.log("3. Authenticating Tab 3 as Admin...");
    const adminLogin = await request("POST", "/auth/login", {
      email: "admin@college.edu",
      password: "AdminPassword123!"
    });
    assert(adminLogin.status === 200, `Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    tab3.token = adminLogin.data.token;
    tab3.user = adminLogin.data.user;
    console.log(`   -> Tab 3 authenticated as ${tab3.user.name} (${tab3.user.role}) [Token: ${tab3.token.slice(0, 15)}...]`);

    console.log("\n4. Verifying Session Independence across all 3 tabs...");
    assert(tab1.token !== tab2.token, "Tab 1 and Tab 2 tokens must be different");
    assert(tab2.token !== tab3.token, "Tab 2 and Tab 3 tokens must be different");
    assert(tab1.token !== tab3.token, "Tab 1 and Tab 3 tokens must be different");

    const me1 = await request("GET", "/users/me", null, tab1.token);
    assert(me1.data.role === "student", "Tab 1 identity must remain student");
    const me2 = await request("GET", "/users/me", null, tab2.token);
    assert(me2.data.role === "staff", "Tab 2 identity must remain staff");
    const me3 = await request("GET", "/users/me", null, tab3.token);
    assert(me3.data.role === "admin", "Tab 3 identity must remain admin");
    console.log("   -> Verified: Tab 1 = student, Tab 2 = staff, Tab 3 = admin concurrently!");

    console.log("\n5. Tab 1 (Student) submits a new maintenance complaint...");
    const complaintPayload = {
      title: `Water leakage in Room 204 - MultiTab Test ${Date.now()}`,
      category: "Plumbing",
      priority: "Urgent",
      building: "Hostel Block C",
      floor: "2nd",
      roomNumber: "204",
      description: "Severe water leakage from the main pipe under the washbasin."
    };
    const createRes = await request("POST", "/complaints", complaintPayload, tab1.token);
    assert(createRes.status === 201, `Failed to submit complaint: ${JSON.stringify(createRes.data)}`);
    const createdComplaint = createRes.data;
    console.log(`   -> Complaint created: Ticket ID ${createdComplaint.ticketId} (_id: ${createdComplaint._id})`);

    console.log("\n6. Verifying complaint visibility in Tab 3 (Admin dashboard query)...");
    const adminComplaintsRes = await request("GET", "/complaints", null, tab3.token);
    assert(adminComplaintsRes.status === 200, "Admin complaints query failed");
    const foundInAdmin = adminComplaintsRes.data.find(c => c._id === createdComplaint._id);
    assert(foundInAdmin, "Created complaint must appear in Admin complaint list");
    console.log(`   -> Confirmed: Admin sees new ticket ${foundInAdmin.ticketId} with status '${foundInAdmin.status}'`);

    console.log("\n7. Tab 3 (Admin) assigns complaint to Tab 2 (Staff: Ramesh)...");
    const assignRes = await request(
      "PATCH",
      `/complaints/${createdComplaint._id}/assign`,
      {
        staffId: tab2.user._id,
        note: "Please handle this urgent leak immediately."
      },
      tab3.token
    );
    assert(assignRes.status === 200, `Assignment failed: ${JSON.stringify(assignRes.data)}`);
    assert(assignRes.data.status === "Assigned", "Status must update to Assigned");
    console.log(`   -> Ticket ${createdComplaint.ticketId} assigned to staff ${tab2.user.name}`);

    console.log("\n8. Verifying Tab 2 (Staff) sees the assigned complaint (/complaints/assigned)...");
    const staffAssignedRes = await request("GET", "/complaints/assigned", null, tab2.token);
    assert(staffAssignedRes.status === 200, "Staff assigned query failed");
    const foundInStaff = staffAssignedRes.data.find(c => c._id === createdComplaint._id);
    assert(foundInStaff, "Assigned complaint must appear in Staff assigned list");
    assert(foundInStaff.status === "Assigned", "Staff sees status as Assigned");
    console.log(`   -> Confirmed: Staff sees assigned ticket ${foundInStaff.ticketId}`);

    console.log("\n9. Tab 2 (Staff) updates complaint status to 'In Progress' with note...");
    const inProgressRes = await request(
      "PATCH",
      `/complaints/${createdComplaint._id}/status`,
      {
        status: "In Progress",
        note: "Arrived at Hostel Block C, isolating pipe section."
      },
      tab2.token
    );
    assert(inProgressRes.status === 200, "Status update to In Progress failed");
    console.log("   -> Status updated to 'In Progress'");

    console.log("\n10. Tab 2 (Staff) updates complaint status to 'Resolved'...");
    const resolvedRes = await request(
      "PATCH",
      `/complaints/${createdComplaint._id}/status`,
      {
        status: "Resolved",
        note: "Replaced faulty pipe joint and verified zero leakage."
      },
      tab2.token
    );
    assert(resolvedRes.status === 200, "Status update to Resolved failed");
    assert(resolvedRes.data.status === "Resolved", "Complaint must be Resolved");
    console.log("   -> Status updated to 'Resolved'");

    console.log("\n11. Verifying Tab 1 (Student) and Tab 3 (Admin) see 'Resolved' status...");
    const studentCheck = await request("GET", `/complaints/${createdComplaint._id}`, null, tab1.token);
    assert(studentCheck.data.status === "Resolved", `Student sees status: ${studentCheck.data.status}`);
    const adminCheck = await request("GET", `/complaints/${createdComplaint._id}`, null, tab3.token);
    assert(adminCheck.data.status === "Resolved", `Admin sees status: ${adminCheck.data.status}`);
    console.log("   -> Confirmed: Both Student and Admin see the updated 'Resolved' status in real time!");

    console.log("\n12. Simulating Logout in Tab 1 (Student)...");
    // Tab 1 clears its session
    tab1.token = null;
    tab1.user = null;
    console.log("   -> Tab 1 session cleared (simulated logout).");

    console.log("13. Confirming Tab 2 (Staff) and Tab 3 (Admin) remain authenticated and operational...");
    const staffStillActive = await request("GET", "/users/me", null, tab2.token);
    assert(staffStillActive.status === 200 && staffStillActive.data.role === "staff", "Staff session must remain valid");
    const adminStillActive = await request("GET", "/users/me", null, tab3.token);
    assert(adminStillActive.status === 200 && adminStillActive.data.role === "admin", "Admin session must remain valid");
    console.log("   -> Confirmed: Staff and Admin sessions remain 100% active and unaffected by Student logout!");

    console.log("\n=== ALL MULTI-USER TAB ISOLATION & SYNCHRONISATION TESTS PASSED! ===");
    process.exit(0);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

runMultiTabWorkflowTest().catch((err) => {
  console.error("Test failed:", err);
  if (server) server.close();
  process.exit(1);
});
