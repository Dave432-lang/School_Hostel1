/**
 * api.js — Centralised API helper
 * All fetch calls to the backend go through here.
 * Automatically attaches JWT token from localStorage.
 */

const BASE_URL = 'http://localhost:5000/api';

/**
 * Core fetch wrapper
 * @param {string} endpoint  - e.g. '/hostels'
 * @param {object} options   - standard fetch options (method, body, etc.)
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // If 401, token expired — force logout
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/frontend/index.html';
      }
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

/* ---- Auth ---- */
const Auth = {
  login(email, password) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  register(payload) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

/* ---- Hostels ---- */
const Hostels = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/hostels${qs ? '?' + qs : ''}`);
  },
  getById(id) {
    return apiFetch(`/hostels/${id}`);
  },
};

/* ---- Bookings ---- */
const Bookings = {
  create(payload) {
    return apiFetch('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMyBookings() {
    return apiFetch('/bookings/my');
  },
  cancel(id) {
    return apiFetch(`/bookings/${id}/cancel`, { method: 'PATCH' });
  },
};

/* ---- Helpers ---- */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/frontend/index.html';
}

/**
 * Guard — redirect to login if not authenticated.
 * Call at the top of every protected page.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/frontend/index.html';
  }
}

/** Show a toast notification */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
