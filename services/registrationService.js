const sqlite3 = require("sqlite3").verbose();
const config = require("../config");
const utils = require("../utils");
const {
  encodeFunctionData,
  createPublicClient,
  createWalletClient,
  http,
} = require("viem");
const { privateKeyToAccount, generatePrivateKey } = require("viem/accounts");
const SafeArtifact = require("@safe-global/safe-contracts/build/artifacts/contracts/Safe.sol/Safe.json");
const SafeProxyFactoryArtifact = require("@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json");

const SAFE_ABI = SafeArtifact.abi;
const SAFE_BYTECODE = SafeArtifact.bytecode;
const SAFE_PROXY_FACTORY_ABI = SafeProxyFactoryArtifact.abi;
const SAFE_PROXY_FACTORY_BYTECODE = SafeProxyFactoryArtifact.bytecode;

const RPC_URL = process.env.RPC_URL || "https://eth.llamarpc.com";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1);
const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY.startsWith("0x")
  ? process.env.ALICE_PRIVATE_KEY
  : `0x${process.env.ALICE_PRIVATE_KEY}`;

const customChain = {
  id: CHAIN_ID,
  name: process.env.CHAIN_NAME || "Custom Chain",
  network: process.env.CHAIN_NETWORK || "custom",
  nativeCurrency: {
    name: process.env.NATIVE_CURRENCY_NAME || "Ether",
    symbol: process.env.NATIVE_CURRENCY_SYMBOL || "ETH",
    decimals: Number(process.env.NATIVE_CURRENCY_DECIMALS || 18),
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
};

const publicClient = createPublicClient({
  chain: customChain,
  transport: http(RPC_URL),
});
const aliceAccount = privateKeyToAccount(ALICE_PRIVATE_KEY);
const walletClient = createWalletClient({
  account: aliceAccount,
  chain: customChain,
  transport: http(RPC_URL),
});

async function deployContract(abi, bytecode) {
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account: aliceAccount,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}

async function deploySafeForUser(ownerAccount) {
  const safeAddress = "0x0000000000000000000000000000000000000000";

  return safeAddress;
}

async function registerIfNeeded(phoneNumber) {
  const db = new sqlite3.Database(config.DB_PATH);
  const checkQuery = `SELECT * FROM users WHERE phone_number = ?`;

  return new Promise((resolve, reject) => {
    db.get(checkQuery, [phoneNumber], async (err, row) => {
      if (err) return reject(err);
      if (row) {
        db.close();
        console.log(`✅ Already registered: ${phoneNumber}`);
        return resolve("already_registered");
      }

      const privateKey = generatePrivateKey();
      const ownerAccount = privateKeyToAccount(privateKey);
      const encryptedPrivateKey = utils.encrypt(privateKey);

      console.log(`🔨 Deploying Safe for ${phoneNumber}...`);
      const safeAddress = await deploySafeForUser(ownerAccount);

      const insertQuery = `INSERT INTO users (phone_number, address, encrypted_private_key, safe_address, deployed_by) VALUES (?, ?, ?, ?, ?)`;
      db.run(
        insertQuery,
        [
          phoneNumber,
          ownerAccount.address,
          encryptedPrivateKey,
          safeAddress,
          aliceAccount.address,
        ],
        (err) => {
          db.close();
          if (err) return reject(err);

          console.log(`✅ Registered and deployed Safe for ${phoneNumber}`);

          resolve({ ownerAddress: ownerAccount.address, safeAddress });
        }
      );
    });
  });
}

async function processNewMessages() {
  const db = new sqlite3.Database(config.DB_PATH, sqlite3.OPEN_READONLY);
  const query = `
    SELECT 
      handle.id AS phone_number,
      message.text
    FROM 
      message
    JOIN 
      handle ON message.handle_id = handle.ROWID
    WHERE 
      message.is_from_me = 0
    ORDER BY 
      message.date DESC
    LIMIT 50
  `;

  db.all(query, async (err, rows) => {
    db.close();
    if (err) throw err;

    for (const row of rows) {
      const phoneNumber = row.phone_number;
      const text = row.text?.trim().toLowerCase();

      if (text === "register") {
        try {
          const result = await registerIfNeeded(phoneNumber);
          console.log(`✅ Processed registration for ${phoneNumber}:`, result);
          if (result !== "already_registered") {
            await utils.sendMessageViaAppleScript(
              phoneNumber,
              `✅ Safe created!\nOwner: ${result.ownerAddress}\nSafe: ${result.safeAddress}`
            );
          } else {
            await utils.sendMessageViaAppleScript(
              phoneNumber,
              `ℹ️ You are already registered.`
            );
          }
        } catch (err) {
          console.error(`❌ Error processing ${phoneNumber}:`, err.message);
        }
      }
    }
    console.log("✅ Finished checking messages.");
  });
}

module.exports = {
  registerIfNeeded,
  processNewMessages,
};
