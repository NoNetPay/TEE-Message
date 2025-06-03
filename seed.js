const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { 
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData
} = require("viem");
const { privateKeyToAccount, generatePrivateKey } = require("viem/accounts");
const SafeProxyFactoryArtifact = require('@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json');
const SafeArtifact = require('@safe-global/safe-contracts/build/artifacts/contracts/Safe.sol/Safe.json');

const SAFE_ABI = SafeArtifact.abi;
const SAFE_PROXY_FACTORY_ABI = SafeProxyFactoryArtifact.abi;
const SAFE_BYTECODE = SafeArtifact.bytecode;
const SAFE_PROXY_FACTORY_BYTECODE = SafeProxyFactoryArtifact.bytecode;

const RPC_URL = process.env.RPC_URL || "https://eth.llamarpc.com";
const CHAIN_ID = Number(process.env.CHAIN_ID || 1);

const customChain = {
  id: CHAIN_ID,
  name: process.env.CHAIN_NAME || "Custom Chain",
  network: process.env.CHAIN_NETWORK || "custom",
  nativeCurrency: {
    name: process.env.NATIVE_CURRENCY_NAME || "Ether",
    symbol: process.env.NATIVE_CURRENCY_SYMBOL || "ETH",
    decimals: Number(process.env.NATIVE_CURRENCY_DECIMALS || 18)
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  }
};

console.log(`🔗 Using chain with ID: ${CHAIN_ID}`);
console.log(`🔗 Using RPC URL: ${RPC_URL}`);

const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY;
if (!ALICE_PRIVATE_KEY) {
  console.error("❌ ALICE_PRIVATE_KEY not found in .env file");
  process.exit(1);
}
const formattedAlicePrivateKey = ALICE_PRIVATE_KEY.startsWith('0x') ? ALICE_PRIVATE_KEY : `0x${ALICE_PRIVATE_KEY}`;

const publicClient = createPublicClient({ chain: customChain, transport: http(RPC_URL) });
const aliceAccount = privateKeyToAccount(formattedAlicePrivateKey);
const walletClient = createWalletClient({ account: aliceAccount, chain: customChain, transport: http(RPC_URL) });

console.log("🔑 Alice account (deployer):", aliceAccount.address);

async function deployContract(abi, bytecode) {
  try {
    const hash = await walletClient.deployContract({ abi, bytecode, account: aliceAccount });
    console.log(`Deployment transaction hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt.contractAddress;
  } catch (error) {
    console.error(`❌ Error deploying contract:`, error);
    throw error;
  }
}

async function deploySafeForUser(phoneNumber) {
  try {
    console.log(`📱 Deploying Safe for ${phoneNumber}`);
    const privateKey = generatePrivateKey();
    console.log(`🔑 Generated private key: ${privateKey}`);
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const ownerAccount = privateKeyToAccount(formattedPrivateKey);
    console.log(`👤 Owner EOA address: ${ownerAccount.address}`);

    console.log("1. Deploying Safe implementation...");
    const safeImplementationAddress = await deployContract(SAFE_ABI, SAFE_BYTECODE);
    console.log(`✅ Safe implementation deployed at: ${safeImplementationAddress}`);

    console.log("2. Deploying Safe Proxy Factory...");
    const proxyFactoryAddress = await deployContract(SAFE_PROXY_FACTORY_ABI, SAFE_PROXY_FACTORY_BYTECODE);
    console.log(`✅ Safe Proxy Factory deployed at: ${proxyFactoryAddress}`);

    console.log("3. Creating Safe Proxy with owner:", ownerAccount.address);

    const owners = [ownerAccount.address];
    const threshold = 1n;
    const to = "0x0000000000000000000000000000000000000000";
    const data = "0x";
    const fallbackHandler = "0x0000000000000000000000000000000000000000";
    const paymentToken = "0x0000000000000000000000000000000000000000";
    const payment = 0n;
    const paymentReceiver = "0x0000000000000000000000000000000000000000";

    const setupCalldata = encodeFunctionData({
      abi: SAFE_ABI,
      functionName: 'setup',
      args: [owners, threshold, to, data, fallbackHandler, paymentToken, payment, paymentReceiver]
    });

    console.log("Setup calldata:", setupCalldata);
    const saltNonce = BigInt(Date.now());

    const gasEstimate = await publicClient.estimateContractGas({
      address: proxyFactoryAddress,
      abi: SAFE_PROXY_FACTORY_ABI,
      functionName: 'createProxyWithNonce',
      args: [safeImplementationAddress, setupCalldata, saltNonce],
      account: aliceAccount.address
    });

    console.log(`Gas estimate for createProxyWithNonce: ${gasEstimate}`);

    const createProxyTx = await walletClient.writeContract({
      address: proxyFactoryAddress,
      abi: SAFE_PROXY_FACTORY_ABI,
      functionName: 'createProxyWithNonce',
      args: [safeImplementationAddress, setupCalldata, saltNonce],
      gas: gasEstimate + BigInt(50000)
    });

    console.log(`Proxy creation transaction hash: ${createProxyTx}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createProxyTx });

    const safeAddress = receipt.logs && receipt.logs.length > 0 ? receipt.logs[0].address : null;
    if (!safeAddress) throw new Error("Failed to extract Safe address from transaction receipt");

    console.log(`✅ Safe deployed at: ${safeAddress}`);

    const usersFile = path.join(__dirname, 'users.json');
    const encrypt = text => Buffer.from(text).toString('base64');

    let usersData = [];
    if (fs.existsSync(usersFile)) {
      const rawData = fs.readFileSync(usersFile);
      usersData = JSON.parse(rawData);
    }

    const userRecord = {
      phone_number: phoneNumber,
      address: ownerAccount.address,
      encrypted_private_key: encrypt(privateKey),
      safe_address: safeAddress,
      deployed_by: aliceAccount.address
    };

    usersData.push(userRecord);
    fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));
    console.log(`✅ User saved to users.json`);

    return {
      ownerAddress: ownerAccount.address,
      safeAddress,
      privateKey
    };
  } catch (error) {
    console.error("❌ Error in deploySafeForUser:", error);
    throw error;
  }
}

async function main() {
  try {
    const phoneNumber = process.argv[2] || "+91 9967490617";
    console.log(`Starting Safe deployment for ${phoneNumber}...`);

    const result = await deploySafeForUser(phoneNumber);
    console.log("🎉 Deployment completed successfully!");
    console.log("=== SAVE THIS INFORMATION ===");
    console.log(`Phone Number: ${phoneNumber}`);
    console.log(`Owner Address: ${result.ownerAddress}`);
    console.log(`Private Key: ${result.privateKey}`);
    console.log(`Safe Address: ${result.safeAddress}`);
    console.log("===========================");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
