const pool = require('./config/dbConfig');

const images = {
  rooms: [
    'https://images.unsplash.com/photo-1522771731478-4422258aa314?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1000&auto=format&fit=crop'
  ],
  kitchens: [
    'https://images.unsplash.com/photo-1556911223-e4524a73936a?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1000&auto=format&fit=crop'
  ],
  washrooms: [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620626011761-9963d752148a?q=80&w=1000&auto=format&fit=crop'
  ]
};

async function seed() {
  try {
    console.log('--- Seeding Hostel Images ---');
    const res = await pool.query('SELECT id, name FROM hostels');
    for (const h of res.rows) {
      console.log(`Updating ${h.name}...`);
      await pool.query(
        'UPDATE hostels SET image_urls = $1 WHERE id = $2',
        [JSON.stringify(images), h.id]
      );
    }
    console.log('✅ Done! All hostels updated with mock images.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
