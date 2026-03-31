// migrate2.js — Add payment and contact columns
const pool = require('./config/dbConfig');

async function migrate() {
  console.log('Running payment & contact migration...');
  try {
    // Hostel contact fields
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL`);
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL`);
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20) DEFAULT NULL`);
    await pool.query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150) DEFAULT NULL`);
    console.log('✅ Contact columns added to hostels');

    // Booking payment fields
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) DEFAULT NULL`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0`);
    console.log('✅ Payment columns added to bookings');

    // Seed contact details for existing hostels
    const hostels = await pool.query('SELECT id, name FROM hostels ORDER BY id');
    const contacts = [
      { phone: '0244000001', email: 'akwaba@school.edu.gh',    whatsapp: '0244000001', manager: 'Mrs. Abena Asante'   },
      { phone: '0244000002', email: 'kotoka@school.edu.gh',    whatsapp: '0244000002', manager: 'Mr. Kwame Mensah'    },
      { phone: '0244000003', email: 'unity@school.edu.gh',     whatsapp: '0244000003', manager: 'Ms. Afia Boateng'    },
      { phone: '0244000004', email: 'executive@school.edu.gh', whatsapp: '0244000004', manager: 'Mr. Kofi Agyeman'    },
      { phone: '0244000005', email: 'sankofa@school.edu.gh',   whatsapp: '0244000005', manager: 'Mr. Nana Yeboah'     },
    ];
    for (let i = 0; i < hostels.rows.length; i++) {
      const c = contacts[i] || contacts[0];
      await pool.query(
        `UPDATE hostels SET phone=$1, email=$2, whatsapp=$3, manager_name=$4 WHERE id=$5`,
        [c.phone, c.email, c.whatsapp, c.manager, hostels.rows[i].id]
      );
    }
    console.log('✅ Contact details seeded for', hostels.rows.length, 'hostels');
    console.log('\n🎉 Migration 2 complete!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}
migrate();
