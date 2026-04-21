const pool = require('../config/dbConfig');

const Booking = {
  /** Create a new booking */
  async create({ userId, hostelId, roomId, roomType, semester, academicYear }) {
    const result = await pool.query(
      `INSERT INTO bookings (user_id, hostel_id, room_id, room_type, semester, academic_year, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, hostelId, roomId || null, roomType, semester, academicYear]
    );
    return this.getById(result.insertId);
  },

  /** Get all bookings for a student (joined with hostel & room info) */
  async getByUserId(userId) {
    const { rows } = await pool.query(
      `SELECT b.*, h.name AS hostel_name, r.room_number
       FROM bookings b
       LEFT JOIN hostels h ON h.id = b.hostel_id
       LEFT JOIN rooms   r ON r.id = b.room_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return rows;
  },

  /** Get a single booking by ID */
  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** Update booking status */
  async updateStatus(id, status) {
    await pool.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, id]
    );
    return this.getById(id);
  },
};

module.exports = Booking;
