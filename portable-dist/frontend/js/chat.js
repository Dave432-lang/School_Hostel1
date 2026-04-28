/* chat.js — Student-side Chat logic for School Hostel Booking System. Depends on api.js */

let chatOpen = false;
let currentChatHostelId = null;

async function openChatWithManager(hostelId, hostelName) {
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    showToast('Please log in to chat', 'warning');
    setTimeout(() => { window.location.href = '../index.html'; }, 1500);
    return;
  }
  
  const widget = document.getElementById('chat-widget');
  if (widget) widget.classList.add('open');
  
  const header = document.getElementById('chat-hostel-name');
  if (header) header.textContent = `Chat: ${hostelName}`;

  currentChatHostelId = hostelId;
  chatOpen = true;
  await loadChatMessages();
}

async function toggleChatWidget(hostelId = null) {
  const widget = document.getElementById('chat-widget');
  if (!widget) return;
  
  if (hostelId) {
    currentChatHostelId = hostelId;
  } else if (!currentChatHostelId) {
    // Fallback: If they click the floating bubble directly, link them to the primary hostel by default
    try {
      const hostels = typeof allHostels !== 'undefined' && allHostels.length ? allHostels : await apiFetch('/hostels');
      if (hostels && hostels.length > 0) {
        currentChatHostelId = hostels[0].id;
        const header = document.getElementById('chat-hostel-name');
        if (header) header.textContent = `Support Chat: ${hostels[0].name}`;
      }
    } catch(e) { console.warn('Could not load fallback hostel for chat'); }
  }
  
  chatOpen = !chatOpen;
  
  if (chatOpen) {
    widget.classList.add('open');
    if (currentChatHostelId) await loadChatMessages();
  } else {
    widget.classList.remove('open');
  }
}

async function loadChatMessages() {
  if (!currentChatHostelId) return;
  const container = document.getElementById('chat-messages');
  if (!container) return;

  try {
    // 1. Get Manager ID for this hostel
    let managerId = 1; // Default
    try {
      const h = typeof allHostels !== 'undefined' ? allHostels.find(x => x.id == currentChatHostelId) : await apiFetch(`/hostels/${currentChatHostelId}`);
      managerId = (h && h.manager_id) ? h.manager_id : 1;
    } catch(e) { console.warn('Could not determine manager ID for chat context'); }

    // 2. Fetch messages with other_id
    const msgs = await apiFetch(`/chat/${currentChatHostelId}?other_id=${managerId}`);
    if (!msgs || !Array.isArray(msgs)) return;
    
    container.innerHTML = '';
    msgs.forEach(m => {
      appendChatMessage(m.message, m.sender_id == getCurrentUserId() ? 'sent' : 'received', false);
    });
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('Chat error:', err);
  }
}

function appendChatMessage(messageText, type, autoScroll = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = messageText;
  container.appendChild(div);
  
  if (autoScroll) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim() || !currentChatHostelId) return;

  const msg = input.value.trim();
  try {
    // Append locally immediately for good UX
    appendChatMessage(msg, 'sent');
    input.value = '';

    const h = await apiFetch(`/hostels/${currentChatHostelId}`);
    const managerId = h.manager_id || 1; // Fallback to superadmin

    await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        hostel_id: currentChatHostelId,
        receiver_id: managerId,
        message: msg
      })
    });
    // Server will push this message via WebSockets to the receiver, 
    // we don't need to reload because we appended locally.
  } catch (err) {
    showToast('Failed to send message: ' + err.message, 'error');
  }
}

// Global expose
window.toggleChatWidget = toggleChatWidget;
window.openChatWithManager = openChatWithManager;
window.sendChatMessage = sendChatMessage;
window.appendChatMessage = appendChatMessage;
