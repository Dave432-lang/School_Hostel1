const pool = require('../config/dbConfig');

exports.getChatMessages = async (req, res) => {
  const { hostelId } = req.params;
  const { other_id }  = req.query; 
  const myId = req.user.id;
  
  try {
    const r = await pool.query(
      'SELECT * FROM chat_messages WHERE hostel_id=? AND ( (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ) ORDER BY created_at ASC',
      [hostelId, myId, other_id, other_id, myId]
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
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
  const { hostel_id, message, receiver_id } = req.body;
  const sender_id = req.user.id;

  try {
    const r = await pool.query(
      'INSERT INTO chat_messages (sender_id, receiver_id, hostel_id, message) VALUES (?,?,?,?)',
      [sender_id, receiver_id, hostel_id, message.trim()]
    );
    const newMessage = { id: r.insertId, sender_id, receiver_id, hostel_id, message: message.trim(), created_at: new Date() };

    // 2. Notify Receiver
    const sender = await pool.query('SELECT first_name FROM users WHERE id=?', [sender_id]);
    const notifMsg = `New message from ${sender.rows[0].first_name}`;
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

    res.status(201).json(newMessage);

    // Demo Auto-Responder Logic
    // If a student is texting the manager, have the backend automatically draft a reply
    const senderData = await pool.query('SELECT role FROM users WHERE id=?', [sender_id]);
    if (senderData.rows.length && senderData.rows[0].role === 'student') {
      setTimeout(async () => {
        try {
          const autoMsg = "Hi there! I am the automated manager bot. A real manager will look at your message shortly.";
          
          // Insert bot message into database as coming from the manager
          const bot = await pool.query(
            'INSERT INTO chat_messages (sender_id, receiver_id, hostel_id, message) VALUES (?,?,?,?)',
            [receiver_id, sender_id, hostel_id, autoMsg]
          );
          const botMsg = { id: bot.insertId, sender_id: receiver_id, receiver_id: sender_id, hostel_id, message: autoMsg, created_at: new Date() };

          if (io) {
            io.to('user_' + sender_id).emit('new_message', botMsg);
            io.to('user_' + sender_id).emit('notification', { message: 'New message from Hostel Support' });
          }
        } catch (e) {
          console.error('Auto-responder error:', e.message);
        }
      }, 1500); // 1.5 second delay makes it feel natural
    }

  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
};
