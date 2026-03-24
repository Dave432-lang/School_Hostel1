const pool = require('../config/dbConfig');

const User = {
  /** Find a user by email */
  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  /** Find a user by ID */
  async findById(id) {
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  /** Create a new user */
  async create({ name, email, password, role = 'student' }) {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, password, role]
    );
    return rows[0];
  },
};

module.exports = User;
