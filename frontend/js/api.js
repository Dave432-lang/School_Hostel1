/* api.js — Central API helper. All backend calls go here. */
let BASE_URL = 'http://localhost:5000';
if (window.location.origin.includes('ngrok') || window.location.origin.includes('loca.lt')) {
  BASE_URL = window.location.origin;
} else if (window.location.port === '5000') {
  BASE_URL = window.location.origin;
}

async function apiFetch(endpoint, options) {
  options = options || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const config = Object.assign({}, options, { headers });
  try {
    const response = await fetch(BASE_URL + endpoint, config);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  } catch (err) {
    console.error('[API Error]', endpoint, err.message);
    throw err;
  }
}

const Auth = {
  login(email, password) {
    return apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  register(userObj) {
    return apiFetch('/register', { method: 'POST', body: JSON.stringify(userObj) });
  }
};

const Hostels = {
  getAll() { return apiFetch('/hostels'); },
  getRooms(hostelId) { return apiFetch('/rooms/' + hostelId); },
  getReviews(hostelId) { return apiFetch('/hostels/' + hostelId + '/reviews'); }
};

const Bookings = {
  create(payload) { return apiFetch('/bookings', { method: 'POST', body: JSON.stringify(payload) }); },
  getByUser(user_id) { return apiFetch('/bookings/' + user_id); },
  cancel(bookingId) { return apiFetch('/bookings/' + bookingId + '/cancel', { method: 'PATCH' }); }
};

/* ---- Session ---- */
function getCurrentUserId() { return localStorage.getItem('user_id'); }
function getCurrentUserName() { return localStorage.getItem('user_name') || 'Student'; }
function getCurrentUserEmail() { return localStorage.getItem('user_email') || ''; }
function isLoggedIn() { return !!localStorage.getItem('user_id'); }

function getLoginUrl() {
  return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function logout() {
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('token');
  window.location.href = getLoginUrl();
}

function requireAuth() {
  if (!isLoggedIn()) window.location.href = getLoginUrl();
}

function initNavbar() {
  const name = getCurrentUserName();
  const nameEl = document.getElementById('user-name-badge');
  const avEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = name;
  if (avEl) avEl.textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showToast(message, type) {
  type = type || 'info';
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span class="toast-msg">' + message + '</span>';
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
