/* app.js — Hostel listing, booking, and Paystack payment. Depends on api.js */

/* ---- State ---- */
var allHostels      = [];
var currentRoomId   = null;
var currentAmount   = 0;
var currentRoomLabel = '';
var selectedMethod  = null;

/* ---- Gallery State ---- */
var galleryData = { rooms: [], washrooms: [], kitchens: [] };
var galleryCategory = 'rooms';
var galleryIdx = 0;

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

  // Map Toggle
  var mapToggleBtn = document.getElementById('map-toggle-btn');
  if (mapToggleBtn) {
    mapToggleBtn.addEventListener('click', toggleMapView);
  }

  // Close rooms modal when clicking backdrop
  var overlay = document.getElementById('rooms-modal');
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeRoomsModal();
  });
});

function toggleMapView() {
  window.location.href = 'hostel-map.html';
}

function closeRoomsModal() {
  var overlay = document.getElementById('rooms-modal');
  if (overlay) overlay.style.display = 'none';
}

/* ================================================================
   HOSTEL LIST
   ================================================================ */
async function loadHostels() {
  var grid = document.getElementById('hostels-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div></div>';
  try {
    allHostels = await Hostels.getAll();
    
    // Natively inject the images into the frontend state, severing reliance on the Database images
    const bedFiles = ['B1.jpg','B2.jpg','B3.jpg','B4.jpg','B5.jpg','b6.jpg','b7.jpg','b8.jpg','b9.jpg','b10.jpg','b11.jpg','b12.jpg','b13.jpg','b14.jpg'];
    const kitFiles = ['K1.jpg','k2.jpg','k3.jpg','k4.jpg'];
    const washFiles = ['W1.jpg','w2.jpg','w3.jpg','w4.jpg','w5.jpg','w6.jpg','r1.jpg'];
    
    // Distribute categories for testing filters
    const types = ['premium', 'standard', 'executive'];
    const genders = ['mixed', 'male', 'female'];

    allHostels = allHostels.map((h, i) => {
      var currentPhoto = '../src/assets/images/PIC/H' + ((i % 12) + 1) + '.jpg';
      var bed1 = '../src/assets/images/Pictures/' + bedFiles[(i * 3) % bedFiles.length];
      var bed2 = '../src/assets/images/Pictures/' + bedFiles[((i * 3)+1) % bedFiles.length];
      var bed3 = '../src/assets/images/Pictures/' + bedFiles[((i * 3)+2) % bedFiles.length];
      var kit1 = '../src/assets/images/Pictures/' + kitFiles[(i * 2) % kitFiles.length];
      var kit2 = '../src/assets/images/Pictures/' + kitFiles[((i * 2)+1) % kitFiles.length];
      var wash1 = '../src/assets/images/Pictures/' + washFiles[(i * 2) % washFiles.length];
      var wash2 = '../src/assets/images/Pictures/' + washFiles[((i * 2)+1) % washFiles.length];

      h.image_urls = { 
        rooms: [currentPhoto, bed1, bed2, bed3], 
        washrooms: [wash1, wash2], 
        kitchens: [kit1, kit2] 
      };
      
      // Force assign types and genders symmetrically to populate UI filters
      h.type = types[i % types.length];
      h.gender = genders[(i + 1) % genders.length];
      
      return h;
    });

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
    return renderHostelCard(h, i);
  }).join('');
}

function renderHostelCard(h, i) {
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
    var images = typeof h.image_urls === 'string' ? JSON.parse(h.image_urls) : (h.image_urls || { rooms: [], washrooms: [], kitchens: [] });

    // Build amenity pills
    var amenityHtml = '<div class="amenities-list">' + amenities.slice(0,3).map(a => `<span class="amenity-pill">${a}</span>`).join('') + (amenities.length > 3 ? `<span class="amenity-pill">+${amenities.length-3}</span>` : '') + '</div>';

    // Build image gallery strip
    var allImgs = [...(images.rooms||[]), ...(images.washrooms||[]), ...(images.kitchens||[])];
    var galleryHtml = allImgs.length > 0 
      ? '<div class="hostel-gallery-strip">' + allImgs.slice(1,4).map(img => `<img src="${img}" alt="Hostel" onclick="openGallery(${h.id})" />`).join('') + '</div>'
      : '';

    return '<div class="hostel-card">'
      + '<div class="hostel-img" style="cursor:pointer; background-color: #f1f5f9; ' + (allImgs.length ? `background-image: url('${allImgs[0]}'); background-size: cover; background-position: center;` : `background: ${GRADIENTS[i % GRADIENTS.length]};`) + '" onclick="openGallery(' + h.id + ')">'
        + (!allImgs.length ? '<span style="font-size:3rem">🏠</span>' : '')
        + (allImgs.length ? '<div class="gallery-badge"><span class="icon">🔍</span> View Gallery</div>' : '')
        + '<span class="hostel-badge ' + (available ? 'available' : 'full') + '">'
          + (available ? rooms + ' room' + (rooms > 1 ? 's' : '') + ' left' : 'Fully Booked')
        + '</span>'
      + '</div>'
      + '<div class="hostel-info">'
        + '<div style="display:flex; justify-content:space-between; align-items:flex-start;">'
          + '<div class="hostel-name">' + h.name + '</div>'
        + '</div>'
        + '<div class="hostel-type">' + cap(h.type || 'Standard') + ' • ' + cap(h.gender || 'Mixed') + '</div>'
        + '<div class="hostel-location">📍 ' + (h.location || 'N/A') + '</div>'
        + galleryHtml
        + amenityHtml
        + '<div class="hostel-price">GH&#8373; ' + Number(h.price_per_semester || 0).toLocaleString() + ' <span>/ semester</span></div>'
        + contact
        + (available 
            ? `<button class="btn btn-primary btn-full" onclick="viewRooms(${h.id})">🔑 View & Book Rooms</button>`
            : `<button class="btn btn-outline btn-full" onclick="joinWaitlist(${h.id})">⏳ Join Waitlist</button>`
          )
        + `<button class="btn btn-outline btn-full" style="margin-top:0.5rem" onclick="openChatWithManager(${h.id}, '${h.name}')">💬 Chat with Manager</button>`
        + '</div>'
      + '</div>';
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
  var section = document.getElementById('modal-gallery-section');
  var mainImg = document.getElementById('gallery-main-img');
  
  var hostel = allHostels.find(function (h) { return h.id == hostelId; });
  
  if (hostel) {
    document.getElementById('modal-hostel-name').textContent = hostel.name;
    
    // Parse images
    try { 
      galleryData = typeof hostel.image_urls === 'string' ? JSON.parse(hostel.image_urls) : (hostel.image_urls || { rooms: [], washrooms: [], kitchens: [] }); 
    } catch(e) {
      galleryData = { rooms: [], washrooms: [], kitchens: [] };
    }

    // Default to first category with images
    galleryCategory = 'rooms';
    if (!galleryData.rooms?.length) {
      if (galleryData.kitchens?.length) galleryCategory = 'kitchens';
      else if (galleryData.washrooms?.length) galleryCategory = 'washrooms';
    }
    
    galleryIdx = 0;
    updateGalleryUI();

    if (section) {
      var hasAny = (galleryData.rooms?.length || galleryData.kitchens?.length || galleryData.washrooms?.length);
      section.style.display = hasAny ? 'block' : 'none';
    }
  }

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
              ? '<button class="btn btn-primary btn-sm" onclick="handleBookClick(' + r.id + ",'" + num + "','" + rtype + "'," + price + ')">Book</button>'
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
          return '<div class="review-item">'
            + '<div class="review-header">'
              + '<span class="review-user">' + rev.user_name + '</span>'
              + '<span class="review-stars">★ ' + rev.rating + '/5</span>'
            + '</div>'
            + '<div class="review-text">' + (rev.comment || '') + '</div>'
          + '</div>';
        }).join('');
      }
    } catch(err) {
      rContainer.innerHTML = '<p style="color:red;font-size:.85rem">Failed to load reviews.</p>';
    }
  }
}
function switchGalleryTab(cat) {
  galleryCategory = cat;
  galleryIdx = 0;
  updateGalleryUI();
  
  // Update buttons
  document.querySelectorAll('.gallery-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(cat.slice(0,-1)) || btn.textContent.toLowerCase() === cat);
  });
}

function updateGalleryUI() {
  var imgs = galleryData[galleryCategory] || [];
  var mainImg = document.getElementById('gallery-main-img');
  var curIdxEl = document.getElementById('gallery-current-idx');
  var totalEl = document.getElementById('gallery-total-count');
  
  if (!imgs.length) {
    if (mainImg) {
      mainImg.src = '';
      mainImg.style.display = 'none';
    }
    if (curIdxEl) curIdxEl.textContent = '0';
    if (totalEl) totalEl.textContent = '0';
    return;
  }

  if (mainImg) {
    mainImg.src = imgs[galleryIdx];
    mainImg.style.display = 'block';
  }
  if (curIdxEl) curIdxEl.textContent = galleryIdx + 1;
  if (totalEl) totalEl.textContent = imgs.length;
}

function nextGalleryImage() {
  var imgs = galleryData[galleryCategory] || [];
  if (!imgs.length) return;
  galleryIdx = (galleryIdx + 1) % imgs.length;
  updateGalleryUI();
}

function prevGalleryImage() {
  var imgs = galleryData[galleryCategory] || [];
  if (!imgs.length) return;
  galleryIdx = (galleryIdx - 1 + imgs.length) % imgs.length;
  updateGalleryUI();
}

function closeRoomsModal() {
  cancelConfirm();
  var modal = document.getElementById('rooms-modal');
  if (modal) modal.classList.remove('open');
}

/* ================================================================
   INLINE CONFIRM → opens Payment Modal
   ================================================================ */
function handleBookClick(roomId, roomNumber, roomType, price) {
  console.log('Book clicked:', { roomId, roomNumber, roomType, price });
  showConfirm(roomId, roomNumber, roomType, price);
  
  // Auto-scroll to the bottom of the modal body to show the confirm bar
  const modalBody = document.querySelector('.modal-body');
  if (modalBody) {
    setTimeout(() => {
      modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: 'smooth' });
    }, 100);
  }
}

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

// Paystack public key is now centralized in api.js
// var PAYSTACK_PUBLIC_KEY = ... 

function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

/* ================================================================
   WAITLIST LOGIC
   ================================================================ */
async function joinWaitlist(hostelId) {
  if (!isLoggedIn()) {
    showToast('Please log in to join the waitlist', 'warning');
    setTimeout(() => { 
       const path = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
       window.location.href = path;
    }, 1500);
    return;
  }
  
  if (!confirm('This hostel is currently full. Would you like to join the waitlist to be notified when a room becomes available?')) return;
  
  try {
    const res = await Waitlist.join(hostelId);
    showToast(res.message, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to join waitlist.', 'error');
  }
}



// ---- PREMIUM GALLERY (LIGHTBOX) ----
let currentGalleryImages = [];
let currentGalleryIndex = 0;

function openGallery(hostelId) {
  const h = allHostels.find(x => x.id === hostelId);
  if (!h) return;

  const images = typeof h.image_urls === 'string' ? JSON.parse(h.image_urls) : (h.image_urls || {rooms: [], washrooms: [], kitchens: []});
  currentGalleryImages = [...(images.rooms||[]), ...(images.washrooms||[]), ...(images.kitchens||[])];
  
  if (!currentGalleryImages.length) {
    showToast("No images available for this hostel", "info");
    return;
  }

  // Ensure Lightbox HTML exists
  if (!document.getElementById('gallery-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'gallery-overlay';
    overlay.className = 'gallery-overlay';
    overlay.innerHTML = `
      <div class="gallery-close" onclick="closeGallery()">&times;</div>
      <div class="gallery-main-wrap">
        <button class="gallery-nav prev" onclick="changeGalleryImage(-1)">❮</button>
        <img id="gallery-img" src="" alt="Gallery Preview">
        <button class="gallery-nav next" onclick="changeGalleryImage(1)">❯</button>
      </div>
      <div class="gallery-thumbs" id="gallery-thumbs"></div>
    `;
    document.body.appendChild(overlay);
    
    // Close on click background
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'gallery-overlay') closeGallery();
    });
  }

  currentGalleryIndex = 0;
  showGalleryImage(0);
  document.getElementById('gallery-overlay').classList.add('open');
}

function showGalleryImage(index) {
  const imgEl = document.getElementById('gallery-img');
  const thumbsEl = document.getElementById('gallery-thumbs');
  if (!imgEl || !thumbsEl) return;

  currentGalleryIndex = index;
  imgEl.src = currentGalleryImages[index];

  // Render Thumbnails
  thumbsEl.innerHTML = currentGalleryImages.map((img, i) => `
    <img src="${img}" class="gallery-thumb ${i === index ? 'active' : ''}" onclick="showGalleryImage(${i})">
  `).join('');
}

function changeGalleryImage(step) {
  let next = currentGalleryIndex + step;
  if (next < 0) next = currentGalleryImages.length - 1;
  if (next >= currentGalleryImages.length) next = 0;
  showGalleryImage(next);
}

function closeGallery() {
  const overlay = document.getElementById('gallery-overlay');
  if (overlay) overlay.classList.remove('open');
}