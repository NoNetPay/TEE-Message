const db = require("../db");
const utils = require("../utils");
const {
  sendBalanceInfo,
  sendUsdcBalanceInfo,
  sendMintUsdcInfo,
  transfer,
} = require("../services/balanceService");
const { registerIfNeeded } = require("../services/registrationService");

let lastSeenTimestamp = 0;

async function pollMessagesAndProcess() {
  try {
    if (!utils.checkDatabaseExists()) return;

    // Get the most recent messages
    const rows = await db.getAllMessages(100, 0);
    const messages = utils.formatMessages(rows);

    let newMessagesProcessed = false;

    for (const row of messages) {
      const msg = row.text?.trim().toLowerCase();
      const ts = row.timestamp;

      // Only process messages newer than our last seen timestamp
      if (ts <= lastSeenTimestamp) continue;

      // Update the last seen timestamp for any new message
      if (ts > lastSeenTimestamp) {
        lastSeenTimestamp = ts;
        newMessagesProcessed = true;
      }

      if (msg === "register" && row.phoneNumber) {
        console.log("⏳ Registering new user:", row.phoneNumber);
        const receivedData = await registerIfNeeded(row.phoneNumber);
        console.log("receivedData", receivedData);

        if (receivedData !== "already_registered") {
          console.log("✅ Registration successful for:", row.phoneNumber);
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            `You are now registered.`
          );

          console.log(
            "✅ Sending registration message to user:",
            row.phoneNumber
          );
          const link = `https://blockscan.xyz/address/${receivedData.safeAddress}`;
          await utils.sendMessageViaAppleScript(row.phoneNumber, link);
        }
      } else if (msg === "balance" && row.phoneNumber) {
        console.log("💰 Checking ETH balance for user:", row.phoneNumber);
        await sendBalanceInfo(row.phoneNumber);
      } else if (msg === "usdc balance" && row.phoneNumber) {
        console.log("💵 Checking USDC balance for user:", row.phoneNumber);
        await sendUsdcBalanceInfo(row.phoneNumber);
      } else if (msg === "mint usdc" && row.phoneNumber) {
        console.log("💸 Minting USDC for user:", row.phoneNumber);
        await sendMintUsdcInfo(row.phoneNumber);
      } else if (
        msg.startsWith("mint") &&
        msg.includes("usdc") &&
        row.phoneNumber
      ) {
        console.log("Message contains mint command:", msg);
        const parts = msg.split(" ");
        const amountIndex = parts.findIndex((p) => p === "mint") + 1;
        const amount = parseFloat(parts[amountIndex]);

        if (!isNaN(amount) && amount > 0) {
          console.log(`💸 Minting ${amount} USDC for user:`, row.phoneNumber);
          await sendMintUsdcInfo(row.phoneNumber, amount);
        } else {
          console.log(`⚠️ Invalid mint amount from ${row.phoneNumber}`);
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "Invalid mint command. Use: mint 5 usdc"
          );
        }
      } else if (
        msg.startsWith("transfer") &&
        msg.includes("usdc") &&
        msg.includes("to") &&
        row.phoneNumber
      ) {
        console.log("Message contains transfer command:", msg);

        // Parse the transfer command
        // Expected format: "transfer 5 usdc to 0x..."
        const parts = msg.split(" ");
        const amountIndex = parts.findIndex((p) => p === "transfer") + 1;
        const amount = parseFloat(parts[amountIndex]);

        // Find the destination address (should be after "to")
        const toIndex = parts.findIndex((p) => p === "to") + 1;
        const destinationAddress =
          toIndex < parts.length ? parts[toIndex] : null;

        if (!isNaN(amount) && amount > 0 && destinationAddress) {
          console.log(
            `💸 Transferring ${amount} USDC to ${destinationAddress} for user:`,
            row.phoneNumber
          );
          console.log('destinationAddress', destinationAddress);
          console.log('amount', amount);
          console.log('row.phoneNumber', row.phoneNumber);
          await transfer(row.phoneNumber, destinationAddress, amount);
        } else {
          console.log(`⚠️ Invalid transfer command from ${row.phoneNumber}`);
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "Invalid transfer command. Use: transfer 5 usdc to 0x123..."
          );
        }
      }
    }

    if (newMessagesProcessed) {
      console.log(`Processed messages up to timestamp: ${lastSeenTimestamp}`);
    }
  } catch (err) {
    console.error("Error polling messages:", err.message);
  }
}

async function initializeLastSeen() {
  try {
    if (!utils.checkDatabaseExists()) return;

    const rows = await db.getAllMessages(1, 0);
    if (rows && rows.length > 0) {
      const messages = utils.formatMessages(rows);
      if (messages.length > 0) {
        // Set the initial lastSeenTimestamp to the most recent message
        lastSeenTimestamp = messages[0].timestamp;
        console.log(`Initialized last seen timestamp to: ${lastSeenTimestamp}`);
      }
    }
  } catch (err) {
    console.error("Error initializing last seen timestamp:", err.message);
  }
}

function startPolling(interval = 1000) {
  console.log("🛰️ Starting iMessage poller...");
  initializeLastSeen().then(() => {
    setInterval(pollMessagesAndProcess, interval);
  });
}

module.exports = { startPolling };
