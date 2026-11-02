/**
 * sidebar.js — Dynamic sidebar renderer without emojis
 * Uses professional Lucide-style SVG icons.
 */

function buildSidebar(role) {
  const studentLinks = `
    <span class="sidebar-section-label">Main Menu</span>
    <a href="/student-dashboard.html" class="sidebar-link" data-page="student-dashboard">
      <span class="icon">${icon('home', 18)}</span> Dashboard
    </a>
    <a href="/student-submit.html" class="sidebar-link" data-page="student-submit">
      <span class="icon">${icon('plus-circle', 18)}</span> Submit Complaint
    </a>
    <a href="/student-complaints.html" class="sidebar-link" data-page="student-complaints">
      <span class="icon">${icon('clipboard-list', 18)}</span> My Complaints
    </a>
    <a href="/student-notifications.html" class="sidebar-link" data-page="student-notifications">
      <span class="icon">${icon('bell', 18)}</span> Notifications
      <span class="sidebar-badge" id="notif-badge" style="display:none;"></span>
    </a>
    <span class="sidebar-section-label">Account</span>
    <a href="/student-profile.html" class="sidebar-link" data-page="student-profile">
      <span class="icon">${icon('user', 18)}</span> My Profile
    </a>
  `;

  const staffLinks = `
    <span class="sidebar-section-label">Main Menu</span>
    <a href="/staff-dashboard.html" class="sidebar-link" data-page="staff-dashboard">
      <span class="icon">${icon('home', 18)}</span> Dashboard
    </a>
    <a href="/staff-complaints.html" class="sidebar-link" data-page="staff-complaints">
      <span class="icon">${icon('wrench', 18)}</span> My Assignments
    </a>
    <span class="sidebar-section-label">Account</span>
    <a href="/staff-profile.html" class="sidebar-link" data-page="staff-profile">
      <span class="icon">${icon('user', 18)}</span> My Profile
    </a>
  `;

  const adminLinks = `
    <span class="sidebar-section-label">Overview</span>
    <a href="/admin-dashboard.html" class="sidebar-link" data-page="admin-dashboard">
      <span class="icon">${icon('bar-chart', 18)}</span> Dashboard
    </a>
    <span class="sidebar-section-label">Manage</span>
    <a href="/admin-complaints.html" class="sidebar-link" data-page="admin-complaints">
      <span class="icon">${icon('clipboard-list', 18)}</span> All Complaints
    </a>
    <a href="/admin-students.html" class="sidebar-link" data-page="admin-students">
      <span class="icon">${icon('graduation-cap', 18)}</span> Students
    </a>
    <a href="/admin-staff.html" class="sidebar-link" data-page="admin-staff">
      <span class="icon">${icon('wrench', 18)}</span> Staff
    </a>
    <span class="sidebar-section-label">Reports</span>
    <a href="/admin-analytics.html" class="sidebar-link" data-page="admin-analytics">
      <span class="icon">${icon('trending-up', 18)}</span> Analytics
    </a>
    <a href="/admin-feedback.html" class="sidebar-link" data-page="admin-feedback">
      <span class="icon">${icon('star', 18)}</span> Feedback
    </a>
    <span class="sidebar-section-label">Account</span>
    <a href="/admin-profile.html" class="sidebar-link" data-page="admin-profile">
      <span class="icon">${icon('user', 18)}</span> My Profile
    </a>
  `;

  const links = role === 'admin' ? adminLinks : role === 'staff' ? staffLinks : studentLinks;

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">${icon('building', 22)}</div>
          <div class="sidebar-logo-text">
            Campus Maintenance
            <span>Management System</span>
          </div>
        </div>
      </div>

      <div class="sidebar-user">
        <div class="sidebar-avatar" id="sidebar-avatar">U</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name" id="sidebar-user-name">Loading…</div>
          <div class="sidebar-user-role" id="sidebar-user-role">${role}</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${links}
      </nav>

      <div class="sidebar-footer">
        <a href="#" class="sidebar-link logout" onclick="logout(); return false;">
          <span class="icon">${icon('log-out', 18)}</span> Sign Out
        </a>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

function initSidebar(role, activePage) {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (placeholder) {
    placeholder.innerHTML = buildSidebar(role);
  }

  // Set active link
  const currentPage = activePage || document.body.dataset.page;
  if (currentPage) {
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
      if (link.dataset.page === currentPage) link.classList.add('active');
    });
  }

  populateSidebar();
  initMobileMenu();
  loadNotifCount();
}
