const db = require('./config/dbConfig.js');

async function run() {
  try {
    // Check if columns exist
    const { rows: cols } = await db.query("SHOW COLUMNS FROM hostels LIKE 'latitude'");
    if (cols.length === 0) {
      console.log('Adding latitude and longitude columns...');
      await db.query("ALTER TABLE hostels ADD COLUMN latitude DECIMAL(10, 8)");
      await db.query("ALTER TABLE hostels ADD COLUMN longitude DECIMAL(11, 8)");
    } else {
      console.log('Columns already exist.');
    }

    // Populate with some default data based on ID to scatter them slightly around Legon
    const { rows: hostels } = await db.query("SELECT id FROM hostels WHERE latitude IS NULL OR longitude IS NULL");
    console.log(`Found ${hostels.length} hostels needing coordinates.`);
    
    // Legon coordinates: 5.6508, -0.1963
    let i = 0;
    for (const h of hostels) {
      // add small offsets
      const lat = (5.6508 + (Math.random() - 0.5) * 0.02).toFixed(6);
      const lng = (-0.1963 + (Math.random() - 0.5) * 0.02).toFixed(6);
      await db.query("UPDATE hostels SET latitude = ?, longitude = ? WHERE id = ?", [lat, lng, h.id]);
      i++;
    }
    console.log(`Updated ${i} hostels.`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
