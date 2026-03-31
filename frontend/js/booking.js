/* booking.js — Booking history page logic. Depends on api.js */

document.addEventListener('DOMContentLoaded', function () {
  requireAuth();
  initNavbar();
  loadBookings();

  const filter = document.getElementById('status-filter');
  if (filter) filter.addEventListener('change', function () { renderBookings(filterByStatus(filter.value)); });
});

let allBookings = [];

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  try {
    allBookings = await Bookings.getByUser(getCurrentUserId());
    renderBookings(allBookings);
    updateCards(allBookings);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:2rem">Error: ' + err.message + '</td></tr>';
  }
}

function renderBookings(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">'
      + '<div class="empty-icon">📋</div>'
      + '<h3>No bookings yet</h3>'
      + '<p>You have not booked any hostel room yet.</p>'
      + '<a href="hostel-list.html" class="btn btn-primary btn-sm" style="margin-top:1rem">Browse Hostels</a>'
      + '</div></td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(function (b) {
    const cancelled = b.status === 'cancelled';
    return '<tr>'
      + '<td><strong>#' + String(b.id).padStart(4, '0') + '</strong></td>'
      + '<td>' + (b.hostel_name || 'N/A') + '</td>'
      + '<td>' + (b.room_number || 'N/A') + '</td>'
      + '<td>' + cap(b.room_type || 'N/A') + '</td>'
      + '<td>' + fmtDate(b.created_at) + '</td>'
      + '<td><span class="badge ' + badge(b.status) + '">' + cap(b.status || 'pending') + '</span></td>'
      + '<td>' + (!cancelled
          ? '<button class="btn btn-danger btn-sm" onclick="cancelBooking(' + b.id + ')">Cancel</button>'
          : '<span style="color:var(--text-muted)">—</span>') + '</td>'
    + '</tr>';
  }).join('');
}

function filterByStatus(status) {
  return status ? allBookings.filter(function (b) { return b.status === status; }) : allBookings;
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    await Bookings.cancel(id);
    showToast('Booking cancelled.', 'warning');
    loadBookings();
  } catch (err) {
    showToast(err.message || 'Failed to cancel.', 'error');
  }
}

function updateCards(bookings) {
  setEl('count-total',     bookings.length);
  setEl('count-confirmed', bookings.filter(function (b) { return b.status === 'confirmed'; }).length);
  setEl('count-pending',   bookings.filter(function (b) { return b.status !== 'cancelled' && b.status !== 'confirmed'; }).length);
  setEl('count-cancelled', bookings.filter(function (b) { return b.status === 'cancelled'; }).length);
}

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function badge(s) { return { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' }[s] || 'badge-primary'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
