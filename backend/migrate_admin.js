const pool = require('./config/dbConfig');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('--- Database Migration Started ---');
    
    // 1. Add role column to users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'`);
    console.log('✓ Added "role" column to users table');

    // 2. Add UNIQUE constraint to email if not exists
    // We try to add it, but first check if it exists
    const checkUnique = await pool.query(`
      SELECT count(*) FROM pg_indexes 
      WHERE tablename = 'users' AND indexname = 'users_email_key'
    `);
    
    if (parseInt(checkUnique.rows[0].count) === 0) {
      console.log('Adding UNIQUE constraint to email...');
      // To add a unique constraint, all existing emails must be unique. 
      // If there are duplicates, this might fail, but we'll assume it's clean for now.
      await pool.query(`ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)`);
      console.log('✓ Added UNIQUE constraint to email');
    }

    // 3. Hash admin password
    const hashedPass = await bcrypt.hash('3AppleDA@', 10);
    
    // 4. Insert admin user (upsert based on email)
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
