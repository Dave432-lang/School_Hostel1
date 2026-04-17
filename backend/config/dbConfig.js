const { Pool } = require('pg');

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'school_hostel1',
  password: process.env.DB_PASSWORD || '3AppleDA@',
  port:     process.env.DB_PORT     || 5432,
});

module.exports = pool; 
