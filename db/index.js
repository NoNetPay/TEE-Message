const sqlite3 = require("sqlite3").verbose();
const config = require("../config");

const getMessagesQuery = `
  SELECT 
    message.ROWID as message_id,
    datetime(message.date/1000000000 + 978307200, 'unixepoch', 'localtime') as date_formatted,
    message.text, 
    message.is_from_me,
    chat.display_name,
    message.date as timestamp
  FROM 
    message 
  JOIN 
    chat_message_join ON message.ROWID = chat_message_join.message_id
  JOIN
    chat ON chat_message_join.chat_id = chat.ROWID
  JOIN 
    handle ON message.handle_id = handle.ROWID 
  WHERE 
    handle.id = ?
  ORDER BY 
    message.date ASC
`;

const getAllMessagesQuery = `
  SELECT 
    message.ROWID as message_id,
    datetime(message.date/1000000000 + 978307200, 'unixepoch', 'localtime') as date_formatted,
    message.text, 
    message.is_from_me,
    chat.display_name,
    handle.id as phone_number,
    message.date as timestamp
  FROM 
    message 
  JOIN 
    chat_message_join ON message.ROWID = chat_message_join.message_id
  JOIN
    chat ON chat_message_join.chat_id = chat.ROWID
  LEFT JOIN 
    handle ON message.handle_id = handle.ROWID 
  ORDER BY 
    message.date DESC
  LIMIT ? OFFSET ?
`;

const getMessagesByPhoneNumber = (phoneNumber) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(
      config.DB_PATH,
      sqlite3.OPEN_READONLY,
      (err) => {
        if (err) {
          return reject(err);
        }

        db.all(getMessagesQuery, [phoneNumber], (err, rows) => {
          db.close();

          if (err) {
            return reject(err);
          }

          resolve(rows);
        });
      }
    );
  });
};

const getAllMessages = (limit = 100, offset = 0) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(
      config.DB_PATH,
      sqlite3.OPEN_READONLY,
      (err) => {
        if (err) {
          return reject(err);
        }

        db.all(getAllMessagesQuery, [limit, offset], (err, rows) => {
          db.close();

          if (err) {
            return reject(err);
          }

          resolve(rows);
        });
      }
    );
  });
};

module.exports = {
  getMessagesByPhoneNumber,
  getAllMessages,
};
