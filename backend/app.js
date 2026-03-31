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

/* ==== TEST ==== */
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

/* ==== ROOMS ==== */
app.get('/rooms/:hostelId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM rooms WHERE hostel_id=$1 ORDER BY room_number', [req.params.hostelId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Error fetching rooms' }); }
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

/* ==== CHAT ==== */
// Get messages between a student and a hostel
app.get('/chat/:hostelId', async (req, res) => {
  const { hostelId } = req.params;
  const { user_id }  = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    const r = await pool.query(
      'SELECT * FROM chat_messages WHERE hostel_id=$1 AND user_id=$2 ORDER BY created_at ASC LIMIT 100',
      [hostelId, user_id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('❌ GET /chat:', err.message);
    res.json([]);
  }
});

// Send a message (student or admin)
app.post('/chat', async (req, res) => {
  const { user_id, hostel_id, message, sender } = req.body;
  if (!user_id || !hostel_id || !message)
    return res.status(400).json({ error: 'user_id, hostel_id, message required' });
  try {
    const r = await pool.query(
      'INSERT INTO chat_messages (user_id,hostel_id,sender,message) VALUES ($1,$2,$3,$4) RETURNING *',
      [user_id, hostel_id, sender || 'student', message.trim()]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('❌ POST /chat:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
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
    res.status(201).json({ message: 'Registered successfully', token, user_id: user.id, name: user.first_name + ' ' + user.last_name });
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
    res.json({ message: 'Login successful', token, user_id: user.id, name: user.first_name + ' ' + (user.last_name || '') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
