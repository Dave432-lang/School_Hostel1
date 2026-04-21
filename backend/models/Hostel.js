const pool = require('../config/dbConfig');

const Hostel = {
  /** Get all hostels with room availability count */
  async getAll({ type, gender } = {}) {
    let query = `
      SELECT 
        h.*,
        SUM(CASE WHEN r.is_available = true THEN 1 ELSE 0 END) AS available_rooms
      FROM hostels h
      LEFT JOIN rooms r ON r.hostel_id = h.id
      WHERE 1=1
    `;
    const params = [];
    if (type)   { params.push(type);   query += ` AND h.type = ?`; }
    if (gender) { params.push(gender); query += ` AND h.gender = ?`; }
    query += ' GROUP BY h.id ORDER BY h.name';

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /** Get a single hostel with its rooms */
  async getById(id) {
    const hostelQuery = await pool.query('SELECT * FROM hostels WHERE id = ?', [id]);
    if (!hostelQuery.rows.length) return null;

    const hostel = hostelQuery.rows[0];
    const rooms  = await pool.query('SELECT * FROM rooms WHERE hostel_id = ? ORDER BY room_number', [id]);
    hostel.rooms = rooms.rows;
    return hostel;
  },
};

module.exports = Hostel;
