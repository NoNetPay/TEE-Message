const fs = require("fs");
const config = require("../config");
const { exec } = require("child_process");
const path = require("path");
const crypto = require("crypto");

const SCRIPTS_DIR = path.join(__dirname, "..", "scripts");

// Create scripts directory if it doesn't exist
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

const APPLESCRIPT_SEND_UI_PATH = path.join(SCRIPTS_DIR, "send_message_ui.applescript");

const sendMessageViaAppleScript = (phoneNumber, message) => {
  return new Promise((resolve, reject) => {
    exec(
      `osascript "${APPLESCRIPT_SEND_UI_PATH}" "${phoneNumber}" "${message}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("Error sending message:", error);
          return reject(new Error(`Failed to send message: ${stderr}`));
        }
        resolve(stdout);
      }
    );
  });
};

const createSendMessageUIScript = () => {
  const script = `
  -- Fixed UI-Based SMS Sending Script
  -- This script correctly handles the Messages app interface
  
  on run argv
    if (count of argv) < 2 then
      return "Error: Required parameters are missing. Usage: osascript send_message_ui.applescript phoneNumber message"
    end if
    
    set recipientNumber to item 1 of argv
    set messageText to item 2 of argv
    
    tell application "Messages"
      activate
      delay 1
    end tell
    
    tell application "System Events"
      tell process "Messages"
        -- Create a new message with Command+N
        keystroke "n" using {command down}
        delay 1
        
        -- Type the recipient number
        keystroke recipientNumber
        delay 1

        keystroke return
        
        -- Press Tab to move to the message field
        keystroke tab
        delay 0.5
        
        -- Type the message text
        keystroke messageText
        delay 0.5
        
        -- Send the message with Return
        keystroke return
        
        -- Wait a moment to ensure it's sent
        delay 1
      end tell
    end tell
    
    return "Message sent to " & recipientNumber & " using UI automation"
  end run
  `;

  fs.writeFileSync(APPLESCRIPT_SEND_UI_PATH, script);
  console.log("✅ Created UI-based send message script at:", APPLESCRIPT_SEND_UI_PATH);
};

const validatePhoneNumber = (phoneNumber) => {
  return /^\+?[0-9]+$/.test(phoneNumber);
};

const checkDatabaseExists = () => {
  return fs.existsSync(config.DB_PATH);
};

const formatMessages = (rows) => {
  return rows.map((row) => ({
    id: row.message_id,
    timestamp: row.timestamp,
    date: row.date_formatted,
    text: row.text || null,
    phoneNumber: row.phone_number || null,
    direction: row.is_from_me ? "outgoing" : "incoming",
    contact: {
      name: row.display_name || null,
    },
  }));
};

// --- 🔐 ENCRYPTION UTILS ---

const ENCRYPTION_KEY = config.ENCRYPTION_KEY; // must be 32 bytes
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

const decrypt = (encryptedText) => {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
};

module.exports = {
  validatePhoneNumber,
  checkDatabaseExists,
  formatMessages,
  createSendMessageUIScript,
  sendMessageViaAppleScript,
  encrypt,
  decrypt,
};
