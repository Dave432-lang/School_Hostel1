const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../backend/.env' });

const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'school_hostel1',
  password: 'root', // I'll assume standard password or check config
  port: 5432,
};

// Try to load from dbConfig if it exists
try {
  const dbConfig = require('../backend/config/dbConfig');
  Object.assign(config, dbConfig);
} catch (e) {}

const pool = new Pool(config);

async function migrate() {
  try {
    console.log('--- Database Migration Started ---');
    
    // 1. Add role column to users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'`);
    console.log('✓ Added "role" column to users table');

    // 2. Hash admin password
    const hashedPass = await bcrypt.hash('3AppleDA@', 10);
    
    // 3. Insert admin user (upsert based on email)
    await pool.query(`
      INSERT INTO users (first_name, last_name, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $4
    `, ['Admin', 'User', 'dagbanjadavid22@gmail.com', hashedPass, 'admin']);
    console.log('✓ Admin account created/updated: dagbanjadavid22@gmail.com');

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration Failed:', err.message);
    process.exit(1);
  }
}

migrate();
