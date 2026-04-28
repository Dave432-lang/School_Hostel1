/* booking.js — Booking history page logic. Depends on api.js */

document.addEventListener('DOMContentLoaded', function () {
  requireAuth();
  if (typeof initNavbar === 'function') initNavbar();
  loadBookings();

  const filter = document.getElementById('status-filter');
  if (filter) {
    filter.addEventListener('change', function () {
      const status = filter.value;
      const filtered = status ? allBookings.filter(b => b.status === status) : allBookings;
      renderBookings(filtered);
    });
  }
});

let allBookings = [];

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  try {
    allBookings = await Bookings.getByUser(getCurrentUserId());
    renderBookings(allBookings);
    updateCards(allBookings);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:2rem">Error: ' + err.message + '</td></tr>';
  }
}

function renderBookings(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">'
      + '<div class="empty-icon">📋</div>'
      + '<h3>No bookings yet</h3>'
      + '<p>You have not booked any hostel room yet.</p>'
      + '<a href="hostel-list.html" class="btn btn-primary btn-sm" style="margin-top:1rem">Browse Hostels</a>'
      + '</div></td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(function (b) {
    const status = b.status || 'pending';
    const isPaid = (b.payment_status === 'paid');
    
    return '<tr>'
      + '<td><strong>#' + String(b.id).padStart(4, '0') + '</strong></td>'
      + '<td>' + (b.hostel_name || 'N/A') + '</td>'
      + '<td>' + (b.room_number || 'N/A') + '</td>'
      + '<td>' + cap(b.room_type || 'N/A') + '</td>'
      + '<td>' + fmtDate(b.created_at) + '</td>'
      + '<td><span class="badge ' + getBadgeClass(status) + '">' + cap(status) + '</span></td>'
      + '<td>' 
          + (isPaid ? `<button class="btn btn-sm btn-outline" onclick="downloadReceipt(${b.id})">📄 Receipt</button>` : '—') 
      + '</td>'
    + '</tr>';
  }).join('');
}

async function downloadReceipt(bookingId) {
  const b = allBookings.find(x => x.id === bookingId);
  if (!b) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Branding
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Primary blue
  doc.text('School Hostel Booking', 20, 30);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Payment Receipt', 20, 38);
  doc.line(20, 42, 190, 42);

  // Content
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Text main
  doc.text('Booking Details', 20, 55);
  
  doc.setFontSize(11);
  doc.text(`Receipt ID: RE-${String(b.id).padStart(6,'0')}`, 20, 65);
  doc.text(`Date: ${fmtDate(b.created_at)}`, 20, 72);
  doc.text(`Student Name: ${getCurrentUserName()}`, 20, 79);
  
  doc.line(20, 85, 190, 85);
  doc.text('Hostel:', 20, 95);
  doc.text(b.hostel_name || 'N/A', 80, 95);
  
  doc.text('Room Number:', 20, 102);
  doc.text(b.room_number || 'N/A', 80, 102);
  
  doc.text('Semester:', 20, 109);
  doc.text(b.semester || 'Academic Year 2025/26', 80, 109);
  
  doc.text('Payment Status:', 20, 116);
  doc.setTextColor(22, 163, 74); // Green
  doc.text('PAID', 80, 116);
  
  doc.setTextColor(15, 23, 42);
  doc.text('Amount Paid:', 20, 123);
  doc.setFontSize(14);
  doc.text(`GHS ${Number(b.amount_paid || 0).toLocaleString()}`, 80, 123);

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer generated receipt.', 20, 150);
  doc.text('University Hostel Management System.', 20, 155);

  doc.save(`Receipt_Booking_${b.id}.pdf`);
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
  setEl('count-confirmed', bookings.filter(b => b.status === 'confirmed').length);
  setEl('count-pending',   bookings.filter(b => b.status === 'pending').length);
  setEl('count-cancelled', bookings.filter(b => b.status === 'cancelled').length);
}

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function getBadgeClass(s) { return { confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' }[s] || 'badge-primary'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
