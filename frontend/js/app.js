/* app.js — Hostel listing, booking, and Paystack payment. Depends on api.js */

/* ---- State ---- */
var allHostels      = [];
var currentRoomId   = null;
var currentAmount   = 0;
var currentRoomLabel = '';
var selectedMethod  = null;

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', function () {
  // Allow exploration but require auth for sensitive routes
  if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('booking')) {
    requireAuth();
  }
  if (typeof initNavbar === 'function') initNavbar();
  loadHostels();

  var searchInput  = document.getElementById('search-input');
  var typeFilter   = document.getElementById('type-filter');
  var genderFilter = document.getElementById('gender-filter');
  if (searchInput)  searchInput.addEventListener('input',  filterHostels);
  if (typeFilter)   typeFilter.addEventListener('change',  filterHostels);
  if (genderFilter) genderFilter.addEventListener('change', filterHostels);

  // Close rooms modal when clicking backdrop
  var overlay = document.getElementById('rooms-modal');
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeRoomsModal();
  });
});

/* ================================================================
   HOSTEL LIST
   ================================================================ */
async function loadHostels() {
  var grid = document.getElementById('hostels-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div></div>';
  try {
    allHostels = await Hostels.getAll();
    renderHostels(allHostels);
    updateCount(allHostels.length);
  } catch (err) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">'
      + '<div class="empty-icon">⚠️</div><h3>Could not load hostels</h3>'
      + '<p>' + err.message + '</p>'
      + '<button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="loadHostels()">Retry</button>'
      + '</div>';
  }
}

var GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#f093fb,#f5576c)'
];

function renderHostels(hostels) {
  var grid = document.getElementById('hostels-grid');
  if (!grid) return;
  if (!hostels.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">'
      + '<div class="empty-icon">🏠</div><h3>No hostels found</h3>'
      + '<p>Try adjusting your filters.</p></div>';
    return;
  }
  grid.innerHTML = hostels.map(function (h, i) {
    var rooms     = parseInt(h.available_rooms) || 0;
    var available = rooms > 0;

    // Contact strip
    var contact = '';
    if (h.manager_name || h.phone || h.email) {
      contact += '<div class="hostel-contact">';
      if (h.manager_name)
        contact += '<div class="contact-row">👤 <span>' + h.manager_name + '</span></div>';
      if (h.phone)
        contact += '<div class="contact-row">📞 <a href="tel:' + h.phone + '">' + h.phone + '</a>'
          + (h.whatsapp ? '&nbsp;·&nbsp;<a href="https://wa.me/233' + h.whatsapp.replace(/^0/,'') + '" target="_blank">💬 WhatsApp</a>' : '')
          + '</div>';
      if (h.email)
        contact += '<div class="contact-row">✉️ <a href="mailto:' + h.email + '">' + h.email + '</a></div>';
      contact += '</div>';
    }

    // Parse amenities and images
    var amenities = [];
    try { amenities = typeof h.amenities === 'string' ? JSON.parse(h.amenities) : (h.amenities || []); } catch(e) {}
    var images = { rooms: [], washrooms: [], kitchens: [] };
    try { images = typeof h.image_urls === 'string' ? JSON.parse(h.image_urls) : (h.image_urls || images); } catch(e) {}
    
    // Build amenity pills
    var amenityHtml = '<div class="amenities-list">' + amenities.slice(0,3).map(a => `<span class="amenity-pill">${a}</span>`).join('') + (amenities.length > 3 ? `<span class="amenity-pill">+${amenities.length-3}</span>` : '') + '</div>';

    // Build image gallery strip
    var allImgs = [...(images.rooms||[]), ...(images.washrooms||[]), ...(images.kitchens||[])];
    var galleryHtml = allImgs.length > 0 
      ? '<div class="hostel-gallery-strip">' + allImgs.slice(1,4).map(img => `<a href="${img}" target="_blank"><img src="${img}" alt="Hostel Image" /></a>`).join('') + '</div>'
      : '';

    return '<div class="hostel-card">'
      + '<div class="hostel-img" style="background:' + (allImgs.length ? `url('${allImgs[0]}') center/cover` : GRADIENTS[i % GRADIENTS.length]) + '">'
        + (!allImgs.length ? '<span style="font-size:3rem">🏠</span>' : '')
        + '<span class="hostel-badge ' + (available ? 'available' : 'full') + '">'
          + (available ? rooms + ' room' + (rooms > 1 ? 's' : '') + ' left' : 'Fully Booked')
        + '</span>'
      + '</div>'
      + '<div class="hostel-info">'
        + '<div style="display:flex; justify-content:space-between; align-items:flex-start;">'
          + '<div class="hostel-name">' + h.name + '</div>'
          + '<div class="hostel-rating">★ ' + Number(h.rating || 0).toFixed(1) + '</div>'
        + '</div>'
        + '<div class="hostel-meta">'
          + '<span class="hostel-tag">📍 ' + (h.location || 'On Campus') + '</span>'
          + '<span class="hostel-tag">' + cap(h.gender || 'Mixed') + '</span>'
          + '<span class="hostel-tag">' + cap(h.type || 'Standard') + '</span>'
        + '</div>'
        + amenityHtml
        + galleryHtml
        + '<div class="hostel-price">GH&#8373; ' + Number(h.price_per_semester || 0).toLocaleString() + ' <span>/ semester</span></div>'
        + contact
        + '<button class="btn btn-primary btn-full" style="margin-top:.75rem"'
          + (available ? ' onclick="checkAuthAndBook(' + h.id + ')"' : ' disabled')
          + '>' + (available ? '🔑 View &amp; Book Rooms' : '❌ Fully Booked') + '</button>'
      + '</div>'
    + '</div>';
  }).join('');
}

function filterHostels() {
  var q      = (document.getElementById('search-input')  || {}).value || '';
  var type   = (document.getElementById('type-filter')   || {}).value || '';
  var gender = (document.getElementById('gender-filter') || {}).value || '';
  var filtered = allHostels.filter(function (h) {
    return (!q      || h.name.toLowerCase().includes(q.toLowerCase()) || (h.location || '').toLowerCase().includes(q.toLowerCase()))
        && (!type   || h.type   === type)
        && (!gender || h.gender === gender);
  });
  renderHostels(filtered);
  updateCount(filtered.length);
}

function updateCount(n) {
  var el = document.getElementById('hostel-count');
  if (el) el.textContent = n + ' hostel' + (n !== 1 ? 's' : '') + ' found';
}

/* ================================================================
   ROOMS MODAL
   ================================================================ */
function checkAuthAndBook(hostelId) {
  if (!isLoggedIn()) {
    showToast('Please log in or register first to book a room.', 'warning');
    setTimeout(() => { window.location.href = getLoginUrl(); }, 2000);
    return;
  }
  viewRooms(hostelId);
}

async function viewRooms(hostelId) {
  var modal  = document.getElementById('rooms-modal');
  var tbody  = document.getElementById('rooms-tbody');
  var rContainer = document.getElementById('reviews-container');
  var hostel = allHostels.find(function (h) { return h.id == hostelId; });
  if (hostel) document.getElementById('modal-hostel-name').textContent = hostel.name;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  if (rContainer) rContainer.innerHTML = '<div style="text-align:center"><div class="spinner"></div></div>';
  modal.classList.add('open');
  cancelConfirm();

  try {
    var rooms = await Hostels.getRooms(hostelId);
    if (!rooms.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem">No rooms listed for this hostel.</td></tr>';
    } else {
      tbody.innerHTML = rooms.map(function (r) {
        var num   = (r.room_number || '').replace(/'/g, '');
        var rtype = (r.room_type  || '').replace(/'/g, '');
        var price = hostel ? Number(hostel.price_per_semester || 0) : 0;
        return '<tr>'
          + '<td><strong>' + r.room_number + '</strong></td>'
          + '<td>' + cap(r.room_type) + '</td>'
          + '<td>' + (r.capacity || '—') + '</td>'
          + '<td><span class="badge ' + (r.is_available ? 'badge-success' : 'badge-danger') + '">'
              + (r.is_available ? '✅ Available' : '❌ Booked') + '</span></td>'
          + '<td>' + (r.is_available
              ? '<button class="btn btn-primary btn-sm" onclick="showConfirm(' + r.id + ",'" + num + "','" + rtype + "'," + price + ')">Book</button>'
              : '—')
          + '</td>'
        + '</tr>';
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;padding:1rem">Error: ' + err.message + '</td></tr>';
  }

  // Fetch reviews
  if (rContainer) {
    try {
      var reviews = await Hostels.getReviews(hostelId);
      if (!reviews || !reviews.length) {
        rContainer.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;margin-top:.5rem">No reviews yet for this hostel.</p>';
      } else {
        rContainer.innerHTML = reviews.map(function(rev) {
          return '<div style="border-bottom:1px solid #e2e8f0; padding:.75rem 0;">'
            + '<div style="display:flex; justify-content:space-between; align-items:center;">'
              + '<strong>' + rev.user_name + '</strong>'
              + '<span style="color:#fbbf24; font-size:.85rem">★ ' + rev.rating + '/5</span>'
            + '</div>'
            + '<p style="font-size:.85rem; color:var(--text-muted); margin-top:.25rem">' + (rev.comment || '') + '</p>'
          + '</div>';
        }).join('');
      }
    } catch(err) {
      rContainer.innerHTML = '<p style="color:red;font-size:.85rem">Failed to load reviews.</p>';
    }
  }
}

function closeRoomsModal() {
  cancelConfirm();
  var modal = document.getElementById('rooms-modal');
  if (modal) modal.classList.remove('open');
}

/* ================================================================
   INLINE CONFIRM → opens Payment Modal
   ================================================================ */
function showConfirm(roomId, roomNumber, roomType, price) {
  var bar    = document.getElementById('modal-confirm-bar');
  var normal = document.getElementById('modal-footer-normal');
  var label  = document.getElementById('confirm-room-label');
  var yesBtn = document.getElementById('confirm-yes-btn');
  currentRoomId  = roomId;
  currentAmount  = price || 0;
  currentRoomLabel = cap(roomType) + ' (Rm. ' + roomNumber + ')';
  if (!bar) { openPayModal(roomId, price); return; }
  label.textContent    = 'Room ' + roomNumber + ' (' + cap(roomType) + ') — GH₵' + Number(price).toLocaleString();
  bar.style.display    = 'flex';
  normal.style.display = 'none';
  yesBtn.onclick       = function () { cancelConfirm(); openPayModal(roomId, price); };
}

function cancelConfirm() {
  var bar    = document.getElementById('modal-confirm-bar');
  var normal = document.getElementById('modal-footer-normal');
  if (bar)    bar.style.display    = 'none';
  if (normal) normal.style.display = 'flex';
}

/* ================================================================
   PAYMENT MODAL
   ================================================================ */
function openPayModal(roomId, price) {
  currentRoomId  = roomId;
  currentAmount  = price || 0;
  selectedMethod = null;
  // Reset UI
  document.querySelectorAll('.pay-method-btn').forEach(function (b) { b.classList.remove('selected'); });
  document.getElementById('pay-phone-wrap').classList.remove('show');
  var cardWrap = document.getElementById('pay-card-wrap');
  if (cardWrap) cardWrap.style.display = 'none';
  document.getElementById('pay-phone').value = '';
  document.getElementById('pay-amount-display').textContent = 'GH₵ ' + Number(currentAmount).toFixed(2);
  document.getElementById('pay-now-btn').disabled = false;
  document.getElementById('pay-now-btn').textContent = '🔒 Pay Now';
  document.getElementById('pay-modal').classList.add('open');
}

function closePayModal() {
  document.getElementById('pay-modal').classList.remove('open');
  selectedMethod = null;
}

function selectMethod(method) {
  selectedMethod = method;
  document.querySelectorAll('.pay-method-btn').forEach(function (b) { b.classList.remove('selected'); });
  document.getElementById('method-' + method).classList.add('selected');
  var phoneWrap = document.getElementById('pay-phone-wrap');
  var cardWrap  = document.getElementById('pay-card-wrap');
  
  if (method === 'card') {
    phoneWrap.classList.remove('show');
    if (cardWrap) cardWrap.style.display = 'block';
  } else {
    phoneWrap.classList.add('show');
    if (cardWrap) cardWrap.style.display = 'none';
  }
}

async function processPayment() {
  if (!selectedMethod) { showToast('Please select a payment method.', 'warning'); return; }

  var userId = getCurrentUserId();
  if (!userId) { showToast('Please log in first.', 'error'); return; }

  var phone  = document.getElementById('pay-phone').value.trim();
  if (selectedMethod !== 'card' && !phone) {
    showToast('Please enter your mobile money phone number.', 'warning'); return;
  }

  // Get user email from localStorage or use placeholder
  var userEmail = getCurrentUserEmail() || (userId + '@school.edu.gh');

  var semesterSelect = document.getElementById('pay-semester');
  var semester = semesterSelect ? semesterSelect.value : '';
  if (!semester) { showToast('Please select the academic semester.', 'warning'); return; }

  var agreeCheck = document.getElementById('pay-agreement-check');
  if (agreeCheck && !agreeCheck.checked) { showToast('You must agree to the Occupancy Agreement.', 'warning'); return; }

  var btn = document.getElementById('pay-now-btn');
  btn.disabled    = true;
  btn.textContent = 'Processing…';

  try {
    // Try Paystack if key is configured; otherwise fall back to direct booking
    var initResp = await apiFetch('/pay/initialize', {
      method: 'POST',
      body: JSON.stringify({
        room_id:    currentRoomId,
        user_id:    userId,
        email:      userEmail,
        amount_ghs: currentAmount,
        semester:   semester,
        agreed_to_terms: true
      })
    });

    // Paystack configured — launch popup
    var handler = PaystackPop.setup({
      key:      PAYSTACK_PUBLIC_KEY,
      email:    userEmail,
      amount:   Math.round(parseFloat(currentAmount) * 100),
      currency: 'GHS',
      ref:      initResp.reference,
      channels: selectedMethod === 'card' ? ['card'] : ['mobile_money'],
      ...(selectedMethod !== 'card' ? {
        mobile_money: {
          phone:    phone,
          provider: selectedMethod === 'mtn' ? 'mtn' : selectedMethod === 'vodafone' ? 'vodafone' : 'airtel-tigo'
        }
      } : {}),
      onClose: function () {
        showToast('Payment window closed. Booking not confirmed.', 'warning');
        btn.disabled    = false;
        btn.textContent = '🔒 Pay Now';
      },
      callback: async function (response) {
        // Verify on backend
        try {
          await apiFetch('/pay/verify', {
            method: 'POST',
            body: JSON.stringify({
              reference: response.reference,
              room_id:   currentRoomId,
              user_id:   userId,
              semester:  semester,
              agreed_to_terms: true
            })
          });
          showToast('🎉 Payment successful! Room booked.', 'success');
          closePayModal();
          closeRoomsModal();
          loadHostels();
          showReceipt({
            reference: response.reference,
            student: getCurrentUserName(),
            hostelName: document.getElementById('modal-hostel-name') ? document.getElementById('modal-hostel-name').textContent : '',
            roomType: currentRoomLabel,
            semester: semester,
            method: selectedMethod,
            total: currentAmount,
            email: userEmail
          });
        } catch (e) {
          showToast('Payment received but booking failed: ' + e.message, 'error');
        }
      }
    });
    handler.openIframe();

  } catch (err) {
    console.warn('Paystack not configured, falling back to mock direct booking:', err.message);
    
    // Simulate network verification and then book
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    setTimeout(async function() {
      await processMockBooking(semester);
      closePayModal();
      btn.disabled = false;
      btn.textContent = '🔒 Pay Now';
    }, 1200);
  }
}

async function processMockBooking(semester) {
  try {
    var userId = getCurrentUserId();
    await Bookings.create({ user_id: userId, room_id: currentRoomId, semester: semester, agreed_to_terms: true });
    showToast('🎉 Booking confirmed! (Test mode — payment mocked)', 'success');
    closeRoomsModal();
    loadHostels();
    var rn = 'MOCK-' + Math.floor(Math.random() * 999999);
    showReceipt({
      reference: rn,
      student: getCurrentUserName(),
      hostelName: document.getElementById('modal-hostel-name') ? document.getElementById('modal-hostel-name').textContent : '',
      roomType: currentRoomLabel,
      semester: semester,
      method: selectedMethod,
      total: currentAmount,
      email: getCurrentUserEmail() || ''
    });
  } catch (e2) {
    showToast(e2.message || 'Booking failed.', 'error');
  }
}

function showReceipt(data) {
  var modal = document.getElementById('receipt-modal');
  if (!modal) return;
  document.getElementById('rcpt-ref').textContent = '#' + data.reference;
  document.getElementById('rcpt-student').textContent = data.student;
  document.getElementById('rcpt-hostel').textContent = data.hostelName;
  document.getElementById('rcpt-room').textContent = data.roomType;
  document.getElementById('rcpt-sem').textContent = data.semester;
  document.getElementById('rcpt-method').textContent = data.method;
  document.getElementById('rcpt-total').textContent = 'GH₵ ' + Number(data.total).toLocaleString('en-US', {minimumFractionDigits:2});
  document.getElementById('receipt-email-msg').textContent = 'Confirmation sent to ' + data.email;
  modal.classList.add('open');
}

function printReceipt() {
  var content = document.getElementById('receipt-content').innerHTML;
  var win = window.open('', '', 'width=600,height=600');
  win.document.write('<html><head><title>Receipt</title><style>body{font-family:sans-serif;padding:2rem;} .receipt-header{text-align:center;margin-bottom:2rem;} strong{float:right;}</style></head><body>');
  win.document.write('<div class="receipt-header"><h2>Hostel Booking Receipt</h2><p>Thank you for your booking!</p></div>');
  win.document.write('<div style="margin-top:20px; line-height: 1.8;">' + content + '</div>');
  win.document.write('</body></html>');
  win.document.close();
  setTimeout(function() { win.print(); }, 250);
}

// Paystack public key — replace with your real key from paystack.com/dashboard
// For testing, use: pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
var PAYSTACK_PUBLIC_KEY = 'pk_test_YOUR_PUBLIC_KEY_HERE';

function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }