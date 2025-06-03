const walletUtils = require("../utils/walletUtils");
const utils = require("../utils");
const sqlite3 = require("sqlite3").verbose();
const config = require("../config");
const chain = require("../utils/chains");
const {
  formatEther,
  formatUnits,
  parseEther,
  createWalletClient,
  http,
  encodeFunctionData,
} = require("viem");
const helper = require("../utils/helper");
const { privateKeyToAccount } = require("viem/accounts");
require("dotenv").config();

const SafeProxyFactoryArtifact = require('@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json');
const SafeArtifact = require('@safe-global/safe-contracts/build/artifacts/contracts/Safe.sol/Safe.json');

const SAFE_ABI = [
  {
    inputs: [],
    name: "nonce",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" }
    ],
    name: "getTransactionHash",
    outputs: [{ type: "bytes32", name: "" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "bytes", name: "signatures" }
    ],
    name: "execTransaction",
    outputs: [{ type: "bool", name: "success" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getOwners",
    outputs: [{ type: "address[]", name: "" }],
    stateMutability: "view",
    type: "function"
  }
];
const SAFE_PROXY_FACTORY_ABI = SafeProxyFactoryArtifact.abi;
const SAFE_BYTECODE = SafeArtifact.bytecode;
const SAFE_PROXY_FACTORY_BYTECODE = SafeProxyFactoryArtifact.bytecode;

const USDC_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "ECDSAInvalidSignature",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "length",
        type: "uint256",
      },
    ],
    name: "ECDSAInvalidSignatureLength",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "ECDSAInvalidSignatureS",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "allowance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "ERC2612ExpiredSignature",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "signer",
        type: "address",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "ERC2612InvalidSigner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "currentNonce",
        type: "uint256",
      },
    ],
    name: "InvalidAccountNonce",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidShortString",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "str",
        type: "string",
      },
    ],
    name: "StringTooLong",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [],
    name: "EIP712DomainChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      {
        internalType: "bytes1",
        name: "fields",
        type: "bytes1",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "version",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifyingContract",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "salt",
        type: "bytes32",
      },
      {
        internalType: "uint256[]",
        name: "extensions",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const USDC_ADDRESS = "0xa3B2a0D85A9A4e4d19880ccB9622b1cA4f3C6690";
const publicClient = walletUtils.publicClient;

async function getUSDCBalance(address) {
  try {
    const usdcBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address],
    });

    // USDC has 6 decimals
    return usdcBalance;
  } catch (error) {
    console.error("Error fetching USDC balance:", error.message);
    return "0"; // Return 0 as string in case of error
  }
}

async function sendMintUsdcInfo(phoneNumber, givenAmount) {
  const dbConn = new sqlite3.Database(config.DB_PATH);
  const getUser = `SELECT address, encrypted_private_key, safe_address FROM users WHERE phone_number = ?`;

  return new Promise((resolve, reject) => {
    dbConn.get(getUser, [phoneNumber], async (err, row) => {
      dbConn.close();

      if (err) return reject(err);

      if (!row) {
        try {
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            "You don't have a registered wallet. Text 'register' to create one."
          );
          return resolve();
        } catch (sendErr) {
          return reject(sendErr);
        }
      }

      const safeAddress = row.safe_address;
      console.log("safeAddress", safeAddress);

      //   throw new Error("Minting USDC is not allowed for this address.");

      const RPC_URL = process.env.RPC_URL || "https://eth.llamarpc.com";
      const CHAIN_ID = Number(process.env.CHAIN_ID || 1);

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

      console.log(`🔗 Using chain with ID: ${CHAIN_ID}`);
      console.log(`🔗 Using RPC URL: ${RPC_URL}`);

      const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY;
      if (!ALICE_PRIVATE_KEY) {
        console.error("❌ ALICE_PRIVATE_KEY not found in .env file");
        process.exit(1);
      }
      const formattedAlicePrivateKey = ALICE_PRIVATE_KEY.startsWith("0x")
        ? ALICE_PRIVATE_KEY
        : `0x${ALICE_PRIVATE_KEY}`;

      const aliceAccount = privateKeyToAccount(formattedAlicePrivateKey);
      const walletClient = createWalletClient({
        account: aliceAccount,
        chain: customChain,
        transport: http(RPC_URL),
      });

      try {
        let mintAmount;
        if (givenAmount) {
          mintAmount = parseEther(givenAmount.toString());
        } else {
          mintAmount = parseEther("1");
        }
        const txHash = await mintUSDC(safeAddress, mintAmount, walletClient);

        const message = `✅ Minted ${formatEther(
          mintAmount
        )} USDC to your address!\nTx Hash: ${txHash}\nView on explorer: https://blockscan.xyz/tx/${txHash}`;

        console.log("message", message);
        await utils.sendMessageViaAppleScript(phoneNumber, message);
        console.log(`✅ Minted USDC for ${phoneNumber}`);
        resolve();
      } catch (error) {
        console.error("❌ Failed to mint USDC:", error.message);
        try {
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            "Sorry, couldn't mint USDC. Please try again later."
          );
        } catch (sendErr) {
          console.error("Failed to send error message:", sendErr.message);
        }
        reject(error);
      }
    });
  });
}

async function sendUsdcBalanceInfo(phoneNumber) {
  const dbConn = new sqlite3.Database(config.DB_PATH);
  const getUser = `SELECT safe_address FROM users WHERE phone_number = ?`;

  return new Promise((resolve, reject) => {
    dbConn.get(getUser, [phoneNumber], async (err, row) => {
      dbConn.close();

      if (err) return reject(err);

      if (!row) {
        try {
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            "You don't have a registered wallet. Text 'register' to create one."
          );
          return resolve();
        } catch (sendErr) {
          return reject(sendErr);
        }
      }

      const address = row.safe_address;

      try {
        const usdcBalance = await getUSDCBalance(address);

        const message = `Your USDC balance:\n${formatEther(
          usdcBalance
        )} USDC\n\nAddress: ${address}\nView on explorer: https://blockscan.xyz/address/${address}/tokens`;

        await utils.sendMessageViaAppleScript(phoneNumber, message);
        console.log(`✅ Sent USDC balance info to ${phoneNumber}`);
        resolve();
      } catch (error) {
        console.error("❌ Failed to get USDC balance:", error.message);
        try {
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            "Sorry, couldn't retrieve your USDC balance. Please try again later."
          );
        } catch (sendErr) {
          console.error("Failed to send error message:", sendErr.message);
        }
        reject(error);
      }
    });
  });
}

async function sendBalanceInfo(phoneNumber) {
  const dbConn = new sqlite3.Database(config.DB_PATH);
  const getUser = `SELECT safe_address FROM users WHERE phone_number = ?`;

  return new Promise((resolve, reject) => {
    dbConn.get(getUser, [phoneNumber], async (err, row) => {
      dbConn.close();

      if (err) return reject(err);

      if (!row) {
        try {
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            "You don't have a registered wallet. Text 'register' to create one."
          );
          return resolve();
        } catch (sendErr) {
          return reject(sendErr);
        }
      }

      const address = row.safe_address;

      try {
        // Get ETH balance
        const ethBalance = await publicClient.getBalance({ address });
        const formattedEthBalance = formatEther(ethBalance);

        // Send balance information back to the user
        const message = `Your ETH balance:\n${formattedEthBalance} ETH\n\nAddress: ${address}\nView on explorer: https://blockscan.xyz/address/${address}`;

        await utils.sendMessageViaAppleScript(phoneNumber, message);
        console.log(`✅ Sent ETH balance info to ${phoneNumber}`);
        resolve();
      } catch (error) {
        console.error("❌ Failed to get ETH balance:", error.message);
        try {
          //   await utils.sendMessageViaAppleScript(
          //     phoneNumber,
          //     "Sorry, couldn't retrieve your ETH balance. Please try again later."
          //   );
        } catch (sendErr) {
          console.error("Failed to send error message:", sendErr.message);
        }
        reject(error);
      }
    });
  });
}

async function mintUSDC(address, amount, walletClient) {
  try {
    const result = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "mint",
      args: [address, amount],
    });
    return result; // This will be the transaction hash
  } catch (error) {
    console.error("Error minting USDC:", error.message);
    throw error;
  }
}

async function transfer(phoneNumber, toAddress, amount) {
  const dbConn = new sqlite3.Database(config.DB_PATH);
  const getUser = `SELECT address, encrypted_private_key, safe_address FROM users WHERE phone_number = ?`;

  return new Promise((resolve, reject) => {
    dbConn.get(getUser, [phoneNumber], async (err, row) => {
      dbConn.close();

      if (err) return reject(err);

      if (!row) {
        try {
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            "You don't have a registered wallet. Text 'register' to create one."
          );
          return resolve();
        } catch (sendErr) {
          return reject(sendErr);
        }
      }

      const ownerAddress = row.address;
      const encryptedPrivateKey = row.encrypted_private_key;
      const safeAddress = row.safe_address;

      try {
        console.log("ownerAddress", ownerAddress);
        // Decrypt the private key
        const privateKey = await helper.decrypt(encryptedPrivateKey);
        console.log("privateKey", privateKey);

        // Create account from private key
        const account = privateKeyToAccount(privateKey);
        const RPC_URL = process.env.RPC_URL || "https://eth.llamarpc.com";
        
        // Create a wallet client for signing
        const walletClient = createWalletClient({
          account,
          chain: chain.neroDevnet,
          transport: http(RPC_URL),
        });

        console.log("walletclient", walletClient);

        // For this example, we'll transfer USDC
        const recipient = toAddress || "0x0000000000000000000000000000000000000000";
        const transferAmount = parseEther((amount || "10").toString());

        // Create the USDC transfer calldata
        const usdcTransferCalldata = encodeFunctionData({
          abi: USDC_ABI,
          functionName: "transfer",
          args: [recipient, transferAmount],
        });

        console.log("usdcTransferCalldata", usdcTransferCalldata);

        // Get the current nonce from the Safe contract
        const nonce = await publicClient.readContract({
          address: safeAddress,
          abi: SAFE_ABI,
          functionName: "nonce",
        });

        // Create the Safe transaction object
        const safeTransaction = {
          to: USDC_ADDRESS,
          value: 0n,
          data: usdcTransferCalldata,
          operation: 0, // 0 for Call, 1 for DelegateCall
          safeTxGas: 0n,
          baseGas: 0n,
          gasPrice: 0n,
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: nonce,
        };

        // Get the chain ID to use for the EIP-712 domain
        const chainId = await publicClient.getChainId();

        // Calculate the transaction hash using EIP-712
        // This is similar to the calculateSafeTransactionHash function in the reference code
        const domain = { 
          chainId: chainId, 
          verifyingContract: safeAddress 
        };
        
        const types = {
          SafeTx: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
            { name: "operation", type: "uint8" },
            { name: "safeTxGas", type: "uint256" },
            { name: "baseGas", type: "uint256" },
            { name: "gasPrice", type: "uint256" },
            { name: "gasToken", type: "address" },
            { name: "refundReceiver", type: "address" },
            { name: "nonce", type: "uint256" },
          ]
        };

        // Get the transaction hash directly from the Safe contract for cross-verification
        const safeTxHash = await publicClient.readContract({
          address: safeAddress,
          abi: SAFE_ABI,
          functionName: "getTransactionHash",
          args: [
            safeTransaction.to,
            safeTransaction.value,
            safeTransaction.data,
            safeTransaction.operation,
            safeTransaction.safeTxGas,
            safeTransaction.baseGas,
            safeTransaction.gasPrice,
            safeTransaction.gasToken,
            safeTransaction.refundReceiver,
            safeTransaction.nonce,
          ],
        });

        console.log("Transaction hash from contract:", safeTxHash);

        // Sign the transaction hash as a message
        // This is similar to the signHash function in the reference code
        const signature = await walletClient.signMessage({
          message: { raw: safeTxHash },
        });

        console.log("Signature:", signature);

        // Message to user
        const message = `✅ Transaction signed!\n
          Safe Address: ${safeAddress}
          To: ${recipient}
          Amount: ${amount || "10"} USDC
          Signature: ${signature}
          
          This signature can be used to execute the transaction on your behalf.`;

        console.log(`✅ Transaction signed for ${phoneNumber}`);

        // Now execute the transaction with the proper signature format
        // Based on the reference code's buildSignatureBytes function
        
        // First, clean the signature (remove 0x prefix if present)
        const signatureWithoutPrefix = signature.startsWith("0x") ? signature.slice(2) : signature;
        
        // Format signature according to Gnosis Safe expectations
        // The format for a single signature is {bytes32 r}{bytes32 s}{uint8 v}
        // But we need to ensure the v value is correct
        const r = signatureWithoutPrefix.slice(0, 64);
        const s = signatureWithoutPrefix.slice(64, 128);
        let v = parseInt(signatureWithoutPrefix.slice(128, 130), 16);
        
        // Adjust v if needed (based on the reference code's signHash function)
        // Sometimes v needs to be adjusted (1b -> 1f, 1c -> 20)
        if (v === 0x1b) v = 0x1f;
        if (v === 0x1c) v = 0x20;
        
        // Format the signature in the way Safe expects
        const formattedSignature = `0x${r}${s}${v.toString(16).padStart(2, '0')}`;
        
        console.log("Formatted signature:", formattedSignature);
        
        // Execute the transaction
        const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY;
        const formattedAlicePrivateKey = ALICE_PRIVATE_KEY.startsWith("0x")
          ? ALICE_PRIVATE_KEY
          : `0x${ALICE_PRIVATE_KEY}`;

        const aliceAccount = privateKeyToAccount(formattedAlicePrivateKey);
        const execWalletClient = createWalletClient({
          account: aliceAccount,
          chain: chain.neroDevnet,
          transport: http(RPC_URL),
        });

        try {
          const txHash = await execWalletClient.writeContract({
            address: safeAddress,
            abi: SAFE_ABI,
            functionName: "execTransaction",
            gas: 3000000,
            args: [
              safeTransaction.to,
              safeTransaction.value,
              safeTransaction.data,
              safeTransaction.operation,
              safeTransaction.safeTxGas,
              safeTransaction.baseGas,
              safeTransaction.gasPrice,
              safeTransaction.gasToken,
              safeTransaction.refundReceiver,
              formattedSignature,
            ],
          });

          console.log("Transaction executed successfully! Hash:", txHash);
          await utils.sendMessageViaAppleScript(
            phoneNumber,
            `✅ Transaction executed!`
          );

          await utils.sendMessageViaAppleScript(
            phoneNumber,
            `Tx Hash: ${txHash}\nView on explorer: https://blockscan.xyz/tx/${txHash}`
          );
        } catch (execError) {
          console.error("Error executing transaction:", execError.message);
        }

        resolve();
      } catch (error) {
        console.error("❌ Failed to sign transaction:", error.message);
        reject(error);
      }
    });
  });
}
// Helper functions that you'll need to implement
async function getSafeNonce(safeAddress) {
  // Get the current nonce of the Safe contract
  try {
    // You would need the Safe ABI for this
    const nonce = await publicClient.readContract({
      address: safeAddress,
      abi: SAFE_ABI, // You'll need to define this
      functionName: "nonce",
    });
    return nonce;
  } catch (error) {
    console.error("Error getting Safe nonce:", error.message);
    return 0n; // Default to 0 if there's an error
  }
}

async function calculateSafeTxHash(safeTransaction, safeAddress) {
  // This would typically be done using the Safe SDK
  // For this example, we'll use a simplified approach

  // Pack the transaction data according to the Safe contract format
  // This is a simplified version and may need adjustment based on your Safe version
  const txData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "operation", type: "uint8" },
          { name: "safeTxGas", type: "uint256" },
          { name: "baseGas", type: "uint256" },
          { name: "gasPrice", type: "uint256" },
          { name: "gasToken", type: "address" },
          { name: "refundReceiver", type: "address" },
          { name: "nonce", type: "uint256" },
        ],
        name: "getTransactionHash",
        outputs: [{ name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getTransactionHash",
    args: [
      safeTransaction.to,
      safeTransaction.value,
      safeTransaction.data,
      safeTransaction.operation,
      safeTransaction.safeTxGas,
      safeTransaction.baseGas,
      safeTransaction.gasPrice,
      safeTransaction.gasToken,
      safeTransaction.refundReceiver,
      safeTransaction.nonce,
    ],
  });

  // Call the Safe contract to get the transaction hash
  const txHash = await publicClient.readContract({
    address: safeAddress,
    abi: SAFE_ABI, // You'll need to define this
    functionName: "getTransactionHash",
    args: [
      safeTransaction.to,
      safeTransaction.value,
      safeTransaction.data,
      safeTransaction.operation,
      safeTransaction.safeTxGas,
      safeTransaction.baseGas,
      safeTransaction.gasPrice,
      safeTransaction.gasToken,
      safeTransaction.refundReceiver,
      safeTransaction.nonce,
    ],
  });

  return txHash;
}


async function executeSafeTransaction(safeTransaction, signature, safeAddress) {
  try {
    // Set up wallet client as before
    const RPC_URL = process.env.RPC_URL || "https://eth.llamarpc.com";
    const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY;
    const formattedAlicePrivateKey = ALICE_PRIVATE_KEY.startsWith("0x")
      ? ALICE_PRIVATE_KEY
      : `0x${ALICE_PRIVATE_KEY}`;

    const aliceAccount = privateKeyToAccount(formattedAlicePrivateKey);
    
    const walletClient = createWalletClient({
      account: aliceAccount,
      chain: chain.neroDevnet,
      transport: http(RPC_URL),
    });

    // Get the owner address
    const owners = await publicClient.readContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: "getOwners",
    });
    
    // Get the owner who signed the transaction
    const owner = owners[0];
    
    // Strip 0x prefix if present
    const signatureNoPrefix = signature.startsWith("0x") ? signature.slice(2) : signature;
    
    // Extract r, s, v components
    const r = `0x${signatureNoPrefix.slice(0, 64)}`;
    const s = `0x${signatureNoPrefix.slice(64, 128)}`;
    const v = parseInt(signatureNoPrefix.slice(128, 130), 16);
    
    // Construct a properly formatted signature for Safe
    // Safe expects: {32-bytes owner}{1-byte signature type}{actual signature}
    const signatureType = '01'; // ECDSA signature type
    const ownerNoPrefix = owner.slice(2).toLowerCase();
    const safeSignature = `0x000000000000000000000000${ownerNoPrefix}${signatureType}${signatureNoPrefix}`;
    
    console.log("Safe signature format:", safeSignature);
    
    // Execute the transaction
    const txHash = await walletClient.writeContract({
      address: safeAddress,
      abi: SAFE_ABI,
      functionName: "execTransaction",
      args: [
        safeTransaction.to,
        safeTransaction.value,
        safeTransaction.data,
        safeTransaction.operation,
        safeTransaction.safeTxGas,
        safeTransaction.baseGas,
        safeTransaction.gasPrice,
        safeTransaction.gasToken,
        safeTransaction.refundReceiver,
        safeSignature,
      ],
    });

    return txHash;
  } catch (error) {
    console.error("Error executing Safe transaction:", error.message);
    return null;
  }
}

module.exports = {
  sendUsdcBalanceInfo,
  sendBalanceInfo,
  sendMintUsdcInfo,
  transfer,
};
