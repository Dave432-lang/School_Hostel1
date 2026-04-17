const pool = require('./config/dbConfig');

async function migrate() {
  try {
    console.log('Adding password reset columns to users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP');
    console.log('✅ Migration successful - Database is ready for Phase 3.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
