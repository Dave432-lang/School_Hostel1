document.addEventListener('DOMContentLoaded', async function() {
  let role;
  try {
    const res = await apiFetch('/me');
    if (!res || !res.user || (res.user.role !== 'manager' && res.user.role !== 'admin')) {
      localStorage.removeItem('user_role');
      window.location.href = '../index.html';
      return;
    }
    role = res.user.role;
  } catch (err) {
    localStorage.removeItem('user_role');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('m-name').textContent = getCurrentUserName();
  document.getElementById('m-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
  
  await loadManagerStats();
  await loadManagerBookings();
  await initManagerCharts();
  await loadGroupedChats();
});

function showTab(tab, el) {
  document.getElementById('tab-overview').style.display = tab === 'overview' ? 'block' : 'none';
  document.getElementById('tab-messages').style.display = tab === 'messages' ? 'block' : 'none';
  
  document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
}

/* ---- Message Center Logic ---- */
let activeStudentId = null;
let activeHostelId = null;
let activeQuickReplyContext = { studentId: null, hostelId: null, studentName: '', hostelName: '' };

async function loadGroupedChats() {
  const list = document.getElementById('m-chat-list');
  if(!list) return;

  try {
    const chats = await apiFetch('/admin/chat/grouped');
    if(!chats.length) {
      list.innerHTML = '<div class="noti-empty">No messages yet.</div>';
      return;
    }

    list.innerHTML = chats.map(c => `
      <div class="noti-item unread" onclick="openConversation(${c.sender_id}, ${c.hostel_id}, '${c.first_name} ${c.last_name || ''}', '${c.hostel_name}')">
        <div style="font-weight:600">${c.first_name} ${c.last_name || ''}</div>
        <div style="font-size:0.75rem; color:var(--primary)">${c.hostel_name}</div>
        <div style="font-size:0.8rem; margin-top:4px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${c.message}</div>
      </div>
    `).join('');
  } catch (e) { list.innerHTML = '<div class="noti-empty">Error loading chats.</div>'; }
}

async function openConversation(studentId, hostelId, studentName, hostelName) {
  activeStudentId = studentId;
  activeHostelId = hostelId;
  
  document.getElementById('m-chat-header').textContent = `Chat with ${studentName} (${hostelName})`;
  document.getElementById('m-chat-footer').style.display = 'flex';
  
  const container = document.getElementById('m-chat-messages');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const msgs = await apiFetch(`/chat/${hostelId}?other_id=${studentId}`);
    container.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = `message ${m.sender_id == getCurrentUserId() ? 'sent' : 'received'}`;
      div.textContent = m.message;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  } catch(e) { container.innerHTML = 'Error loading messages.'; }
}

async function managerSendMessage() {
  const input = document.getElementById('m-chat-input');
  const msg = input.value.trim();
  if(!msg || !activeStudentId || !activeHostelId) return;

  const payload = {
    hostel_id: activeHostelId,
    receiver_id: activeStudentId,
    message: msg
  };

  try {
    await apiFetch('/chat', { method: 'POST', body: JSON.stringify(payload) });
    const div = document.createElement('div');
    div.className = 'message sent';
    div.textContent = msg;
    document.getElementById('m-chat-messages').appendChild(div);
    input.value = '';
    document.getElementById('m-chat-messages').scrollTop = document.getElementById('m-chat-messages').scrollHeight;
  } catch(e) { 
    showToast('Failed to send message: ' + e.message, 'error'); 
  }
}

/* ---- ANALYTICS ---- */
let occupancyChart = null;
async function initManagerCharts() {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx) return;
  try {
    const data = await apiFetch('/admin/analytics'); // Re-using general status dist for now
    if (occupancyChart) occupancyChart.destroy();
    
    // Demo figures for a nice pie
    const confirmed = data.statusDistribution.find(s => s.status === 'confirmed')?.count || 12;
    const pending = data.statusDistribution.find(s => s.status === 'pending')?.count || 5;
    const available = 8; // Mock available rooms

    occupancyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Occupied', 'Pending', 'Vacant'],
        datasets: [{
          data: [confirmed, pending, available],
          backgroundColor: ['#2563eb', '#f59e0b', '#e2e8f0'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  } catch (e) { console.error(e); }
}

async function loadManagerStats() {
  try {
    const stats = await Admin.getStats();
    document.getElementById('m-stat-bookings').textContent = stats.totalBookings || 0;
    document.getElementById('m-stat-revenue').textContent = '₵' + Number(stats.totalRevenue || 0).toLocaleString();
    document.getElementById('m-stat-hostels').textContent = stats.totalHostels || 0;
  } catch (err) {
    console.error('Error loading manager stats:', err);
    showToast('Failed to load manager statistics.', 'error');
  }
}

async function loadManagerBookings() {
  const tbody = document.getElementById('m-bookings-tbody');
  if(!tbody) return;

  try {
    const bookings = await Admin.getBookings();
    if(bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No bookings found for your hostels.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td><strong>${b.first_name} ${b.last_name || ''}</strong><div style="font-size:0.75rem">${b.user_email}</div></td>
        <td>${b.hostel_name || '—'}</td>
        <td>Rm ${b.room_number || '—'}</td>
        <td><span class="badge ${b.status === 'confirmed' ? 'badge-success' : 'badge-warning'}">${b.status}</span></td>
        <td><span class="badge ${b.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">${b.payment_status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger)">Error loading bookings.</td></tr>';
  }
}

/* ---- REAL-TIME INTERACTIVE REPLIES ---- */
window.handleIncomingMessage = function(msg) {
  // 1. If currently viewing this specific chat, append message real-time
  if (activeStudentId == msg.sender_id && activeHostelId == msg.hostel_id) {
    const container = document.getElementById('m-chat-messages');
    if (container) {
      const div = document.createElement('div');
      div.className = 'message received';
      div.textContent = msg.message;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      
      // Also refresh the chat list in background to update snippets
      loadGroupedChats();
      return;
    }
  }

  // 2. Otherwise, show an interactive "Quick Reply" toast
  const senderName = msg.sender_name || 'Student';
  const hostelName = msg.hostel_name || 'your hostel';
  
  showToast(`<strong>${senderName}</strong>: "${msg.message.substring(0, 30)}${msg.message.length > 30 ? '...' : ''}" <br><small>Re: ${hostelName}</small>`, 'info', {
    label: 'Quick Reply',
    callback: () => {
      openQuickReply(msg.sender_id, msg.hostel_id, senderName, hostelName);
    }
  });

  // 3. Refresh list to show unread state/snippet
  loadGroupedChats();
};

function goToChat(studentId, hostelId, studentName, hostelName) {
  // Select the Messages tab 
  const messagesTabBtn = Array.from(document.querySelectorAll('.menu-item'))
    .find(el => el.textContent.includes('Messages'));
  
  showTab('messages', messagesTabBtn);
  
  // Open the specific conversation
  openConversation(studentId, hostelId, studentName, hostelName);
}

/* ---- QUICK REPLY MODAL LOGIC ---- */
function openQuickReply(sid, hid, sname, hname) {
  activeQuickReplyContext = { studentId: sid, hostelId: hid, studentName: sname, hostelName: hname };
  
  document.getElementById('qr-student').textContent = sname;
  document.getElementById('qr-hostel').textContent = hname;
  document.getElementById('qr-input').value = '';
  document.getElementById('quick-reply-overlay').classList.add('open');
  
  // Focus input automatically
  setTimeout(() => document.getElementById('qr-input').focus(), 100);
}

function closeQuickReply() {
  document.getElementById('quick-reply-overlay').classList.remove('open');
}

async function sendQuickReply() {
  const input = document.getElementById('qr-input');
  const msg = input.value.trim();
  const { studentId, hostelId, studentName, hostelName } = activeQuickReplyContext;

  if (!msg || !studentId || !hostelId) return;

  const btn = document.getElementById('qr-send-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        hostel_id: hostelId,
        receiver_id: studentId,
        message: msg
      })
    });

    closeQuickReply();
    showToast('Reply sent successfully to ' + studentName, 'success');
    
    // If the main chat window happens to be open for this person, refresh it
    if (activeStudentId == studentId && activeHostelId == hostelId) {
      openConversation(studentId, hostelId, studentName, hostelName);
    }
    loadGroupedChats();
  } catch (e) {
    showToast('Failed to send quick reply: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reply';
  }
}

/* ---- REAL-TIME BOOKING UPDATE ---- */
window.handleNewBooking = function(payload) {
  // If we are a manager, we check if this booking belongs to our hostel
  // Actually, simplest is to just refresh everything if we are on the dashboard
  console.log('New booking event received:', payload);
  
  // Refresh Stats
  loadManagerStats();
  
  // Refresh List
  loadManagerBookings();
  
  // Refresh Charts
  initManagerCharts();
};
