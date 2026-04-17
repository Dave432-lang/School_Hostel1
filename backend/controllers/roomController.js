const pool = require('../config/dbConfig');

exports.getRoomsByHostelId = async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM rooms WHERE hostel_id=$1 ORDER BY room_number', [req.params.hostelId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Error fetching rooms' }); }
};

exports.createRoom = async (req, res) => {
  const { hostel_id, room_number, room_type, is_available } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES ($1,$2,$3,$4) RETURNING *',
      [hostel_id, room_number, room_type, is_available === undefined ? true : is_available]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await pool.query('SELECT hostel_id FROM rooms WHERE id=$1', [req.params.id]);
    if (!room.rows.length) return res.status(404).json({ error: 'Room not found' });
    
    const booking = await pool.query('SELECT id FROM bookings WHERE room_id=$1 AND status != \'cancelled\'', [req.params.id]);
    if (booking.rows.length) return res.status(400).json({ error: 'Cannot delete room with active bookings' });

    await pool.query('DELETE FROM rooms WHERE id=$1', [req.params.id]);
    res.json({ message: 'Room deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
