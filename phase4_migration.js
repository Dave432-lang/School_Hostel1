/* phase4_migration.js — Adding coordinates, waitlist, and manager roles */
const pool = require('./backend/config/dbConfig');

async function migrate() {
  try {
    console.log('--- Phase 4 Database Migration Started ---');
    
    // 1. Add columns to hostels table
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS manager_id INT REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
    console.log('✓ Added columns to hostels table');

    // 2. Create waitlist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created waitlist table');

    // 3. Create chat_messages table if it does not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        sender VARCHAR(20) NOT NULL, -- 'student' or 'admin/manager'
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Ensured chat_messages table exists');

    // 4. Seed coordinates for some well-known hostels (sample data around a campus)
    // Centered around 5.65, -0.18 (Legon area)
    const seedCoords = [
      { name: 'Evandy Hostel', lat: 5.6565, lng: -0.1985 },
      { name: 'Bani Hostel',   lat: 5.6508, lng: -0.1963 },
      { name: 'Elizabeth Sey', lat: 5.6601, lng: -0.1874 },
      { name: 'Jean Nelson',   lat: 5.6582, lng: -0.1852 },
      { name: 'Limann Hall',   lat: 5.6625, lng: -0.1895 }
    ];

    for (let h of seedCoords) {
      await pool.query(
        'UPDATE hostels SET latitude=$1, longitude=$2 WHERE name LIKE $3',
        [h.lat, h.lng, '%' + h.name + '%']
      );
    }
    console.log('✓ Seeded sample coordinates for hostels');

    console.log('--- Phase 4 Migration Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration Failed:', err.message);
    process.exit(1);
  }
}

migrate();
