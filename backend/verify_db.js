require('dotenv').config();
const pool = require('./config/dbConfig');

async function verifyDB() {
  console.log('🔍 Auditing Database Schema...');
  const tables = [
    'users', 'hostels', 'rooms', 'bookings', 'reviews', 
    'notifications', 'waitlist', 'chat_messages'
  ];

  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
      if (res.rows[0].exists) {
        console.log(`✅ Table '${table}' exists.`);
        // Check columns for key tables
        if (table === 'hostels') {
          const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'hostels'`);
          const colNames = cols.rows.map(c => c.column_name);
          const required = ['name', 'location', 'image_urls', 'manager_id'];
          required.forEach(r => {
            if (colNames.includes(r)) console.log(`   - Column '${r}' found.`);
            else console.error(`   ❌ Missing column '${r}' in 'hostels'`);
          });
        }
      } else {
        console.error(`❌ Table '${table}' is MISSING!`);
      }
    } catch (err) {
      console.error(`❌ Error checking table '${table}':`, err.message);
    }
  }
  pool.end();
}

verifyDB();
