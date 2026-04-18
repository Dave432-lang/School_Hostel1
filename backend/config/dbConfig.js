const mysql = require('mysql2');

// Using the promise-based wrapper for async/await compatibility
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'school_hostel',
  port:     process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Provide a .query compatibility method similar to pg
module.exports = {
  query: async (sql, params) => {
    const [result] = await pool.promise().query(sql, params);
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length };
    }
    return { rows: [result], insertId: result.insertId, rowCount: result.affectedRows };
  },
  connect: async () => {
    const conn = await pool.promise().getConnection();
    // Wrap the connection to provide a PG-like .query() method
    return {
      query: async (sql, params) => {
        const [result] = await conn.query(sql, params);
        if (Array.isArray(result)) return { rows: result, rowCount: result.length };
        return { rows: [result], insertId: result.insertId, rowCount: result.affectedRows };
      },
      release: () => conn.release()
    };
  },
  pool: pool.promise()
};
