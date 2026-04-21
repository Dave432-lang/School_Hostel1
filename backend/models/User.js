const pool = require('../config/dbConfig');

const User = {
  /** Find a user by email */
  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  /** Find a user by ID */
  async findById(id) {
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** Create a new user */
  async create({ name, email, password, role = 'student' }) {
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    return this.findById(result.insertId);
  },
};

module.exports = User;
