const pool = require('../config/dbConfig');

const Room = {
  /** Get all rooms for a hostel */
  async getByHostelId(hostelId) {
    const { rows } = await pool.query(
      'SELECT * FROM rooms WHERE hostel_id = ? ORDER BY room_number',
      [hostelId]
    );
    return rows;
  },

  /** Get an available room of a given type in a hostel */
  async getAvailable(hostelId, roomType) {
    const { rows } = await pool.query(
      `SELECT * FROM rooms
       WHERE hostel_id = ? AND room_type = ? AND is_available = true
       LIMIT 1`,
      [hostelId, roomType]
    );
    return rows[0] || null;
  },

  /** Mark a room as unavailable (booked) */
  async markUnavailable(roomId) {
    await pool.query('UPDATE rooms SET is_available = false WHERE id = ?', [roomId]);
  },

  /** Mark a room as available (cancellation) */
  async markAvailable(roomId) {
    await pool.query('UPDATE rooms SET is_available = true WHERE id = ?', [roomId]);
  },
};

module.exports = Room;
