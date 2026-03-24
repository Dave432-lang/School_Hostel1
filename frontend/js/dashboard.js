/**
 * dashboard.js — Dashboard page logic
 * Shows student's summary stats and recent activity.
 * Depends on: api.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  initNavbar();

  const user = getCurrentUser();
  if (user) {
    document.getElementById('welcome-name').textContent = user.name ?? 'Student';
    document.getElementById('user-email').textContent   = user.email ?? '';
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    // Fetch bookings and hostels in parallel
    const [bookingsData, hostelsData] = await Promise.all([
      Bookings.getMyBookings().catch(() => ({ bookings: [] })),
      Hostels.getAll().catch(() => ({ hostels: [] })),
    ]);

    const bookings = bookingsData.bookings || bookingsData || [];
    const hostels  = hostelsData.hostels  || hostelsData  || [];

    // Update stat cards
    document.getElementById('stat-total-bookings').textContent    = bookings.length;
    document.getElementById('stat-active-booking').textContent    = bookings.filter(b => b.status === 'confirmed').length;
    document.getElementById('stat-pending-bookings').textContent  = bookings.filter(b => b.status === 'pending').length;
    document.getElementById('stat-available-hostels').textContent = hostels.filter(h => h.available_rooms > 0).length;

    // Recent bookings table (last 5)
    renderRecentBookings(bookings.slice(0, 5));

  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

function renderRecentBookings(bookings) {
  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;

  if (!bookings.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state" style="padding:2rem">
          <div class="empty-icon">📋</div>
          <h3>No bookings yet</h3>
          <a href="hostel-list.html" class="btn btn-primary btn-sm" style="margin-top:.75rem">Browse Hostels</a>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>#${String(b.id).padStart(4,'0')}</strong></td>
      <td>${b.hostel_name || '—'}</td>
      <td>${b.semester || '—'}</td>
      <td>${formatDate(b.created_at)}</td>
      <td><span class="badge ${statusBadge(b.status)}">${capitalize(b.status)}</span></td>
    </tr>`).join('');
}

/* ---- Helpers ---- */
function statusBadge(s) {
  return { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' }[s] || 'badge-primary';
}
function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
