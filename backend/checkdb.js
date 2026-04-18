const pool = require('./config/dbConfig');
async function check() {
  try {
    const rooms = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rooms' ORDER BY ordinal_position"
    );
    console.log('=== ROOMS columns ===');
    rooms.rows.forEach(r => console.log(' ', r.column_name, ':', r.data_type));

    const hostels = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hostels' ORDER BY ordinal_position"
    );
    console.log('=== HOSTELS columns ===');
    hostels.rows.forEach(r => console.log(' ', r.column_name, ':', r.data_type));

    const users = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('=== USERS columns ===');
    users.rows.forEach(r => console.log(' ', r.column_name, ':', r.data_type));

    const h = await pool.query('SELECT * FROM hostels LIMIT 2');
    console.log('=== HOSTELS rows ===');
    h.rows.forEach(r => console.log('  ', JSON.stringify(r)));

  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
check();
