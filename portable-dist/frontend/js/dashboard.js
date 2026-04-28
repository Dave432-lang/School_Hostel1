/* dashboard.js — Dashboard page logic. Depends on api.js */

document.addEventListener('DOMContentLoaded', async function () {
  requireAuth();
  initNavbar();

  const welcomeEl = document.getElementById('welcome-name');
  if (welcomeEl) welcomeEl.textContent = getCurrentUserName();

  const userId = getCurrentUserId();
  try {
    const bookings = await Bookings.getByUser(userId);
    const confirmed = bookings.filter(function (b) { return b.status === 'confirmed'; }).length;
    const active    = bookings.filter(function (b) { return b.status !== 'cancelled'; }).length;
    const cancelled = bookings.filter(function (b) { return b.status === 'cancelled'; }).length;
    setEl('stat-total-bookings',   bookings.length);
    setEl('stat-active-booking',   active);
    setEl('stat-pending-bookings', confirmed);
    setEl('stat-cancelled',        cancelled);
    renderRecentBookings(bookings.slice(0, 5));
  } catch (err) {
    console.error('Dashboard error:', err.message);
  }
});

function renderRecentBookings(bookings) {
  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem">No bookings yet. <a href="hostel-list.html">Browse Hostels</a></td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(function (b) {
    return '<tr>'
      + '<td><strong>#' + String(b.id).padStart(4, '0') + '</strong></td>'
      + '<td>' + (b.hostel_name || 'N/A') + '</td>'
      + '<td>' + (b.room_number || 'N/A') + '</td>'
      + '<td>' + fmtDate(b.created_at) + '</td>'
      + '<td><span class="badge ' + badge(b.status) + '">' + cap(b.status || 'pending') + '</span></td>'
    + '</tr>';
  }).join('');
}

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function badge(s) { return { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' }[s] || 'badge-primary'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
