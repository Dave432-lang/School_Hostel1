/**
 * hostels.js — Hostel listing page logic
 * Fetches hostels from backend and renders them dynamically.
 * Depends on: api.js
 */

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initNavbar();
  loadHostels();

  /* ---- Search & Filter ---- */
  document.getElementById('search-input')?.addEventListener('input', debounce(filterHostels, 300));
  document.getElementById('type-filter')?.addEventListener('change', filterHostels);
  document.getElementById('gender-filter')?.addEventListener('change', filterHostels);
  document.getElementById('sort-select')?.addEventListener('change', filterHostels);
});

let allHostels = [];

async function loadHostels() {
  const grid = document.getElementById('hostels-grid');
  grid.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;

  try {
    const data = await Hostels.getAll();
    allHostels = data.hostels || data;
    renderHostels(allHostels);
    updateCount(allHostels.length);
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load hostels</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="loadHostels()">Retry</button>
      </div>`;
  }
}

function renderHostels(hostels) {
  const grid = document.getElementById('hostels-grid');

  if (!hostels.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🏠</div>
        <h3>No hostels found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = hostels.map(h => hostelCardHTML(h)).join('');

  // Attach book buttons
  grid.querySelectorAll('[data-book]').forEach(btn => {
    btn.addEventListener('click', () => openBookingModal(btn.dataset.book));
  });
}

function hostelCardHTML(h) {
  const available = h.available_rooms > 0;
  const genderIcon = { male: '👨', female: '👩', mixed: '🧑‍🤝‍🧑' };
  return `
    <div class="hostel-card">
      <div class="hostel-img" style="background:${randomGradient(h.id)}">
        🏠
        <span class="hostel-badge ${available ? 'available' : 'full'}">
          ${available ? `✅ ${h.available_rooms} rooms left` : '❌ Full'}
        </span>
      </div>
      <div class="hostel-info">
        <div class="hostel-name">${h.name}</div>
        <div class="hostel-meta">
          <span class="hostel-tag">📍 ${h.location || 'On Campus'}</span>
          <span class="hostel-tag">${genderIcon[h.gender] || '🧑'} ${capitalize(h.gender || 'Mixed')}</span>
          <span class="hostel-tag">🏷️ ${capitalize(h.type || 'Standard')}</span>
        </div>
        <div class="hostel-price">GH₵ ${Number(h.price_per_semester).toLocaleString()} <span>/ semester</span></div>
        <button class="btn btn-primary btn-full" data-book="${h.id}" ${!available ? 'disabled' : ''}>
          ${available ? '📋 Book Now' : 'Fully Booked'}
        </button>
      </div>
    </div>`;
}

function filterHostels() {
  const q      = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const type   = document.getElementById('type-filter')?.value || '';
  const gender = document.getElementById('gender-filter')?.value || '';
  const sort   = document.getElementById('sort-select')?.value || '';

  let filtered = allHostels.filter(h => {
    const matchQ      = !q || h.name.toLowerCase().includes(q) || (h.location || '').toLowerCase().includes(q);
    const matchType   = !type   || h.type === type;
    const matchGender = !gender || h.gender === gender;
    return matchQ && matchType && matchGender;
  });

  if (sort === 'price-asc')  filtered.sort((a,b) => a.price_per_semester - b.price_per_semester);
  if (sort === 'price-desc') filtered.sort((a,b) => b.price_per_semester - a.price_per_semester);
  if (sort === 'rooms')      filtered.sort((a,b) => b.available_rooms - a.available_rooms);

  renderHostels(filtered);
  updateCount(filtered.length);
}

function updateCount(n) {
  const el = document.getElementById('hostel-count');
  if (el) el.textContent = `${n} hostel${n !== 1 ? 's' : ''} found`;
}

/* ---- Booking Modal ---- */
function openBookingModal(hostelId) {
  const hostel = allHostels.find(h => String(h.id) === String(hostelId));
  if (!hostel) return;

  document.getElementById('modal-hostel-name').textContent = hostel.name;
  document.getElementById('modal-hostel-price').textContent = `GH₵ ${Number(hostel.price_per_semester).toLocaleString()} / semester`;
  document.getElementById('book-hostel-id').value = hostelId;
  document.getElementById('booking-alert').classList.remove('show');

  const overlay = document.getElementById('booking-modal');
  overlay.classList.add('open');
}

function closeBookingModal() {
  document.getElementById('booking-modal')?.classList.remove('open');
}

document.getElementById('booking-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'booking-modal') closeBookingModal();
});

document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const hostelId    = document.getElementById('book-hostel-id').value;
  const roomType    = document.getElementById('book-room-type').value;
  const semester    = document.getElementById('book-semester').value;
  const academicYear= document.getElementById('book-year').value;
  const btn         = e.target.querySelector('[type="submit"]');

  btn.disabled = true; btn.textContent = 'Booking...';
  document.getElementById('booking-alert').classList.remove('show');

  try {
    await Bookings.create({ hostel_id: hostelId, room_type: roomType, semester, academic_year: academicYear });
    showToast('Booking successful! 🎉', 'success');
    closeBookingModal();
    loadHostels(); // Refresh availability
  } catch (err) {
    const alert = document.getElementById('booking-alert');
    alert.textContent = err.message;
    alert.className = 'alert alert-error show';
  } finally {
    btn.disabled = false; btn.textContent = 'Confirm Booking';
  }
});

/* ---- Utilities ---- */
const gradients = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
];
function randomGradient(seed) {
  return gradients[(parseInt(seed) || 0) % gradients.length];
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
function debounce(fn, delay) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
