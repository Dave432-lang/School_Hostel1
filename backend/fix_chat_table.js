const pool = require('./config/dbConfig');

async function fixChatTable() {
  console.log('Fixing chat_messages table...');
  try {
    // Check if 'chat' table exists but 'chat_messages' doesn't
    const tables = await pool.query("SHOW TABLES LIKE 'chat'");
    const newTables = await pool.query("SHOW TABLES LIKE 'chat_messages'");

    if (tables.rows.length > 0 && newTables.rows.length === 0) {
      console.log('🔄 Found old "chat" table. Renaming to "chat_messages"...');
      await pool.query('RENAME TABLE chat TO chat_messages');
      console.log('✅ Table successfully renamed');
    } else if (newTables.rows.length === 0) {
      console.log('🆕 Creating new "chat_messages" table...');
      await pool.query(`
        CREATE TABLE chat_messages (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          sender_id   INT NOT NULL,
          receiver_id INT NOT NULL,
          hostel_id   INT NOT NULL,
          message     TEXT NOT NULL,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (sender_id),
          INDEX (receiver_id),
          INDEX (hostel_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('✅ Created new chat_messages table');
    } else {
      console.log('✨ "chat_messages" table already exists. Checking for missing columns...');
      // Ensure columns are correct
      const cols = await pool.query('DESCRIBE chat_messages');
      const colNames = cols.rows.map(c => c.Field);
      if (!colNames.includes('sender_id')) {
         console.log('⚠️ Fixing old columns...');
         // Rename columns if they exist as 'user_id'
         if (colNames.includes('user_id')) {
           await pool.query('ALTER TABLE chat_messages CHANGE COLUMN user_id sender_id INT');
         }
      }
      console.log('✅ chat_messages table schema verified');
    }

    // Also check if notifications table exists, as it's used by chat
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        type        VARCHAR(50) NOT NULL,
        message     TEXT NOT NULL,
        target_url  VARCHAR(255),
        is_read     BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Verified notifications table');

    console.log('\n🎉 Chat system database fix complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing chat table:', err.message);
    process.exit(1);
  }
}

fixChatTable();
