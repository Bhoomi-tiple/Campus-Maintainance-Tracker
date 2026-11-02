/**
 * auth.js — Per-Tab Session Management (sessionStorage) & Role Guards
 * Ensures independent sessions across separate browser tabs.
 */

const TOKEN_KEY = 'cmms_tab_token';
const USER_KEY  = 'cmms_tab_user';

/**
 * Save token and user info in sessionStorage for this specific tab.
 * Does NOT overwrite other browser tabs.
 */
function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Get this tab's JWT token */
function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Get this tab's user profile */
function getUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Check if this specific tab is authenticated */
function isLoggedIn() {
  return !!getToken() && !!getUser();
}

/** Log out — clears ONLY this tab's session and redirects */
function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.location.href = '/login.html';
}

/**
 * Role-based page access guard.
 * @param {string[]} allowedRoles - e.g. ['student'], ['staff'], ['admin']
 */
function requireAuth(allowedRoles) {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return null;
  }
  const user = getUser();
  if (allowedRoles && allowedRoles.length && !allowedRoles.includes(user.role)) {
    redirectToDashboard(user.role);
    return null;
  }
  return user;
}

/** Redirect to correct dashboard based on role */
function redirectToDashboard(role) {
  if (role === 'admin') {
    window.location.href = '/admin-dashboard.html';
  } else if (role === 'staff') {
    window.location.href = '/staff-dashboard.html';
  } else {
    window.location.href = '/student-dashboard.html';
  }
}

/** Populate sidebar user profile and avatar */
function populateSidebar() {
  const user = getUser();
  if (!user) return;

  const nameEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  const headerAv = document.getElementById('header-avatar');

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  if (nameEl)   nameEl.textContent  = user.name || 'User';
  if (roleEl)   roleEl.textContent  = user.role || 'Guest';
  if (avatarEl) avatarEl.textContent = initials;
  if (headerAv) headerAv.textContent = initials;
}

/** Load unread notification count badge in sidebar and header */
async function loadNotifCount() {
  const badge = document.getElementById('notif-badge');
  const dotEl = document.getElementById('header-notif-dot');
  if (!badge && !dotEl) return;

  try {
    const notifs = await apiGet('/notifications/mine');
    const unread = (notifs || []).filter(n => !n.isRead).length;
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
    if (dotEl) {
      dotEl.style.display = unread > 0 ? 'block' : 'none';
    }
  } catch {
    /* Silent catch */
  }
}

/* ── Cross-Tab Real-time Synchronisation ─────────────────── */
let cmmsSyncChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    cmmsSyncChannel = new BroadcastChannel('cmms_data_sync_channel');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this browser, relying on polling.');
}

/**
 * Broadcast an event to all other tabs in this browser (instant sync).
 * @param {string} action - e.g. 'COMPLAINT_CREATED', 'STATUS_UPDATED', 'ASSIGNED'
 * @param {any} payload
 */
function broadcastDataChange(action, payload = {}) {
  if (cmmsSyncChannel) {
    try {
      cmmsSyncChannel.postMessage({ action, payload, timestamp: Date.now() });
    } catch (e) {}
  }
}

/**
 * Set up real-time auto-synchronisation for any dashboard:
 * 1. Listens for BroadcastChannel events from other tabs (instant ~30ms reaction).
 * 2. Background polling every 4 seconds as fallback for remote/external updates.
 * 3. Immediate refresh when the window/tab regains focus.
 * @param {Function} refreshFn - Async or sync callback that reloads the view data.
 * @param {number} intervalMs - Polling interval in ms (default 4000).
 */
function setupDataSync(refreshFn, intervalMs = 4000) {
  if (typeof refreshFn !== 'function') return;

  // 1. Instant cross-tab sync via BroadcastChannel
  if (cmmsSyncChannel) {
    cmmsSyncChannel.addEventListener('message', () => {
      // Small debounce to let DB write settle
      setTimeout(() => {
        try { refreshFn(); } catch (e) {}
      }, 50);
    });
  }

  // 2. Automatic periodic background polling
  const timer = setInterval(() => {
    // Only refresh if tab is visible and no active modal is open
    if (!document.hidden && !document.querySelector('.modal-overlay.open')) {
      try { refreshFn(); } catch (e) {}
    }
  }, intervalMs);

  // 3. Window focus event
  window.addEventListener('focus', () => {
    try { refreshFn(); } catch (e) {}
  });

  return () => clearInterval(timer);
}
