const pool = require('./config/dbConfig');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('--- Database Migration Started ---');
    
    // 1. Add role column to users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'`);
    console.log('✓ Added "role" column to users table');

    // 2. Add UNIQUE constraint to email if not exists
    const dbNameResult = await pool.query('SELECT DATABASE() as db');
    const dbName = dbNameResult.rows[0].db;
    
    const checkUnique = await pool.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_email_key'
    `, [dbName]);
    
    if (parseInt(checkUnique.rows[0].count) === 0) {
      console.log('Adding UNIQUE constraint to email...');
      await pool.query(`ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)`);
      console.log('✓ Added UNIQUE constraint to email');
    }

    // 3. Hash admin password
    const hashedPass = await bcrypt.hash('3AppleDA@', 10);
    
    // 4. Insert admin user (upsert based on email)
    await pool.query(`
      INSERT INTO users (first_name, last_name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE role = 'admin', password = VALUES(password)
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
