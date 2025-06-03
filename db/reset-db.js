const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

const db = new sqlite3.Database(config.DB_PATH);

db.serialize(() => {
  console.log('⚠️  Dropping existing users table if it exists...');
  db.run(`DROP TABLE IF EXISTS users`, (err) => {
    if (err) {
      console.error('❌ Failed to drop table:', err.message);
    } else {
      console.log('✅ Dropped existing users table.');
    }
  });

  console.log('⚙️  Creating new users table...');
  db.run(
    `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      safe_address TEXT NOT NULL,
      deployed_by TEXT NOT NULL
    )
    `,
    (err) => {
      if (err) {
        console.error('❌ Failed to create table:', err.message);
      } else {
        console.log('✅ Users table created successfully.');
      }
    }
  );
});

db.close(() => {
  console.log('🔒 Database connection closed.');
});
