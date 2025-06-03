const crypto = require("crypto");
const config = require("../config");
const ENCRYPTION_KEY = config.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Custom replacer function for JSON.stringify (recommended approach)
function stringifyWithBigInt(obj) {
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
}

// Custom parser for JSON.parse to convert strings back to BigInt
function parseWithBigInt(json, bigIntProps = []) {
  return JSON.parse(json, (key, value) => {
    // Check if the property is in our list of BigInt properties
    // or if it's a string that looks like a BigInt (only digits)
    if (
      (bigIntProps.includes(key) || 
      (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15)) 
      && value !== null
    ) {
      return BigInt(value);
    }
    return value;
  });
}

module.exports = {
  encrypt,
  decrypt,
  stringifyWithBigInt,
  parseWithBigInt,
};

