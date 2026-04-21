const pool = require('../config/dbConfig');
const { paystackReq } = require('../utils/paystack');
const { sendEmail } = require('../utils/email');

exports.createBooking = async (req, res) => {
  const { room_id, semester, agreed_to_terms } = req.body;
  const user_id = req.user.id;
  if (!room_id) return res.status(400).json({ error: 'room_id required' });
  try {
    // Atomic Transaction-less Claim
    const claim = await pool.query('UPDATE rooms SET is_available=FALSE WHERE id=? AND is_available=TRUE', [room_id]);
    if (claim.rowCount === 0) return res.status(409).json({ error: 'Room is no longer available' });

    const b = await pool.query(
      'INSERT INTO bookings (user_id, room_id, status, payment_status, semester, agreed_to_terms) VALUES (?,?,?,?,?,?)',
      [user_id, room_id, 'confirmed', 'unpaid', semester || null, agreed_to_terms || false]
    );
    const bookingId = b.insertId;
    
    // Dispatch Notification
    try {
      const u = await pool.query('SELECT email, first_name FROM users WHERE id=?', [user_id]);
      if (u.rows.length) {
        await sendEmail(
          u.rows[0].email,
          'Your Hostel Booking is Confirmed!',
          `<h3>Hello ${u.rows[0].first_name},</h3><p>Your room booking has been successfully secured.</p><p>Please complete your payment within 48 hours to avoid cancellation.</p><br><i>School Hostel Admin</i>`
        );
      }
    } catch(e) { console.error('Email trigger failed', e); }

    // Dispatch Real-time Update
    const io = req.app.get('io');
    if (io) {
      const room = await pool.query('SELECT hostel_id FROM rooms WHERE id=?', [room_id]);
      const hostelId = room.rows[0]?.hostel_id;
      io.emit('new_booking', { booking_id: bookingId, hostel_id: hostelId });
    }

    res.status(201).json({ message: 'Booking successful', booking: { id: bookingId, ...req.body } });
  } catch (err) {
    console.error('❌ POST /bookings:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
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
      'WHERE b.user_id=? ORDER BY b.id DESC',
      [req.params.userId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('❌ /bookings join error:', err.message);
    try {
      const s = await pool.query('SELECT * FROM bookings WHERE user_id=? ORDER BY id DESC', [req.params.userId]);
      res.json(s.rows);
    } catch { res.json([]); }
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const b = await pool.query('SELECT * FROM bookings WHERE id=?', [req.params.bookingId]);
    if (!b.rows.length) return res.status(404).json({ error: 'Booking not found' });
    if (b.rows[0].room_id)
      await pool.query('UPDATE rooms SET is_available=TRUE WHERE id=?', [b.rows[0].room_id]);
    await pool.query(
      'UPDATE bookings SET status=\'cancelled\' WHERE id=?', [req.params.bookingId]
    );
    res.json({ message: 'Booking cancelled' });
  } catch (err) { res.status(500).json({ error: 'Error cancelling booking' }); }
};

/* ==== PAYSTACK PAYMENT ==== */
exports.initializePayment = async (req, res) => {
  const { room_id, email, amount_ghs } = req.body;
  const user_id = req.user.id;
  if (!room_id || !email || !amount_ghs)
    return res.status(400).json({ error: 'room_id, email, amount_ghs required' });
  try {
    const room = await pool.query('SELECT * FROM rooms WHERE id=? AND is_available=TRUE', [room_id]);
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
};

exports.verifyPayment = async (req, res) => {
  const { reference, room_id, semester, agreed_to_terms } = req.body;
  const user_id = req.user.id;
  if (!reference || !room_id)
    return res.status(400).json({ error: 'reference, room_id required' });

  const client = await pool.connect();
  try {
    const result = await paystackReq('GET', '/transaction/verify/' + encodeURIComponent(reference));
    if (!result.status || result.data.status !== 'success')
      return res.status(402).json({ error: 'Payment not confirmed by Paystack' });

    await client.query('START TRANSACTION');
    
    // Atomic Claim within Transaction
    const claim = await client.query(
      'UPDATE rooms SET is_available=FALSE WHERE id=? AND is_available=TRUE', 
      [room_id]
    );
    if (claim.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Room is no longer available. Please contact support for a refund.' });
    }

    const amountPaid = result.data.amount / 100;

    const bookingResult = await client.query(
      'INSERT INTO bookings (user_id,room_id,status,payment_reference,payment_status,amount_paid,semester,agreed_to_terms) VALUES (?,?,?,?,?,?,?,?)',
      [user_id, room_id, 'confirmed', reference, 'paid', amountPaid, semester || null, agreed_to_terms || false]
    );

    await client.query('COMMIT');
    
    // Dispatch Payment Notification
    try {
      const u = await pool.query('SELECT email, first_name FROM users WHERE id=?', [user_id]);
      if (u.rows.length) {
        await sendEmail(
          u.rows[0].email,
          'Payment Receipt: Hostel Booking',
          `<h3>Hello ${u.rows[0].first_name},</h3><p>We successfully received your payment of GHS ${amountPaid}.</p><p>Your booking is completely locked in. Thank you!</p><br><i>School Hostel Finance</i>`
        );
      }
    } catch(e) { console.error('Email trigger failed', e); }

    // Dispatch Real-time Update
    const io = req.app.get('io');
    if (io) {
      const room = await pool.query('SELECT hostel_id FROM rooms WHERE id=?', [room_id]);
      const hostelId = room.rows[0]?.hostel_id;
      io.emit('new_booking', { booking_id: bookingResult.insertId, hostel_id: hostelId });
    }

    res.status(201).json({ message: 'Payment verified! Booking confirmed.', booking_id: bookingResult.insertId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ /pay/verify:', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  } finally {
    client.release();
  }
};

const crypto = require('crypto');
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

exports.paystackWebhook = async (req, res) => {
  // Validate Paystack signature
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    const room_id = event.data.metadata?.room_id;
    const user_id = event.data.metadata?.user_id;

    if (!room_id || !user_id) return res.send('OK'); // Not our transaction format

    res.send('Webhook received successfully');
    
    // Check if booking already exists (from synchronous frontend verification)
    const existing = await pool.query('SELECT id FROM bookings WHERE payment_reference=?', [reference]);
    if (existing.rows.length > 0) return; // Already handled

    // If not handled, do the booking process here natively!
    const client = await pool.connect();
    try {
      await client.query('START TRANSACTION');
      const claim = await client.query('UPDATE rooms SET is_available=FALSE WHERE id=? AND is_available=TRUE', [room_id]);
      if (claim.rowCount > 0) {
        const amountPaid = event.data.amount / 100;
        const b = await client.query(
          'INSERT INTO bookings (user_id,room_id,status,payment_reference,payment_status,amount_paid,semester,agreed_to_terms) VALUES (?,?,?,?,?,?,?,?)',
          [user_id, room_id, 'confirmed', reference, 'paid', amountPaid, null, true]
        );
        
        // Dispatch Real-time Update
        const io = req.app.get('io');
        if (io) {
          const room = await client.query('SELECT hostel_id FROM rooms WHERE id=?', [room_id]);
          const hostelId = room.rows[0]?.hostel_id;
          io.emit('new_booking', { booking_id: b.insertId, hostel_id: hostelId });
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Webhook processing failed:', e.message);
    } finally {
      client.release();
    }
  } else {
    res.send('Event not handled');
  }
};
