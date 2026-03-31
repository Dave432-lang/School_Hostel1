// migrate3.js — Chat messages table + hostel coordinates
const pool = require('./config/dbConfig');

async function migrate() {
  console.log('Running migration 3...');
  try {
    // Chat messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id         SERIAL PRIMARY KEY,
        user_id    INT  REFERENCES users(id) ON DELETE CASCADE,
        hostel_id  INT  REFERENCES hostels(id) ON DELETE CASCADE,
        sender     VARCHAR(10)  NOT NULL DEFAULT 'student',
        message    TEXT         NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ chat_messages table created');

    // Hostel map coordinates
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7) DEFAULT NULL`);
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7) DEFAULT NULL`);
    console.log('✅ hostels lat/lng columns added');

    // Seed coordinates — around KNUST campus, Kumasi, Ghana
    const hostels = await pool.query('SELECT id FROM hostels ORDER BY id');
    const coords  = [
      { lat: 6.6744, lng: -1.5716 },
      { lat: 6.6752, lng: -1.5708 },
      { lat: 6.6731, lng: -1.5730 },
      { lat: 6.6760, lng: -1.5695 },
      { lat: 6.6720, lng: -1.5745 },
    ];
    for (let i = 0; i < hostels.rows.length; i++) {
      const c = coords[i] || coords[0];
      await pool.query(
        'UPDATE hostels SET latitude=$1, longitude=$2 WHERE id=$3',
        [c.lat, c.lng, hostels.rows[i].id]
      );
    }
    console.log('✅ Hostel coordinates seeded');
    console.log('\n🎉 Migration 3 complete!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}
migrate();
