const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'school_hostel1',
  password: '3AppleDA@',
  port: 5432,
});

module.exports = pool; 
