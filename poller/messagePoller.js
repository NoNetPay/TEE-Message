// poller/messagePoller.js
const db = require("../db");
const utils = require("../utils");
const {
  sendBalanceInfo,
  sendUsdcBalanceInfo,
  sendMintUsdcInfo,
  transfer,
} = require("../services/balanceService");

// Import NERO Chain AA services
const {
  registerIfNeeded,
  getUserWallet,
  getWalletStatus,
} = require("../services/registrationService");

const { NERO_CHAIN_CONFIG } = require("../utils/neroConfig");

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

      // Updated messagePoller.js - Fixed message formatting section

      // Handle registration with NERO Chain AA
      if (msg === "register" && row.phoneNumber) {
        console.log(
          "⏳ Registering new user with NERO Chain AA:",
          row.phoneNumber
        );

        try {
          const receivedData = await registerIfNeeded(row.phoneNumber);
          console.log("Registration result:", receivedData);

          if (receivedData !== "already_registered") {
            console.log(
              "✅ NERO AA Registration successful for:",
              row.phoneNumber
            );

            // Send registration confirmation with better formatting
            const registrationMessage =
              `🎉 Registration Successful!\n\n` +
              `Your Account Abstraction wallet is ready on ${NERO_CHAIN_CONFIG.chainName}.`;

            await utils.sendMessageViaAppleScript(
              row.phoneNumber,
              registrationMessage
            );

            // Send wallet details with proper line breaks and formatting
            const walletMessage =
              `🏦 Your Wallet Details:\n\n` +
              `💼 Wallet Address:\n${receivedData.aaWalletAddress}\n\n` +
              `📊 Status: ${
                receivedData.isCounterfactual
                  ? "Counterfactual (will deploy on first transaction)"
                  : "Deployed"
              }\n\n` +
              `🌐 Network: ${receivedData.network}\n\n` +
              `🔍 Explorer:\n${receivedData.explorerUrl}\n\n` +
              `📱 Available Commands:\n` +
              `• "wallet info" - Check status\n` +
              `• "balance" - Check NERO balance\n` +
              `• "usdc balance" - Check USDC balance\n` +
              `• "help" - Show all commands`;

            await utils.sendMessageViaAppleScript(
              row.phoneNumber,
              walletMessage
            );
          } else {
            const alreadyRegisteredMessage =
              `✅ You are already registered!\n\n` +
              `Send 'wallet info' to see your wallet details.`;

            await utils.sendMessageViaAppleScript(
              row.phoneNumber,
              alreadyRegisteredMessage
            );
          }
        } catch (error) {
          console.error("Registration failed:", error);
          const errorMessage =
            `❌ Registration Failed\n\n` +
            `Error: ${error.message}\n\n` +
            `Please try again or contact support.`;

          await utils.sendMessageViaAppleScript(row.phoneNumber, errorMessage);
        }
      }

      // Also fix the wallet info message formatting
      else if (msg === "wallet info" && row.phoneNumber) {
        console.log("📱 Getting wallet info for user:", row.phoneNumber);

        try {
          const walletStatus = await getWalletStatus(row.phoneNumber);

          const statusMessage =
            `🏦 Your Wallet Status:\n\n` +
            `💼 AA Wallet:\n${walletStatus.aaWalletAddress}\n\n` +
            `🔑 Signer:\n${walletStatus.signerAddress}\n\n` +
            `📊 Status: ${
              walletStatus.isDeployed ? "✅ Deployed" : "⏳ Counterfactual"
            }\n\n` +
            `💰 Balance: ${walletStatus.balance}\n\n` +
            `🌐 Network: ${walletStatus.network}\n\n` +
            `📅 Registered: ${new Date(
              walletStatus.registeredAt
            ).toLocaleString()}\n\n` +
            `🔍 Explorer:\n${walletStatus.explorerUrl}`;

          await utils.sendMessageViaAppleScript(row.phoneNumber, statusMessage);
        } catch (error) {
          console.error("Error getting wallet info:", error);
          const notRegisteredMessage =
            `❌ Not Registered\n\n` +
            `You are not registered yet.\n` +
            `Send 'register' to create your AA wallet.`;

          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            notRegisteredMessage
          );
        }
      }

      // Enhanced help message with better formatting
      else if (msg === "help" && row.phoneNumber) {
        const helpMessage =
          `🤖 NERO Chain Wallet Bot\n\n` +
          `📱 Available Commands:\n\n` +
          `🆕 "register" - Create your wallet\n` +
          `ℹ️  "wallet info" - Check wallet status\n` +
          `💰 "balance" - Check ${NERO_CHAIN_CONFIG.currency} balance\n` +
          `💵 "usdc balance" - Check USDC balance\n` +
          `🪙 "mint usdc" - Mint USDC tokens\n` +
          `🪙 "mint X usdc" - Mint X amount of USDC\n` +
          `💸 "transfer X usdc to 0x..." - Transfer USDC\n` +
          `❓ "help" - Show this message\n\n` +
          `🌐 Network: ${NERO_CHAIN_CONFIG.chainName}\n` +
          `🔗 Chain ID: ${NERO_CHAIN_CONFIG.chainId}`;

        await utils.sendMessageViaAppleScript(row.phoneNumber, helpMessage);
      }

      // Handle balance check
      else if (msg === "balance" && row.phoneNumber) {
        console.log("💰 Checking balance for user:", row.phoneNumber);

        try {
          const userData = getUserWallet(row.phoneNumber);
          if (!userData) {
            await utils.sendMessageViaAppleScript(
              row.phoneNumber,
              "❌ You are not registered. Send 'register' to create your wallet."
            );
            continue;
          }

          // You might want to modify sendBalanceInfo to work with NERO Chain
          // For now, we'll use the wallet status function
          const walletStatus = await getWalletStatus(row.phoneNumber);
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            `💰 Your ${NERO_CHAIN_CONFIG.currency} Balance: ${walletStatus.balance}`
          );
        } catch (error) {
          console.error("Error checking balance:", error);
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "❌ Failed to check balance. Please try again."
          );
        }
      }

      // Handle USDC balance check
      else if (msg === "usdc balance" && row.phoneNumber) {
        console.log("💵 Checking USDC balance for user:", row.phoneNumber);

        const userData = getUserWallet(row.phoneNumber);
        if (!userData) {
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "❌ You are not registered. Send 'register' to create your wallet."
          );
          continue;
        }

        // Note: You'll need to modify sendUsdcBalanceInfo to work with NERO Chain
        await sendUsdcBalanceInfo(row.phoneNumber);
      }

      // Handle USDC minting
      else if (msg === "mint usdc" && row.phoneNumber) {
        console.log("💸 Minting USDC for user:", row.phoneNumber);

        const userData = getUserWallet(row.phoneNumber);
        if (!userData) {
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "❌ You are not registered. Send 'register' to create your wallet."
          );
          continue;
        }

        await sendMintUsdcInfo(row.phoneNumber);
      }

      // Handle USDC minting with amount
      else if (
        msg.startsWith("mint") &&
        msg.includes("usdc") &&
        row.phoneNumber
      ) {
        console.log("Message contains mint command:", msg);

        const userData = getUserWallet(row.phoneNumber);
        if (!userData) {
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "❌ You are not registered. Send 'register' to create your wallet."
          );
          continue;
        }

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
            "❌ Invalid mint command. Use: mint 5 usdc"
          );
        }
      }

      // Handle USDC transfers
      else if (
        msg.startsWith("transfer") &&
        msg.includes("usdc") &&
        msg.includes("to") &&
        row.phoneNumber
      ) {
        console.log("Message contains transfer command:", msg);

        const userData = getUserWallet(row.phoneNumber);
        if (!userData) {
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "❌ You are not registered. Send 'register' to create your wallet."
          );
          continue;
        }

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
          console.log("destinationAddress", destinationAddress);
          console.log("amount", amount);
          console.log("row.phoneNumber", row.phoneNumber);

          // Note: You'll need to modify the transfer function to work with NERO AA wallets
          await transfer(row.phoneNumber, destinationAddress, amount);
        } else {
          console.log(`⚠️ Invalid transfer command from ${row.phoneNumber}`);
          await utils.sendMessageViaAppleScript(
            row.phoneNumber,
            "❌ Invalid transfer command. Use: transfer 5 usdc to 0x123..."
          );
        }
      }

      // Handle help command
      else if (msg === "help" && row.phoneNumber) {
        const helpMessage =
          `🤖 Available Commands:\n\n` +
          `• "register" - Create your wallet\n` +
          `• "wallet info" - Check wallet status\n` +
          `• "balance" - Check ${NERO_CHAIN_CONFIG.currency} balance\n` +
          `• "usdc balance" - Check USDC balance\n` +
          `• "mint usdc" - Mint USDC tokens\n` +
          `• "mint X usdc" - Mint X amount of USDC\n` +
          `• "transfer X usdc to 0x..." - Transfer USDC\n` +
          `• "help" - Show this message\n\n` +
          `Network: ${NERO_CHAIN_CONFIG.chainName}`;

        await utils.sendMessageViaAppleScript(row.phoneNumber, helpMessage);
      }
    }

    if (newMessagesProcessed) {
      console.log(
        `📨 Processed messages up to timestamp: ${lastSeenTimestamp}`
      );
    }
  } catch (err) {
    console.error("❌ Error polling messages:", err.message);
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
        console.log(
          `🕐 Initialized last seen timestamp to: ${lastSeenTimestamp}`
        );
      }
    }
  } catch (err) {
    console.error("❌ Error initializing last seen timestamp:", err.message);
  }
}

function startPolling(interval = 1000) {
  console.log("🛰️ Starting iMessage poller with NERO Chain integration...");
  console.log(
    `🌐 Network: ${NERO_CHAIN_CONFIG.chainName} (Chain ID: ${NERO_CHAIN_CONFIG.chainId})`
  );
  console.log(`🔗 RPC: ${NERO_CHAIN_CONFIG.rpcUrl}`);
  console.log(`📊 Explorer: ${NERO_CHAIN_CONFIG.explorer}`);

  initializeLastSeen().then(() => {
    setInterval(pollMessagesAndProcess, interval);
    console.log(`✅ Polling started with ${interval}ms interval`);
  });
}

module.exports = { startPolling };
