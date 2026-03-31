const pool = require('./config/dbConfig');

async function migrate() {
  try {
    console.log('Running migration 4...');

    // Users
    try {
      await pool.query(`ALTER TABLE users RENAME COLUMN name TO first_name`);
      console.log('✅ users.name renamed to first_name');
    } catch (e) { console.log('⚠️ users.name already renamed or missing'); }

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS student_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS programme VARCHAR(150),
      ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20)
    `);
    console.log('✅ Users table extended');

    // Hostels
    await pool.query(`
      ALTER TABLE hostels
      ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '{"rooms":[],"washrooms":[],"kitchens":[]}'
    `);
    console.log('✅ Hostels table extended');

    // Bookings
    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS semester VARCHAR(50),
      ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Bookings table extended');

    // Reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id         SERIAL PRIMARY KEY,
        hostel_id  INT  NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        user_name  VARCHAR(150) NOT NULL,
        rating     INT  CHECK (rating >= 1 AND rating <= 5),
        comment    TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Reviews table created');

    // Seeding 8 diverse hostels
    console.log('Seeding 8 Hostels...');
    const seedHostelsData = [
      { name: 'Crystal Rose Hostel', location: 'Ayeduase', desc: 'Premium private hostel with top-notch security.', type: 'private', gender: 'mixed', price: 4500, rating: 4.8,
        amenities: JSON.stringify(['Wi-Fi', 'AC', 'Shuttle', 'Study Room', 'Security']),
        images: JSON.stringify({rooms:['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80'], washrooms:['https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=400&q=80'], kitchens:['https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80']})
      },
      { name: 'Evandy Hostel', location: 'Bomso', desc: 'Affordable traditional setting off-campus.', type: 'traditional', gender: 'mixed', price: 2800, rating: 4.0,
        amenities: JSON.stringify(['Study Room', 'Water Supply', 'Security']),
        images: JSON.stringify({rooms:['https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80'], washrooms:[], kitchens:[]})
      },
      { name: 'Queens Hall', location: 'On Campus', desc: 'Female only traditional hall on campus.', type: 'traditional', gender: 'female only', price: 1500, rating: 4.2,
        amenities: JSON.stringify(['Study Room', 'Library', 'Dining']),
        images: JSON.stringify({rooms:['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=400&q=80'], washrooms:[], kitchens:[]})
      },
      { name: 'Unity Hall (Conti)', location: 'On Campus', desc: 'Male only traditional hall on campus.', type: 'traditional', gender: 'male only', price: 1500, rating: 4.5,
        amenities: JSON.stringify(['Gym', 'Study Room', 'Sports Field']),
        images: JSON.stringify({rooms:['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80'], washrooms:[], kitchens:[]})
      },
      { name: 'GUSSS Hostel', location: 'On Campus', desc: 'Private-style hostel managed by the university.', type: 'private', gender: 'mixed', price: 3500, rating: 4.6,
        amenities: JSON.stringify(['AC', 'Study Room', 'En-suite']),
        images: JSON.stringify({rooms:['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&q=80'], washrooms:[], kitchens:[]})
      },
      { name: 'Frontline Inn', location: 'Kotei', desc: 'Quiet, premium private hostel.', type: 'private', gender: 'mixed', price: 4000, rating: 4.3,
        amenities: JSON.stringify(['Wi-Fi', 'AC', 'Security']),
        images: JSON.stringify({rooms:[], washrooms:[], kitchens:[]})
      },
      { name: 'Dr. Mensah Hostel', location: 'Ayigya', desc: 'Female only private hostel.', type: 'private', gender: 'female only', price: 3000, rating: 4.1,
        amenities: JSON.stringify(['Security', 'Water Supply']),
        images: JSON.stringify({rooms:[], washrooms:[], kitchens:[]})
      },
      { name: 'SRC Hostel', location: 'On Campus', desc: 'Affordable on-campus accommodation.', type: 'traditional', gender: 'mixed', price: 2000, rating: 3.9,
        amenities: JSON.stringify(['Study Room', 'Library', 'Security']),
        images: JSON.stringify({rooms:[], washrooms:[], kitchens:[]})
      }
    ];

    const { rows } = await pool.query('SELECT COUNT(*) FROM hostels');
    if (parseInt(rows[0].count) < 8) {
      for (const h of seedHostelsData) {
        await pool.query(
          `INSERT INTO hostels (name, location, description, type, gender, price_per_semester, rating, amenities, image_urls)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [h.name, h.location, h.desc, h.type, h.gender, h.price, h.rating, h.amenities, h.images]
        );
      }
      console.log('✅ 8 Hostels seeded');
      
      const newHostels = await pool.query('SELECT id FROM hostels ORDER BY id DESC LIMIT 8');
      for (const nh of newHostels.rows) {
        for (let r=1; r<=5; r++) {
          try {
            await pool.query(`INSERT INTO rooms (hostel_id, room_number, room_type, is_available) VALUES ($1,$2,$3,TRUE)`,
              [nh.id, `Room ${r}`, r % 2 === 0 ? 'double' : 'single']
            );
          } catch(e) {}
        }
      }
    } else {
      console.log('ℹ️ Hostels already exist, skipping seed. (You can truncate to reset)');
    }

    console.log('\n🎉 Migration 4 complete!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}
migrate();
