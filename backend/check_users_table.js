const pool = require('./config/dbConfig');

async function check() {
  try {
    const res = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'users'
    `);
    console.log('--- Indexes for "users" ---');
    console.table(res.rows);
    
    const constraints = await pool.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass
    `);
    console.log('--- Constraints for "users" ---');
    console.table(constraints.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

check();
