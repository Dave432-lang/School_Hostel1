const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const https   = require('https');

const SECRET_KEY       = process.env.JWT_SECRET       || 'mysecretkey';
const PAYSTACK_SECRET  = process.env.PAYSTACK_SECRET  || 'sk_test_YOUR_PAYSTACK_SECRET_KEY_HERE';
const PORT             = 5000;

const app  = express();
const pool = require('./config/dbConfig');

app.use(cors());
app.use(express.json());

// Serve frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

/* ---- Middleware: Auth & Admin ---- */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    if (r.rows.length && r.rows[0].role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin privileges required' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error checking admin role' });
  }
};
const isManager = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    if (r.rows.length && (r.rows[0].role === 'manager' || r.rows[0].role === 'admin')) {
      next();
    } else {
      res.status(403).json({ error: 'Manager privileges required' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error checking manager role' });
  }
};

const isAdminOrManager = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    const role = r.rows[0]?.role;
    if (role === 'admin' || role === 'manager') {
      next();
    } else {
      res.status(403).json({ error: 'Privileged access required' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error checking user role' });
  }
};


/* ---- Utility: Paystack HTTPS request ---- */
function paystackReq(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request({
      hostname: 'api.paystack.co',
      path:     endpoint,
      method,
      headers: {
        Authorization:  'Bearer ' + PAYSTACK_SECRET,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end',  () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/* ==== TEST // ---- Analytics (Demo Data Included for Wow Factor) ----
app.get('/api/admin/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    // 1. Revenue last 7 days (Mock for Demo)
    const revenueHistory = [
      { date: 'Mon', amount: 12000 },
      { date: 'Tue', amount: 15400 },
      { date: 'Wed', amount: 9800 },
      { date: 'Thu', amount: 21000 },
      { date: 'Fri', amount: 18200 },
      { date: 'Sat', amount: 5500 },
      { date: 'Sun', amount: 28000 }
    ];

    // 2. Booking Status Distribution
    const statusRes = await pool.query('SELECT status, COUNT(*) FROM bookings GROUP BY status');
    
    res.json({
      revenueHistory,
      statusDistribution: statusRes.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health Check
app.get('/health', (req, res) => res.send('OK'));

app.get('/test-db', async (req, res) => {
  try   { res.json(await pool.query('SELECT NOW()')); }
  catch { res.status(500).json({ error: 'DB error'}); }
});

/* ==== HOSTELS ==== */
app.get('/hostels', async (req, res) => {
  try {
    const result  = await pool.query('SELECT * FROM hostels ORDER BY name');
    const hostels = result.rows;
    for (let h of hostels) {
      try {
        const r = await pool.query(
          'SELECT COUNT(*) FROM rooms WHERE hostel_id=$1 AND is_available=TRUE', [h.id]
        );
        h.available_rooms = parseInt(r.rows[0].count);
      } catch { h.available_rooms = 0; }
    }
    res.json(hostels);
  } catch (err) {
    console.error('❌ /hostels:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/hostels/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM hostels WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/hostels/:id/reviews', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM reviews WHERE hostel_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==== ADMIN/MANAGER CRUD: HOSTELS ==== */
app.post('/hostels', authenticateToken, isAdmin, async (req, res) => {
  const { name, location, description, type, gender, price_per_semester, amenities, image_urls, latitude, longitude, manager_id } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO hostels (name, location, description, type, gender, price_per_semester, amenities, image_urls, latitude, longitude, manager_id) ' +
      'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [name, location, description, type, gender, price_per_semester, JSON.stringify(amenities || []), JSON.stringify(image_urls || {}), latitude, longitude, manager_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/hostels/:id', authenticateToken, isAdminOrManager, async (req, res) => {
  const { id } = req.params;
  const { name, location, description, type, gender, price_per_semester, amenities, image_urls, latitude, longitude, manager_id } = req.body;
  try {
    // If manager, verify ownership
    const check = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    if (check.rows[0].role === 'manager') {
       const ownership = await pool.query('SELECT manager_id FROM hostels WHERE id=$1', [id]);
       if (ownership.rows[0]?.manager_id !== req.user.id) return res.status(403).json({ error: 'You do not manage this hostel' });
    }

    const r = await pool.query(
      'UPDATE hostels SET name=$1, location=$2, description=$3, type=$4, gender=$5, price_per_semester=$6, amenities=$7, image_urls=$8, latitude=$9, longitude=$10, manager_id=$11 ' +
      'WHERE id=$12 RETURNING *',
      [name, location, description, type, gender, price_per_semester, JSON.stringify(amenities || []), JSON.stringify(image_urls || {}), latitude, longitude, manager_id || null, id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/hostels/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM hostels WHERE id=$1', [req.params.id]);
    res.json({ message: 'Hostel deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==== ROOMS ==== */
app.get('/rooms/:hostelId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM rooms WHERE hostel_id=$1 ORDER BY room_number', [req.params.hostelId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Error fetching rooms' }); }
});

/* ==== ADMIN CRUD: ROOMS ==== */
app.post('/rooms', authenticateToken, isAdmin, async (req, res) => {
  const { hostel_id, room_number, room_type, is_available } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES ($1,$2,$3,$4) RETURNING *',
      [hostel_id, room_number, room_type, is_available === undefined ? true : is_available]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/rooms/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE id=$1', [req.params.id]);
    res.json({ message: 'Room deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==== BOOKINGS ==== */
app.post('/bookings', async (req, res) => {
  const { user_id, room_id, semester, agreed_to_terms } = req.body;
  if (!user_id || !room_id) return res.status(400).json({ error: 'user_id and room_id required' });
  try {
    const check = await pool.query('SELECT * FROM rooms WHERE id=$1 AND is_available=TRUE', [room_id]);
    if (!check.rows.length) return res.status(409).json({ error: 'Room is not available' });
    await pool.query('UPDATE rooms SET is_available=FALSE WHERE id=$1', [room_id]);
    const b = await pool.query(
      'INSERT INTO bookings (user_id, room_id, status, payment_status, semester, agreed_to_terms) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [user_id, room_id, 'confirmed', 'unpaid', semester || null, agreed_to_terms || false]
    );
    res.status(201).json({ message: 'Booking successful', booking: b.rows[0] });
  } catch (err) {
    console.error('❌ POST /bookings:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/bookings/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT b.id, b.user_id, b.room_id, ' +
      'COALESCE(b.status,\'confirmed\') AS status, ' +
      'COALESCE(b.payment_status,\'unpaid\') AS payment_status, ' +
      'COALESCE(b.amount_paid,0) AS amount_paid, ' +
      'b.payment_reference, b.created_at, ' +
      'h.name AS hostel_name, r.room_number, r.room_type ' +
      'FROM bookings b ' +
      'LEFT JOIN rooms r ON r.id=b.room_id ' +
      'LEFT JOIN hostels h ON h.id=r.hostel_id ' +
      'WHERE b.user_id=$1 ORDER BY b.id DESC',
      [req.params.userId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('❌ /bookings join error:', err.message);
    try {
      const s = await pool.query('SELECT * FROM bookings WHERE user_id=$1 ORDER BY id DESC', [req.params.userId]);
      res.json(s.rows);
    } catch { res.json([]); }
  }
});

app.patch('/bookings/:bookingId/cancel', async (req, res) => {
  try {
    const b = await pool.query('SELECT * FROM bookings WHERE id=$1', [req.params.bookingId]);
    if (!b.rows.length) return res.status(404).json({ error: 'Booking not found' });
    if (b.rows[0].room_id)
      await pool.query('UPDATE rooms SET is_available=TRUE WHERE id=$1', [b.rows[0].room_id]);
    const r = await pool.query(
      'UPDATE bookings SET status=\'cancelled\' WHERE id=$1 RETURNING *', [req.params.bookingId]
    );
    res.json({ message: 'Booking cancelled', booking: r.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error cancelling booking' }); }
});

/* ==== ADMIN/MANAGER: BOOKINGS & STATS ==== */
app.get('/admin/bookings', authenticateToken, isManager, async (req, res) => {
  try {
    const check = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    let query = 'SELECT b.*, u.first_name, u.last_name, u.email as user_email, h.name as hostel_name, r.room_number ' +
                'FROM bookings b ' +
                'JOIN users u ON u.id = b.user_id ' +
                'LEFT JOIN rooms r ON r.id = b.room_id ' +
                'LEFT JOIN hostels h ON h.id = r.hostel_id ';
    let params = [];

    if (check.rows[0].role === 'manager') {
      query += 'WHERE h.manager_id = $1 ';
      params.push(req.user.id);
    }
    
    query += 'ORDER BY b.created_at DESC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/admin/bookings/:id/status', authenticateToken, isManager, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const r = await pool.query('UPDATE bookings SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/stats', authenticateToken, isManager, async (req, res) => {
  try {
    const check = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    const isManagerRole = check.rows[0].role === 'manager';
    
    let hostelsQ = 'SELECT COUNT(*) FROM hostels';
    let usersQ = 'SELECT COUNT(*) FROM users WHERE role=\'student\'';
    let bookingsQ = 'SELECT COUNT(*) FROM bookings';
    let revenueQ = 'SELECT SUM(amount_paid) FROM bookings WHERE payment_status=\'paid\'';
    let params = [];

    if (isManagerRole) {
      hostelsQ += ' WHERE manager_id = $1';
      bookingsQ = 'SELECT COUNT(*) FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN hostels h ON h.id=r.hostel_id WHERE h.manager_id = $1';
      revenueQ = 'SELECT SUM(amount_paid) FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN hostels h ON h.id=r.hostel_id WHERE b.payment_status=\'paid\' AND h.manager_id = $1';
      params.push(req.user.id);
    }

    const hostels = await pool.query(hostelsQ, params);
    const users   = await pool.query(usersQ);
    const bookings = await pool.query(bookingsQ, params);
    const revenue  = await pool.query(revenueQ, params);
    
    res.json({
      totalHostels: parseInt(hostels.rows[0].count),
      totalStudents: parseInt(users.rows[0].count),
      totalBookings: parseInt(bookings.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].sum || 0)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==== NOTIFICATIONS ==== */
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==== WAITLIST ==== */
app.post('/waitlist/join', authenticateToken, async (req, res) => {
  const { hostel_id } = req.body;
  const user_id = req.user.id;
  try {
     const exists = await pool.query('SELECT * FROM waitlist WHERE user_id=$1 AND hostel_id=$2 AND status=\'active\'', [user_id, hostel_id]);
     if (exists.rows.length) return res.status(409).json({ error: 'You are already on the waitlist for this hostel' });
     
     await pool.query('INSERT INTO waitlist (user_id, hostel_id) VALUES ($1,$2)', [user_id, hostel_id]);
     res.status(201).json({ message: 'Successfully joined the waitlist!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/waitlist/:hostelId', authenticateToken, isManager, async (req, res) => {
  try {
     const r = await pool.query(
       'SELECT w.*, u.first_name, u.last_name, u.email FROM waitlist w ' +
       'JOIN users u ON u.id = w.user_id ' +
       'WHERE w.hostel_id = $1 ORDER BY w.created_at ASC',
       [req.params.hostelId]
     );
     res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});app.get('/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ==== CHAT ==== */
// Get messages between two users for a hostel
app.get('/chat/:hostelId', authenticateToken, async (req, res) => {
  const { hostelId } = req.params;
  const { other_id }  = req.query; // If manager is viewing, this is student_id. If student is viewing, it's irrelevant (receiver is manager).
  const myId = req.user.id;
  
  try {
    const r = await pool.query(
      'SELECT * FROM chat_messages WHERE hostel_id=$1 AND ( (sender_id=$2 AND receiver_id=$3) OR (sender_id=$3 AND receiver_id=$2) ) ORDER BY created_at ASC',
      [hostelId, myId, other_id]
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

// Manager Chat List: Grouped by Student
app.get('/admin/chat/grouped', authenticateToken, isManager, async (req, res) => {
  try {
    const check = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
    let query = 'SELECT DISTINCT ON (c.sender_id, c.hostel_id) c.*, u.first_name, u.last_name, h.name as hostel_name ' +
                'FROM chat_messages c ' +
                'JOIN users u ON u.id = c.sender_id ' +
                'JOIN hostels h ON h.id = c.hostel_id ';
    let params = [];
    if (check.rows[0].role === 'manager') {
       query += 'WHERE h.manager_id = $1 ';
       params.push(req.user.id);
    }
    query += 'ORDER BY c.sender_id, c.hostel_id, c.created_at DESC';
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send a message
app.post('/chat', authenticateToken, async (req, res) => {
  const { hostel_id, message, receiver_id } = req.body;
  const sender_id = req.user.id;

  try {
    // 1. Save Message
    const r = await pool.query(
      'INSERT INTO chat_messages (sender_id, receiver_id, hostel_id, message) VALUES ($1,$2,$3,$4) RETURNING *',
      [sender_id, receiver_id, hostel_id, message.trim()]
    );
    
    // 2. Notify Receiver
    const sender = await pool.query('SELECT first_name FROM users WHERE id=$1', [sender_id]);
    await pool.query(
      'INSERT INTO notifications (user_id, type, message, target_url) VALUES ($1, \'chat\', $2, $3)',
      [receiver_id, `New message from ${sender.rows[0].first_name}`, '/pages/hostel-list.html']
    );

    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

/* ==== PAYSTACK PAYMENT ==== */

// Initialize — creates a Paystack transaction, returns access_code + reference
app.post('/pay/initialize', async (req, res) => {
  const { room_id, user_id, email, amount_ghs } = req.body;
  if (!room_id || !user_id || !email || !amount_ghs)
    return res.status(400).json({ error: 'room_id, user_id, email, amount_ghs required' });
  try {
    const room = await pool.query('SELECT * FROM rooms WHERE id=$1 AND is_available=TRUE', [room_id]);
    if (!room.rows.length) return res.status(409).json({ error: 'Room is no longer available' });

    const amountPesewas = Math.round(parseFloat(amount_ghs) * 100);
    const reference     = 'HST-' + Date.now() + '-' + user_id;

    const result = await paystackReq('POST', '/transaction/initialize', {
      email,
      amount:    amountPesewas,
      currency:  'GHS',
      reference,
      metadata:  { room_id, user_id }
    });

    if (!result.status)
      return res.status(400).json({ error: result.message || 'Paystack init failed' });

    res.json({
      authorization_url: result.data.authorization_url,
      access_code:       result.data.access_code,
      reference:         result.data.reference
    });
  } catch (err) {
    console.error('❌ /pay/initialize:', err.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Verify — confirm with Paystack then record booking
app.post('/pay/verify', async (req, res) => {
  const { reference, room_id, user_id, semester, agreed_to_terms } = req.body;
  if (!reference || !room_id || !user_id)
    return res.status(400).json({ error: 'reference, room_id, user_id required' });
  try {
    const result = await paystackReq('GET', '/transaction/verify/' + encodeURIComponent(reference));
    if (!result.status || result.data.status !== 'success')
      return res.status(402).json({ error: 'Payment not confirmed by Paystack' });

    const room = await pool.query('SELECT * FROM rooms WHERE id=$1 AND is_available=TRUE', [room_id]);
    if (!room.rows.length) return res.status(409).json({ error: 'Room is no longer available' });

    await pool.query('UPDATE rooms SET is_available=FALSE WHERE id=$1', [room_id]);
    const amountPaid = result.data.amount / 100;

    const booking = await pool.query(
      'INSERT INTO bookings (user_id,room_id,status,payment_reference,payment_status,amount_paid,semester,agreed_to_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [user_id, room_id, 'confirmed', reference, 'paid', amountPaid, semester || null, agreed_to_terms || false]
    );
    res.status(201).json({ message: 'Payment verified! Booking confirmed.', booking: booking.rows[0] });
  } catch (err) {
    console.error('❌ /pay/verify:', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

/* ==== AUTH ==== */
app.post('/register', async (req, res) => {
  const { first_name, last_name, student_id, programme, year_of_study, email, password } = req.body;
  if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'First name, last name, email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'An account with this email already exists' });
    const hash  = await bcrypt.hash(password, 10);
    const r     = await pool.query(
      'INSERT INTO users (first_name,last_name,student_id,programme,year_of_study,email,password) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,first_name,last_name,email', 
      [first_name, last_name, student_id, programme, year_of_study, email, hash]
    );
    const user  = r.rows[0];
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
    res.status(201).json({ 
      message: 'Registered successfully', 
      token, 
      user_id: user.id, 
      name: user.first_name + ' ' + user.last_name,
      role: 'student'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const r    = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok)   return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ 
      message: 'Login successful', 
      token, 
      user_id: user.id, 
      name: user.first_name + ' ' + (user.last_name || ''),
      role: user.role || 'student'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
