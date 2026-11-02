/**
 * api.js — Centralised fetch wrapper with JWT auth headers.
 * All API calls across the frontend use these helpers.
 */

const API_BASE = '/api';

/** Build headers, injecting Bearer token if available */
function buildHeaders(extra = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** Generic request handler */
async function apiRequest(method, path, body = null) {
  const opts = {
    method,
    headers: buildHeaders(),
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const cleanPath = path.startsWith('/api') ? path.replace(/^\/api/, '') : path;
  const res = await fetch(`${API_BASE}${cleanPath}`, opts);

  if (res.status === 401) {
    logout();
    return null;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  // If a data mutation succeeded, notify other open tabs to refresh
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (typeof broadcastDataChange === 'function') {
      broadcastDataChange('DATA_MUTATED', { method, path });
    }
  }

  return data;
}

const apiGet    = (path)         => apiRequest('GET',    path);
const apiPost   = (path, body)   => apiRequest('POST',   path, body);
const apiPut    = (path, body)   => apiRequest('PUT',    path, body);
const apiPatch  = (path, body)   => apiRequest('PATCH',  path, body);
const apiDelete = (path)         => apiRequest('DELETE', path);

/* ── Toast Notifications ─────────────────────────────────── */
function showToast(type, title, msg = '', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const iconNameMap = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'info',
    warning: 'alert-triangle'
  };

  const toastIconHtml = typeof icon === 'function'
    ? icon(iconNameMap[type] || 'info', 18)
    : '';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${toastIconHtml}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Date Formatting ─────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/* ── Badge HTML Helpers ──────────────────────────────────── */
function statusBadge(status) {
  const map = {
    'Submitted':   'badge-submitted',
    'Assigned':    'badge-assigned',
    'In Progress': 'badge-in-progress',
    'Resolved':    'badge-resolved',
    'Closed':      'badge-closed',
    'Pending':     'badge-submitted',
  };
  const cls = map[status] || 'badge-submitted';
  return `<span class="badge ${cls}">${status}</span>`;
}

function priorityBadge(priority) {
  const map = {
    'Low':    'badge-low',
    'Medium': 'badge-medium',
    'High':   'badge-high',
    'Urgent': 'badge-urgent',
  };
  const cls = map[priority] || 'badge-medium';
  return `<span class="badge ${cls}">${priority}</span>`;
}

/* ── Sidebar mobile toggle ───────────────────────────────── */
function initMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

/* ── Modal helpers ───────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ── Pagination helper ───────────────────────────────────── */
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '';
  const prev = currentPage > 1;
  const next = currentPage < totalPages;

  html += `<button class="page-btn" ${!prev ? 'disabled' : ''} onclick="(${onPageChange})(${currentPage - 1})">&#8249;</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="(${onPageChange})(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span style="padding:0 4px;color:var(--gray-400)">…</span>`;
    }
  }

  html += `<button class="page-btn" ${!next ? 'disabled' : ''} onclick="(${onPageChange})(${currentPage + 1})">&#8250;</button>`;
  container.innerHTML = html;
}
