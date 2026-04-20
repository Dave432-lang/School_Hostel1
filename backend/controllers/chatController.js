const pool = require('../config/dbConfig');

exports.getChatMessages = async (req, res) => {
  const { hostelId } = req.params;
  let { other_id }  = req.query; 
  const myId = req.user.id;
  
  try {
    // If other_id is missing, find the manager of this hostel
    if (!other_id) {
      const h = await pool.query('SELECT manager_id FROM hostels WHERE id=?', [hostelId]);
      if (h.rows.length > 0) {
        other_id = h.rows[0].manager_id || 1; // Fallback to superadmin
      } else {
        other_id = 1;
      }
    }

    const r = await pool.query(
      'SELECT * FROM chat_messages WHERE hostel_id=? AND ( (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ) ORDER BY created_at ASC',
      [hostelId, myId, other_id, other_id, myId]
    );
    res.json(r.rows);
  } catch (err) { 
    console.error('Chat load error:', err.message);
    res.json([]); 
  }
};

exports.getAdminChatGrouped = async (req, res) => {
  try {
    const check = await pool.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    let query = 'SELECT c.*, u.first_name, u.last_name, h.name as hostel_name ' +
                'FROM chat_messages c ' +
                'JOIN users u ON u.id = c.sender_id ' +
                'JOIN hostels h ON h.id = c.hostel_id ' +
                'WHERE c.id IN (SELECT MAX(id) FROM chat_messages GROUP BY sender_id, hostel_id) ';
    let params = [];
    if (check.rows[0].role === 'manager') {
       query += 'AND h.manager_id = ? ';
       params.push(req.user.id);
    }
    query += 'ORDER BY c.created_at DESC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.sendMessage = async (req, res) => {
  let { hostel_id, message, receiver_id } = req.body;
  const sender_id = req.user.id;

  try {
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // 1. Resolve receiver_id if frontend didn't provide it
    if (!receiver_id && hostel_id) {
      console.log('Resolving receiver_id for hostel:', hostel_id);
      const h = await pool.query('SELECT manager_id FROM hostels WHERE id=?', [hostel_id]);
      if (h.rows.length > 0) {
        receiver_id = h.rows[0].manager_id || 1;
      } else {
        receiver_id = 1; // System Admin
      }
    }

    console.log(`Sending message from ${sender_id} to ${receiver_id} for hostel ${hostel_id}`);

    const r = await pool.query(
      'INSERT INTO chat_messages (sender_id, receiver_id, hostel_id, message) VALUES (?,?,?,?)',
      [sender_id, receiver_id, hostel_id, message.trim()]
    );
    const newMessage = { id: r.insertId, sender_id, receiver_id, hostel_id, message: message.trim(), created_at: new Date() };

    // 2. Notify Receiver
    try {
      const sender = await pool.query('SELECT first_name FROM users WHERE id=?', [sender_id]);
      const senderName = sender.rows[0]?.first_name || 'Someone';
      const notifMsg = `New message from ${senderName}`;
      await pool.query(
        'INSERT INTO notifications (user_id, type, message, target_url) VALUES (?, \'chat\', ?, ?)',
        [receiver_id, notifMsg, '/pages/hostel-list.html']
      );

      // 3. Emit real-time WebSockets events!
      const io = req.app.get('io');
      if (io) {
        io.to('user_' + receiver_id).emit('new_message', newMessage);
        io.to('user_' + receiver_id).emit('notification', { message: notifMsg });
      }
    } catch (notiErr) {
      console.error('Notification/Socket error (non-fatal):', notiErr.message);
    }

    res.status(201).json(newMessage);

    // Demo Auto-Responder Logic
    const senderData = await pool.query('SELECT role FROM users WHERE id=?', [sender_id]);
    if (senderData.rows.length && senderData.rows[0].role === 'student' && receiver_id !== sender_id) {
      setTimeout(async () => {
        try {
          const autoMsg = "Hi there! I am the automated manager bot. A real manager will look at your message shortly.";
          const bot = await pool.query(
            'INSERT INTO chat_messages (sender_id, receiver_id, hostel_id, message) VALUES (?,?,?,?)',
            [receiver_id, sender_id, hostel_id, autoMsg]
          );
          const botMsg = { id: bot.insertId, sender_id: receiver_id, receiver_id: sender_id, hostel_id, message: autoMsg, created_at: new Date() };

          const io = req.app.get('io');
          if (io) {
            io.to('user_' + sender_id).emit('new_message', botMsg);
            io.to('user_' + sender_id).emit('notification', { message: 'New message from Hostel Support' });
          }
        } catch (e) { console.error('Auto-responder error:', e.message); }
      }, 1500);
    }

  } catch (err) { 
    console.error('❌ sendMessage error:', err.message);
    res.status(500).json({ error: 'Failed to send message: ' + err.message }); 
  }
};
