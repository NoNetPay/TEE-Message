require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH: process.env.DB_PATH || "./data/messages.db",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};
