/* api.js — Central API helper. All backend calls go here. */
let BASE_URL = 'http://localhost:5000';
if (window.location.origin.includes('ngrok') || window.location.origin.includes('loca.lt')) {
  BASE_URL = window.location.origin;
} else if (window.location.port === '5000') {
  BASE_URL = window.location.origin;
}

async function apiFetch(endpoint, options) {
  options = options || {};
  const token = localStorage.getItem('token');
  const headers = Object.assign({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
  }, options.headers || {});
  
  const config = Object.assign({}, options, { headers });
  try {
    const response = await fetch(BASE_URL + endpoint, config);
    const data = await response.json();
    if (response.status === 401 && !endpoint.includes('login')) {
      logout();
      return;
    }
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

const Admin = {
  getStats() { return apiFetch('/admin/stats'); },
  getBookings() { return apiFetch('/admin/bookings'); },
  updateBookingStatus(id, status) { return apiFetch('/admin/bookings/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }); },
  getUsers() { return apiFetch('/admin/users'); },
  getWaitlist(hostelId) { return apiFetch('/admin/waitlist/' + hostelId); },
  // Hostels
  createHostel(data) { return apiFetch('/hostels', { method: 'POST', body: JSON.stringify(data) }); },
  updateHostel(id, data) { return apiFetch('/hostels/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteHostel(id) { return apiFetch('/hostels/' + id, { method: 'DELETE' }); },
  // Rooms
  createRoom(data) { return apiFetch('/rooms', { method: 'POST', body: JSON.stringify(data) }); },
  deleteRoom(id) { return apiFetch('/rooms/' + id, { method: 'DELETE' }); }
};

const Waitlist = {
  join(hostelId) { return apiFetch('/waitlist/join', { method: 'POST', body: JSON.stringify({ hostel_id: hostelId }) }); }
};

const Notifications = {
  get() { return apiFetch('/notifications'); },
  markRead(id) { return apiFetch('/notifications/' + id + '/read', { method: 'PATCH' }); }
};

/* ---- Session ---- */
function getCurrentUserId() { return localStorage.getItem('user_id'); }
function getCurrentUserName() { return localStorage.getItem('user_name') || 'Student'; }
function getCurrentUserEmail() { return localStorage.getItem('user_email') || ''; }
function getCurrentUserRole() { return localStorage.getItem('user_role') || 'student'; }
function isAdmin() { return getCurrentUserRole() === 'admin'; }
function isManager() { return getCurrentUserRole() === 'manager' || isAdmin(); }
function getLoginUrl() {
  return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function isLoggedIn() { return !!localStorage.getItem('user_id'); }
function dashboardURL() {
  const role = localStorage.getItem('user_role');
  const path = window.location.pathname;
  const isInPages = path.includes('/pages/');
  const base = isInPages ? './' : 'pages/';
  
  if (role === 'admin') return base + 'admin.html';
  if (role === 'manager') return base + 'manager-dashboard.html';
  return base + 'dashboard.html';
}

function logout() {
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem('token');
  window.location.href = getLoginUrl();
}

async function handleNotiClick(id, url) {
  try {
    await Notifications.markRead(id);
    if (url) window.location.href = url;
    else loadNotifications();
  } catch (e) { console.error(e); }
}

/* ---- Global Notifications UI ---- */
function toggleNotifications() {
  const dropdown = document.getElementById('noti-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('open');
  if (dropdown.classList.contains('open')) loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('noti-list');
  const badge = document.getElementById('noti-badge');
  if (!list) return;

  try {
    const notis = await Notifications.get();
    if (!notis.length) {
      list.innerHTML = '<div class="noti-empty">No notifications yet.</div>';
      if (badge) badge.style.display = 'none';
      return;
    }

    const unreadCount = notis.filter(n => !n.is_read).length;
    if (badge) {
       badge.textContent = unreadCount;
       badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    list.innerHTML = notis.map(n => `
      <div class="noti-item ${n.is_read ? '' : 'unread'}" onclick="handleNotiClick(${n.id}, '${n.target_url}')">
        <div style="font-weight:600; margin-bottom:2px">${cap(n.type)}</div>
        <div>${n.message}</div>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px">${new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
    `).join('');
  } catch (e) { console.error('Noti error:', e); }
}

let lastUnreadCount = 0;
const NOTI_SOUND = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

async function checkNotifications() {
  if (!isLoggedIn()) return;
  const badge = document.getElementById('noti-badge');
  try {
    const notis = await Notifications.get();
    const unreadCount = notis.filter(n => !n.is_read).length;
    
    if (badge) {
       badge.textContent = unreadCount;
       badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // Play sound if new notifications arrived
    if (unreadCount > lastUnreadCount) {
      NOTI_SOUND.play().catch(e => console.log('Audio blocked (needs interaction):', e));
    }
    lastUnreadCount = unreadCount;
  } catch (e) {}
}

function requireAuth() {
  if (!isLoggedIn()) window.location.href = getLoginUrl();
}

function initNavbar() {
  const name = getCurrentUserName();
  const role = getCurrentUserRole();
  const nameEl = document.getElementById('user-name-badge');
  const avEl = document.getElementById('user-avatar');
  const adminLink = document.getElementById('admin-nav-link');
  
  if (nameEl) nameEl.textContent = name;
  if (avEl) avEl.textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  
  // Show admin link if user is admin
  if (adminLink) {
    adminLink.style.display = (role === 'admin') ? 'block' : 'none';
  }
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

document.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) {
    checkNotifications();
    setInterval(checkNotifications, 30000); // Polling every 30s
  }
});

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
