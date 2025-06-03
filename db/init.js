const sqlite3 = require("sqlite3").verbose();
const config = require("../config");

const db = new sqlite3.Database(config.DB_PATH);

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE,
    address TEXT,
    encrypted_private_key TEXT
  );
`;

db.run(createUsersTable, (err) => {
  if (err) {
    console.error("❌ Failed to create users table:", err.message);
  } else {
    console.log("✅ users table is ready");
  }
  db.close();
});
