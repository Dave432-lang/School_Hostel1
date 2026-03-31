// migrate.js — Run once to add missing columns to existing tables
const pool = require('./config/dbConfig');

async function migrate() {
  try {
    console.log('Running migrations...');

    // Add is_available to rooms (if missing)
    await pool.query(`
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE
    `);
    console.log('✅ rooms.is_available added');

    // Add price_per_semester to hostels (if missing) — use existing price column value
    await pool.query(`
      ALTER TABLE hostels ADD COLUMN IF NOT EXISTS price_per_semester NUMERIC(10,2) DEFAULT 0
    `);
    console.log('✅ hostels.price_per_semester added');

    // Add status to bookings (if missing)
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    `);
    console.log('✅ bookings.status added');

    // Add created_at to bookings (if missing)
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ bookings.created_at added');

    // Set all existing rooms to available
    await pool.query(`UPDATE rooms SET is_available = TRUE`);
    console.log('✅ All rooms set to available');

    // Seed price_per_semester from rooms.price where hostel price is 0
    await pool.query(`
      UPDATE hostels h
      SET price_per_semester = COALESCE(
        (SELECT MIN(price) FROM rooms WHERE hostel_id = h.id), 0
      )
      WHERE price_per_semester = 0 OR price_per_semester IS NULL
    `);
    console.log('✅ hostels.price_per_semester seeded from rooms.price');

    console.log('\n🎉 Migration complete!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}
migrate();
