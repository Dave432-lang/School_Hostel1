/* admin.js — Admin Dashboard Logic. Depends on api.js */

document.addEventListener('DOMContentLoaded', async function() {
  // 1. Security Check via Backend
  try {
    const res = await apiFetch('/me');
    if (!res || !res.user || res.user.role !== 'admin') {
      localStorage.removeItem('user_role');
      window.location.href = '../index.html';
      return;
    }
  } catch (err) {
    console.error('Security Check Error:', err);
    localStorage.removeItem('user_role');
    window.location.href = '../index.html';
    return;
  }

  // Init UI
  initNavbar();
  loadStats();
  loadRecentBookings();
  initAdminCharts();

  // 2. Tab Switching
  const tabs = document.querySelectorAll('.sidebar-link[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      // Update Sidebar UI
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update Panels
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + target).classList.add('active');

      // Load specific data
      if (target === 'dashboard') { loadStats(); loadRecentBookings(); }
      if (target === 'hostels')   loadHostelsForAdmin();
      if (target === 'rooms')      loadAdminHostelSelect();
      if (target === 'bookings')   loadAllBookings();
      if (target === 'users')      loadAllUsers();
    });
  });

  // 3. Modal logic
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    });
  });

  // 4. Form Submissions
  const hostelForm = document.getElementById('hostel-form');
  if (hostelForm) {
    hostelForm.addEventListener('submit', handleHostelSubmit);
  }

  const roomForm = document.getElementById('room-form');
  if (roomForm) {
    roomForm.addEventListener('submit', handleRoomSubmit);
  }

  // Add Button actions
  document.getElementById('btn-add-hostel')?.addEventListener('click', () => openHostelModal());
  document.getElementById('btn-add-room')?.addEventListener('click', () => openRoomModal());

  // 5. Filter listener for Manage Rooms
  document.getElementById('room-hostel-filter')?.addEventListener('change', loadRoomsForAdmin);
});

/* ---- DASHBOARD ---- */
/* ---- DASHBOARD ANALYTICS ---- */
let revenueChart = null;

async function initAdminCharts() {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  try {
    const data = await apiFetch('/admin/analytics');
    
    if (revenueChart) revenueChart.destroy();
    
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.revenueHistory.map(d => d.date),
        datasets: [{
          label: 'Revenue (GH₵)',
          data: data.revenueHistory.map(d => d.amount),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#2563eb',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { callback: (val) => '₵' + val.toLocaleString() }
          },
          x: { grid: { display : false } }
        }
      }
    });
  } catch (err) { console.error('Chart error:', err); }
}

async function loadStats() {
  try {
    const stats = await Admin.getStats();
    document.getElementById('stat-hostels').textContent = stats.totalHostels;
    document.getElementById('stat-students').textContent = stats.totalStudents;
    document.getElementById('stat-bookings').textContent = stats.totalBookings;
    document.getElementById('stat-revenue').textContent = '₵' + stats.totalRevenue.toLocaleString();
  } catch (err) { console.error('Stats error:', err); }
}

async function loadRecentBookings() {
  const tbody = document.getElementById('recent-bookings-tbody');
  try {
    const all = await Admin.getBookings();
    const recent = all.slice(0, 5);
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No bookings yet.</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(b => `
      <tr>
        <td>${b.id}</td>
        <td>${esc(b.first_name)} ${esc(b.last_name)}</td>
        <td>${esc(b.hostel_name)} - Room ${esc(b.room_number)}</td>
        <td>GH₵ ${Number(b.amount_paid || 0).toLocaleString()}</td>
        <td><span class="badge badge-${b.status === 'confirmed' ? 'success' : 'warning'}">${esc(b.status)}</span></td>
        <td>${new Date(b.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = '<tr><td colspan="5">Error loading bookings</td></tr>'; }
}

/* ---- HOSTELS ---- */
async function loadHostelsForAdmin() {
  const tbody = document.getElementById('hostels-list-tbody');
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  try {
    const hostels = await Hostels.getAll();
    tbody.innerHTML = hostels.map(h => `
      <tr>
        <td><strong>${h.name}</strong></td>
        <td>${h.location || '—'}</td>
        <td>${h.type}</td>
        <td>${Number(h.price_per_semester).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openHostelModal(${h.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteHostel(${h.id})">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = '<tr><td colspan="5">Error loading hostels</td></tr>'; }
}

async function loadManagers() {
  const select = document.getElementById('h-manager');
  if (!select) return;
  try {
    const users = await Admin.getUsers();
    const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');
    select.innerHTML = '<option value="">No Manager Assigned (Default to Admin)</option>' + 
      managers.map(u => `<option value="${u.id}">${u.first_name} ${u.last_name || ''} (${u.role})</option>`).join('');
  } catch (e) { console.error('Error loading managers:', e); }
}

async function openHostelModal(id = null) {
  const modal = document.getElementById('hostel-modal');
  const title = document.getElementById('hostel-modal-title');
  const form = document.getElementById('hostel-form');
  if (form) form.reset();
  document.getElementById('h-id').value = id || '';
  
  await loadManagers();
  
  if (id) {
    title.textContent = 'Edit Hostel';
    try {
      const h = await apiFetch('/hostels/' + id);
      document.getElementById('h-name').value = h.name;
      document.getElementById('h-location').value = h.location || '';
      document.getElementById('h-price-main').value = h.price_per_semester || h.price || '';
      document.getElementById('h-type').value = h.type;
      document.getElementById('h-gender').value = h.gender;
      document.getElementById('h-desc').value = h.description || '';
      document.getElementById('h-img-main').value = (typeof h.image_urls === 'string' ? JSON.parse(h.image_urls) : h.image_urls)?.rooms?.[0] || '';
      document.getElementById('h-manager').value = h.manager_id || '';
      document.getElementById('h-lat').value = h.latitude || '';
      document.getElementById('h-lng').value = h.longitude || '';
    } catch (e) { showToast('Error fetching hostel data', 'error'); }
  } else {
    title.textContent = 'Add New Hostel';
  }
  modal.classList.add('open');
}

async function handleHostelSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('h-id').value;
  const payload = {
    name: document.getElementById('h-name').value,
    location: document.getElementById('h-location').value,
    price_per_semester: document.getElementById('h-price-main').value,
    type: document.getElementById('h-type').value,
    gender: document.getElementById('h-gender').value,
    description: document.getElementById('h-desc').value,
    image_urls: { rooms: [document.getElementById('h-img-main').value], kitchens: [], washrooms: [] },
    amenities: (document.getElementById('h-amenities')?.value || '').split(',').map(s => s.trim()).filter(s => s),
    manager_id: document.getElementById('h-manager').value || null,
    latitude: parseFloat(document.getElementById('h-lat').value) || null,
    longitude: parseFloat(document.getElementById('h-lng').value) || null
  };

  try {
    if (id) await Admin.updateHostel(id, payload);
    else await Admin.createHostel(payload);
    
    showToast(id ? 'Hostel updated!' : 'Hostel created!', 'success');
    document.getElementById('hostel-modal').classList.remove('open');
    loadHostelsForAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteHostel(id) {
  if (!confirm('Are you sure you want to delete this hostel? This will also delete all its rooms and bookings!')) return;
  try {
    await Admin.deleteHostel(id);
    showToast('Hostel deleted', 'success');
    loadHostelsForAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---- ROOMS ---- */
async function loadAdminHostelSelect() {
  const select = document.getElementById('room-hostel-filter');
  try {
    const hostels = await Hostels.getAll();
    select.innerHTML = '<option value="">Select Hostel to Manage...</option>' + 
      hostels.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
  } catch (e) {
    console.error('Error loading hostels for select:', e);
    select.innerHTML = '<option value="">Error loading hostels</option>';
  }
}

async function loadRoomsForAdmin() {
  const hostelId = document.getElementById('room-hostel-filter').value;
  const tbody = document.getElementById('rooms-list-tbody');
  const btn = document.getElementById('btn-add-room');
  
  if (!hostelId) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem">Select a hostel above to see rooms.</td></tr>';
    btn.disabled = true;
    return;
  }
  
  btn.disabled = false;
  tbody.innerHTML = '<tr><td colspan="4">Loading rooms...</td></tr>';
  try {
    const rooms = await Hostels.getRooms(hostelId);
    if (!rooms.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No rooms found for this hostel.</td></tr>';
    } else {
      tbody.innerHTML = rooms.map(r => `
        <tr>
          <td><strong>${r.room_number}</strong></td>
          <td>${r.room_type}</td>
          <td><span class="status-pill status-${r.is_available ? 'confirmed' : 'cancelled'}">${r.is_available ? 'Available' : 'Booked'}</span></td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteRoom(${r.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) { tbody.innerHTML = '<tr><td colspan="4">Error loading rooms</td></tr>'; }
}

function openRoomModal() {
  document.getElementById('room-form').reset();
  document.getElementById('room-modal').classList.add('open');
}

async function handleRoomSubmit(e) {
  e.preventDefault();
  const hostel_id = document.getElementById('room-hostel-filter').value;
  const payload = {
    hostel_id,
    room_number: document.getElementById('r-number').value,
    room_type: document.getElementById('r-type').value,
    is_available: true
  };

  try {
    await Admin.createRoom(payload);
    showToast('Room added!', 'success');
    document.getElementById('room-modal').classList.remove('open');
    loadRoomsForAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteRoom(id) {
  if (!confirm('Delete this room?')) return;
  try {
    await Admin.deleteRoom(id);
    showToast('Room deleted', 'success');
    loadRoomsForAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---- BOOKINGS ---- */
async function loadAllBookings() {
  const tbody = document.getElementById('bookings-list-tbody');
  tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
  try {
    const bookings = await Admin.getBookings();
    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>
          <div style="font-weight:700">${b.first_name} ${b.last_name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">${b.user_email}</div>
        </td>
        <td>
          <div style="font-weight:600">${b.hostel_name || 'N/A'}</div>
          <div>Room ${b.room_number || 'N/A'} (${b.room_type || '—'})</div>
        </td>
        <td>₵${Number(b.amount_paid || 0).toLocaleString()}</td>
        <td><span class="status-pill status-${b.payment_status || 'unpaid'}">${b.payment_status || 'unpaid'}</span></td>
        <td><span class="status-pill status-${b.status}">${b.status}</span></td>
        <td>
          <select class="form-control btn-sm" onchange="updateBookingStatus(${b.id}, this.value)" style="width:120px">
            <option value="pending" ${b.status==='pending'?'selected':''}>Pending</option>
            <option value="confirmed" ${b.status==='confirmed'?'selected':''}>Confirm</option>
            <option value="cancelled" ${b.status==='cancelled'?'selected':''}>Cancel</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = '<tr><td colspan="7">Error loading bookings</td></tr>'; }
}

async function updateBookingStatus(id, status) {
  try {
    await Admin.updateBookingStatus(id, status);
    showToast('Booking status updated to ' + status, 'success');
    loadAllBookings();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---- USERS ---- */
async function loadAllUsers() {
  const tbody = document.getElementById('users-list-tbody');
  tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
  try {
    const users = await Admin.getUsers();
    tbody.innerHTML = users.filter(u => u.role === 'student').map(u => {
      const row = `<tr>
        <td>${u.id}</td>
        <td>${esc(u.first_name)} ${esc(u.last_name)}</td>
        <td>${esc(u.email)}</td>
        <td><span class="badge badge-info">${esc(u.role)}</span></td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
      </tr>`;
      return row;
    }).join('');
  } catch (err) { tbody.innerHTML = '<tr><td colspan="3">Error loading users</td></tr>'; }
}

/* ---- HELPER ---- */
function closeAdminModal(id) {
  document.getElementById(id).classList.remove('open');
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

/* ---- CSV EXPORT ---- */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportBookingsCSV() {
  try {
    const bookings = await Admin.getBookings();
    if (!bookings.length) return showToast('No bookings to export', 'error');

    const headers = ['Booking ID', 'Student Name', 'Email', 'Hostel', 'Room', 'Amount Paid', 'Pay Status', 'Booking Status', 'Date Created'];
    let csv = headers.join(',') + '\n';
    
    bookings.forEach(b => {
      const row = [
        b.id,
        `"${(b.first_name || '')} ${(b.last_name || '')}"`,
        `"${b.user_email || ''}"`,
        `"${b.hostel_name || ''}"`,
        `"${b.room_number || ''}"`,
        b.amount_paid || 0,
        b.payment_status || 'unpaid',
        b.status || 'unknown',
        new Date(b.created_at).toLocaleString()
      ];
      csv += row.join(',') + '\n';
    });

    downloadCSV(csv, 'bookings_export.csv');
    showToast('Bookings downloaded!', 'success');
  } catch (err) { showToast('Export failed', 'error'); }
}

async function exportStudentsCSV() {
  try {
    const users = await Admin.getUsers();
    const students = users.filter(u => u.role === 'student');
    if (!students.length) return showToast('No students to export', 'error');

    const headers = ['Student ID', 'First Name', 'Last Name', 'Email', 'Joined Date'];
    let csv = headers.join(',') + '\n';
    
    students.forEach(u => {
      const row = [
        u.id,
        `"${u.first_name || ''}"`,
        `"${u.last_name || ''}"`,
        `"${u.email || ''}"`,
        new Date(u.created_at).toLocaleString()
      ];
      csv += row.join(',') + '\n';
    });

    downloadCSV(csv, 'students_export.csv');
    showToast('Students downloaded!', 'success');
  } catch (err) { showToast('Export failed', 'error'); }
}
