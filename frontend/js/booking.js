/**
 * booking.js — Booking history page logic
 * Fetches and renders the student's bookings.
 * Depends on: api.js
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initNavbar();
  loadBookings();

  document.getElementById('status-filter')?.addEventListener('change', () => {
    filterTable(document.getElementById('status-filter').value);
  });
});

let allBookings = [];

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

  try {
    const data  = await Bookings.getMyBookings();
    allBookings = data.bookings || data;
    renderBookings(allBookings);
    updateSummaryCards(allBookings);
  } catch (err) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Could not load bookings</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="loadBookings()">Retry</button>
        </div>
      </td></tr>`;
  }
}

function renderBookings(bookings) {
  const tbody = document.getElementById('bookings-tbody');

  if (!bookings.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No bookings yet</h3>
          <p>You haven't made any hostel bookings yet.</p>
          <a href="hostel-list.html" class="btn btn-primary btn-sm" style="margin-top:1rem">Browse Hostels</a>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map((b, i) => `
    <tr>
      <td><strong>#${String(b.id).padStart(4,'0')}</strong></td>
      <td>${b.hostel_name || '—'}</td>
      <td>${b.room_number || b.room_type || '—'}</td>
      <td>${b.semester || '—'}</td>
      <td>${formatDate(b.created_at)}</td>
      <td><span class="badge ${statusBadge(b.status)}">${capitalize(b.status)}</span></td>
      <td>
        ${b.status === 'pending' || b.status === 'confirmed'
          ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">Cancel</button>`
          : '—'}
      </td>
    </tr>`).join('');
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    await Bookings.cancel(id);
    showToast('Booking cancelled.', 'warning');
    loadBookings();
  } catch (err) {
    showToast(err.message || 'Failed to cancel booking.', 'error');
  }
}

function filterTable(status) {
  const filtered = status ? allBookings.filter(b => b.status === status) : allBookings;
  renderBookings(filtered);
}

function updateSummaryCards(bookings) {
  const total     = bookings.length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const pending   = bookings.filter(b => b.status === 'pending').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  setEl('count-total',     total);
  setEl('count-confirmed', confirmed);
  setEl('count-pending',   pending);
  setEl('count-cancelled', cancelled);
}

/* ---- Helpers ---- */
function statusBadge(status) {
  return { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' }[status] || 'badge-primary';
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
