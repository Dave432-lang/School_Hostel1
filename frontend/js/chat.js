/* chat.js — Floating chat widget. Depends on api.js. Include on all inner pages. */

(function () {
  var POLL_INTERVAL   = 5000;
  var pollTimer       = null;
  var currentHostelId = null;
  var lastMsgId       = 0;
  var isOpen          = false;

  /* ---- Inject widget HTML ---- */
  var html = `
  <div id="chat-widget">
    <button id="chat-fab" onclick="chatToggle()" title="Chat with hostel admin">
      <span id="chat-fab-icon">💬</span>
      <span id="chat-badge" style="display:none"></span>
    </button>
    <div id="chat-panel">
      <div id="chat-header">
        <div>
          <div style="font-weight:700;font-size:.95rem">🏠 Hostel Chat</div>
          <div id="chat-hostel-label" style="font-size:.75rem;opacity:.8">Select a hostel to chat</div>
        </div>
        <button onclick="chatToggle()" style="background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;line-height:1">✕</button>
      </div>
      <div id="chat-hostel-picker">
        <select id="chat-hostel-select" onchange="chatSelectHostel(this.value)">
          <option value="">— Select Hostel —</option>
        </select>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-row">
        <input id="chat-input" type="text" placeholder="Type a message…" onkeydown="if(event.key==='Enter')chatSend()" />
        <button onclick="chatSend()">Send</button>
      </div>
    </div>
  </div>`;

  var style = `
  <style>
  #chat-widget { position:fixed; bottom:1.5rem; right:1.5rem; z-index:2000; font-family:inherit; }
  #chat-fab {
    width:56px; height:56px; border-radius:50%; border:none; cursor:pointer;
    background:linear-gradient(135deg,#667eea,#764ba2);
    color:#fff; font-size:1.5rem; box-shadow:0 4px 20px rgba(102,126,234,.5);
    position:relative; transition:transform .2s;
  }
  #chat-fab:hover { transform:scale(1.1); }
  #chat-badge {
    position:absolute; top:-4px; right:-4px; background:#ef4444; color:#fff;
    font-size:.65rem; font-weight:700; width:18px; height:18px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
  }
  #chat-panel {
    display:none; flex-direction:column;
    width:320px; height:440px;
    background:#fff; border-radius:16px; overflow:hidden;
    box-shadow:0 16px 48px rgba(0,0,0,.2);
    position:absolute; bottom:70px; right:0;
  }
  #chat-panel.open { display:flex; }
  #chat-header {
    background:linear-gradient(135deg,#667eea,#764ba2); color:#fff;
    padding:.85rem 1rem; display:flex; justify-content:space-between; align-items:flex-start;
    flex-shrink:0;
  }
  #chat-hostel-picker { padding:.5rem .85rem; border-bottom:1px solid #f0f0f0; flex-shrink:0; }
  #chat-hostel-select { width:100%; padding:.4rem .6rem; border:1px solid #ddd; border-radius:8px; font-size:.8rem; }
  #chat-messages { flex:1; overflow-y:auto; padding:.75rem; display:flex; flex-direction:column; gap:.5rem; }
  .chat-msg { max-width:80%; padding:.5rem .75rem; border-radius:12px; font-size:.82rem; line-height:1.4; word-break:break-word; }
  .chat-msg.student { align-self:flex-end; background:#667eea; color:#fff; border-bottom-right-radius:4px; }
  .chat-msg.admin   { align-self:flex-start; background:#f3f4f6; color:#1f2937; border-bottom-left-radius:4px; }
  .chat-msg .chat-meta { font-size:.68rem; opacity:.7; margin-top:.2rem; }
  .chat-empty { text-align:center; color:#9ca3af; font-size:.8rem; margin:auto; }
  #chat-input-row { display:flex; gap:.5rem; padding:.75rem; border-top:1px solid #f0f0f0; flex-shrink:0; }
  #chat-input { flex:1; padding:.45rem .75rem; border:1px solid #ddd; border-radius:8px; font-size:.85rem; outline:none; }
  #chat-input:focus { border-color:#667eea; }
  #chat-input-row button { padding:.45rem .9rem; background:#667eea; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:.85rem; font-weight:600; }
  </style>`;

  document.head.insertAdjacentHTML('beforeend', style);
  document.body.insertAdjacentHTML('beforeend', html);

  /* Load hostel list into picker */
  Hostels.getAll().then(function (hostels) {
    var sel = document.getElementById('chat-hostel-select');
    hostels.forEach(function (h) {
      var opt = document.createElement('option');
      opt.value       = h.id;
      opt.textContent = h.name;
      sel.appendChild(opt);
    });
  }).catch(function () {});

  /* ---- Public functions ---- */
  window.chatToggle = function () {
    isOpen = !isOpen;
    document.getElementById('chat-panel').classList.toggle('open', isOpen);
    document.getElementById('chat-fab-icon').textContent = isOpen ? '✕' : '💬';
    document.getElementById('chat-badge').style.display = 'none';
    if (isOpen && currentHostelId) { lastMsgId = 0; chatLoad(); }
    if (isOpen && !pollTimer) startPoll();
    if (!isOpen) stopPoll();
  };

  window.chatSelectHostel = function (hostelId) {
    currentHostelId = hostelId || null;
    lastMsgId       = 0;
    var label = document.getElementById('chat-hostel-label');
    label.textContent = hostelId ? document.getElementById('chat-hostel-select').options[
      document.getElementById('chat-hostel-select').selectedIndex].text : 'Select a hostel to chat';
    document.getElementById('chat-messages').innerHTML = '';
    if (hostelId) chatLoad();
  };

  window.chatSend = async function () {
    if (!currentHostelId) { showToast('Please select a hostel first.', 'warning'); return; }
    var input   = document.getElementById('chat-input');
    var message = input.value.trim();
    if (!message) return;
    var userId = getCurrentUserId();
    if (!userId) { showToast('Please log in.', 'error'); return; }
    input.value = '';
    try {
      await apiFetch('/chat', {
        method: 'POST',
        body:   JSON.stringify({ user_id: userId, hostel_id: currentHostelId, message, sender: 'student' })
      });
      chatLoad();
    } catch (e) {
      showToast('Failed to send message.', 'error');
    }
  };

  async function chatLoad() {
    if (!currentHostelId) return;
    var userId = getCurrentUserId();
    if (!userId) return;
    try {
      var msgs = await apiFetch('/chat/' + currentHostelId + '?user_id=' + userId);
      renderMessages(msgs);
    } catch {}
  }

  function renderMessages(msgs) {
    var box = document.getElementById('chat-messages');
    if (!msgs.length) {
      box.innerHTML = '<div class="chat-empty">No messages yet.<br>Start the conversation! 👋</div>';
      return;
    }
    var myId  = getCurrentUserId();
    box.innerHTML = msgs.map(function (m) {
      var side = (m.sender === 'admin') ? 'admin' : 'student';
      var time = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '';
      return '<div class="chat-msg ' + side + '">'
        + escHTML(m.message)
        + '<div class="chat-meta">'
          + (side === 'admin' ? '🏢 Admin' : '👤 You')
          + (time ? ' · ' + time : '')
        + '</div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
    if (msgs.length) lastMsgId = msgs[msgs.length - 1].id;
  }

  function startPoll() { pollTimer = setInterval(function () { if (isOpen && currentHostelId) chatLoad(); }, POLL_INTERVAL); }
  function stopPoll()  { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
  function escHTML(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
