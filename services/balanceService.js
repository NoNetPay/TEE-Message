// services/balanceService.js - Pure Paymaster AA (Ethers v5.7.2)
const utils = require("../utils");
const { ethers } = require("ethers");
const { Client, Presets } = require("userop");
const { NERO_CHAIN_CONFIG, AA_PLATFORM_CONFIG, CONTRACT_ADDRESSES } = require("../utils/neroConfig");
const { USDC_ABI } = require("../utils/usdcABI");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const USDC_ADDRESS = "0xec690C24B7451B85B6167a06292e49B5DA822fBE";

// Initialize provider for reading balances (ethers v5 syntax)
const provider = new ethers.providers.JsonRpcProvider(NERO_CHAIN_CONFIG.rpcUrl);

/**
 * Get user wallet data with proper error handling
 */
function getUserWalletData(phoneNumber) {
  try {
    // Adjust the path to your actual registration data file
    const dataPath = path.join(__dirname, '../data/userWallets.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log(`📁 Registration data file not found: ${dataPath}`);
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const userData = data[phoneNumber];
    
    if (!userData) {
      console.log(`👤 No user data found for ${phoneNumber}`);
      return null;
    }
    
    console.log(`✅ Found user data for ${phoneNumber}:`, {
      aaWalletAddress: userData.aaWalletAddress,
      signerAddress: userData.signerAddress,
      isDeployed: userData.isDeployed
    });
    
    return {
      signerPrivateKey: userData.privateKey,
      aaWalletAddress: userData.aaWalletAddress,
      signerAddress: userData.signerAddress,
      isDeployed: userData.isDeployed
    };
    
  } catch (error) {
    console.error(`❌ Error reading user data for ${phoneNumber}:`, error);
    return null;
  }
}

/**
 * Execute AA transaction with paymaster (sponsored gas)
 */
async function executePaymasterTransaction(
  userSigner,
  contractAddress,
  contractAbi,
  functionName,
  functionParams
) {
  try {
    console.log("🚀 Executing AA transaction with paymaster...");
    
    // Initialize AA client
    const client = await Client.init(NERO_CHAIN_CONFIG.rpcUrl, {
      overrideBundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
      entryPoint: CONTRACT_ADDRESSES.entryPoint,
    });
    
    // Initialize AA builder
    const builder = await Presets.Builder.SimpleAccount.init(
      userSigner,
      NERO_CHAIN_CONFIG.rpcUrl,
      {
        overrideBundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
        entryPoint: CONTRACT_ADDRESSES.entryPoint,
        factory: CONTRACT_ADDRESSES.accountFactory,
      }
    );
    
    console.log("⚙️ Setting gas parameters...");
    
    // Configure gas parameters (adjusted for NERO Chain)
    const gasParams = {
      callGasLimit: "0x88b8",
      verificationGasLimit: "0x33450", 
      preVerificationGas: "0xc350",
      maxFeePerGas: "0x435a6e7a",
      maxPriorityFeePerGas: "0x435a6e6c",
    };
    
    // Set gas parameters
    builder.setCallGasLimit(gasParams.callGasLimit);
    builder.setVerificationGasLimit(gasParams.verificationGasLimit);
    builder.setPreVerificationGas(gasParams.preVerificationGas);
    builder.setMaxFeePerGas(gasParams.maxFeePerGas);
    builder.setMaxPriorityFeePerGas(gasParams.maxPriorityFeePerGas);
    
    // Configure paymaster for sponsored transactions
    console.log("💰 Configuring paymaster for sponsored gas...");
    const paymasterOptions = {
      apikey: process.env.NERO_AA_API_KEY,
      rpc: AA_PLATFORM_CONFIG.paymasterRpc,
      type: "0" // Type 0 = sponsored/free gas
    };
    
    builder.setPaymasterOptions(paymasterOptions);
    
    // Create contract instance for encoding
    const contract = new ethers.Contract(
      contractAddress,
      contractAbi,
      provider
    );
    
    // Encode function call
    const callData = contract.interface.encodeFunctionData(
      functionName,
      functionParams
    );
    
    console.log("📝 Creating UserOperation with paymaster...");
    
    // Create the UserOperation
    const userOp = await builder.execute(contractAddress, 0, callData);
    
    console.log("📡 Sending UserOperation to bundler...");
    
    // Send the UserOperation
    const res = await client.sendUserOperation(userOp);
    console.log("✅ UserOperation sent with hash:", res.userOpHash);
    
    // Wait for the transaction to be included
    console.log("⏳ Waiting for transaction to be mined...");
    const receipt = await res.wait();
    
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }
    
    console.log("🎉 Paymaster transaction mined in block:", receipt.blockNumber);
    console.log("🔗 UserOp Hash:", res.userOpHash);
    console.log("🔗 Transaction Hash:", receipt.transactionHash);
    
    // Use the actual transaction hash from receipt, not userOp hash
    const actualTxHash = receipt.transactionHash || res.userOpHash;
    
    return {
      userOpHash: res.userOpHash,
      transactionHash: actualTxHash,
      receipt: receipt,
      explorerUrl: `https://testnet.neroscan.io/tx/${actualTxHash}`
    };
    
  } catch (error) {
    console.error("❌ Error executing paymaster transaction:", error);
    throw error;
  }
}

/**
 * Mint USDC using paymaster (sponsored gas)
 */
async function sendMintUsdcInfo(phoneNumber, givenAmount) {
  try {
    console.log(`🪙 Starting paymaster USDC mint for ${phoneNumber} with amount: ${givenAmount || 'default'}`);
    
    // Get user's AA wallet info
    const userData = getUserWalletData(phoneNumber);
    if (!userData) {
      await utils.sendMessageViaAppleScript(
        phoneNumber,
        "❌ You are not registered. Send 'register' to create your AA wallet."
      );
      return;
    }
    
    console.log(`🔐 Creating signer for ${userData.signerAddress}`);
    
    // Ensure private key is properly formatted
    let privateKey = userData.signerPrivateKey;
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    console.log(`🔑 Using private key: ${privateKey.substring(0, 10)}...`);
    
    // Create signer from user's private key
    const userSigner = new ethers.Wallet(privateKey, provider);
    const aaWalletAddress = userData.aaWalletAddress;
    
    console.log(`👤 Signer address: ${await userSigner.getAddress()}`);
    console.log(`🏦 AA Wallet address: ${aaWalletAddress}`);
    
    // Calculate mint amount (USDC has 6 decimals)
    const decimals = 6;
    const mintAmount = givenAmount 
      ? ethers.utils.parseUnits(givenAmount.toString(), decimals)
      : ethers.utils.parseUnits("10", decimals); // Default 10 USDC
    
    console.log(`💰 Minting ${ethers.utils.formatUnits(mintAmount, decimals)} USDC to ${aaWalletAddress}`);
    
    // Send processing message
    await utils.sendMessageViaAppleScript(
      phoneNumber,
      `🔄 Initializing paymaster SDK for gas-free transaction...\t\t⏳ Processing your USDC mint...`
    );
    
    // Execute paymaster transaction
    const result = await executePaymasterTransaction(
      userSigner,
      USDC_ADDRESS,
      USDC_ABI,
      'mint',
      [aaWalletAddress, mintAmount]
    );
    
    // Send success message
    const successMessage = 
      `✅ USDC Mint Successful!\t\t` +
      `💰 Amount: ${ethers.utils.formatUnits(mintAmount, decimals)} USDC\t\t` +
      `📍 Wallet: ${aaWalletAddress}\t\t` +
      `🔗 Transaction: ${result.transactionHash}\t\t` +
      `🔍 Explorer: ${result.explorerUrl}\t\t` +
      `⛽ Gas: Sponsored by paymaster SDK`;
    
    await utils.sendMessageViaAppleScript(phoneNumber, successMessage);
    console.log(`✅ USDC minted successfully for ${phoneNumber} using paymaster`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to mint USDC for ${phoneNumber}:`, error);
    
    const errorMessage = 
      `❌ USDC Mint Failed\t\t` +
      `Error: ${error.message}\t\t` +
      `Please try again or contact support.`;
    
    try {
      await utils.sendMessageViaAppleScript(phoneNumber, errorMessage);
    } catch (msgError) {
      console.error("Failed to send error message:", msgError.message);
    }
    throw error;
  }
}

/**
 * Transfer USDC using paymaster (sponsored gas)
 */
async function transfer(phoneNumber, toAddress, amount) {
  try {
    console.log(`💸 Starting paymaster USDC transfer for ${phoneNumber}`);
    
    // Get user's AA wallet info
    const userData = getUserWalletData(phoneNumber);
    if (!userData) {
      await utils.sendMessageViaAppleScript(
        phoneNumber,
        "❌ You are not registered. Send 'register' to create your AA wallet."
      );
      return;
    }
    
    // Ensure private key is properly formatted
    let privateKey = userData.signerPrivateKey;
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Create signer from user's private key
    const userSigner = new ethers.Wallet(privateKey, provider);
    const aaWalletAddress = userData.aaWalletAddress;
    
    console.log(`👤 Signer address: ${await userSigner.getAddress()}`);
    console.log(`🏦 AA Wallet address: ${aaWalletAddress}`);
    
    // Calculate transfer amount (USDC has 6 decimals)
    const decimals = 6;
    const transferAmount = ethers.utils.parseUnits(amount.toString(), decimals);
    
    console.log(`💸 Transferring ${amount} USDC from ${aaWalletAddress} to ${toAddress}`);
    
    // Send processing message
    await utils.sendMessageViaAppleScript(
      phoneNumber,
      `🔄 Initializing paymaster SDK for gas-free transfer...\t\t⏳ Processing your USDC transfer...`
    );
    
    // Execute paymaster transaction
    const result = await executePaymasterTransaction(
      userSigner,
      USDC_ADDRESS,
      USDC_ABI,
      'transfer',
      [toAddress, transferAmount]
    );
    
    // Send success message
    const successMessage = 
      `✅ USDC Transfer Successful!\t\t` +
      `💰 Amount: ${amount} USDC\t\t` +
      `📤 From: ${aaWalletAddress}\t\t` +
      `📥 To: ${toAddress}\t\t` +
      `🔗 Transaction: ${result.transactionHash}\t\t` +
      `🔍 Explorer: ${result.explorerUrl}\t\t` +
      `⛽ Gas: Sponsored by paymaster SDK`;
    
    await utils.sendMessageViaAppleScript(phoneNumber, successMessage);
    console.log(`✅ USDC transferred successfully for ${phoneNumber} using paymaster`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to transfer USDC for ${phoneNumber}:`, error);
    
    const errorMessage = 
      `❌ USDC Transfer Failed\t\t` +
      `Error: ${error.message}\t\t` +
      `Please try again or check your balance.`;
    
    try {
      await utils.sendMessageViaAppleScript(phoneNumber, errorMessage);
    } catch (msgError) {
      console.error("Failed to send error message:", msgError.message);
    }
    throw error;
  }
}

/**
 * Get USDC balance (read-only, no transaction needed)
 */
async function sendUsdcBalanceInfo(phoneNumber) {
  try {
    console.log(`💵 Checking USDC balance for ${phoneNumber}`);
    
    // Get user's AA wallet info
    const userData = getUserWalletData(phoneNumber);
    if (!userData) {
      await utils.sendMessageViaAppleScript(
        phoneNumber,
        "❌ You are not registered. Send 'register' to create your AA wallet."
      );
      return;
    }
    
    const aaWalletAddress = userData.aaWalletAddress;
    
    // Get USDC balance (read-only operation)
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const balance = await usdcContract.balanceOf(aaWalletAddress);
    const decimals = await usdcContract.decimals();
    const formattedBalance = ethers.utils.formatUnits(balance, decimals);
    
    // Also get ETH balance
    const ethBalance = await provider.getBalance(aaWalletAddress);
    const formattedEthBalance = ethers.utils.formatEther(ethBalance);
    
    // Send balance info
    const balanceMessage = 
      `💵 Your Wallet Balances:\t\t` +
      `💰 USDC: ${formattedBalance} USDC\t\t` +
      `💎 ETH: ${formattedEthBalance} ETH\t\t` +
      `📍 Wallet: ${aaWalletAddress}\t\t` +
      `🔍 Explorer:\thttps://testnet.neroscan.io/address/${aaWalletAddress}`;
    
    await utils.sendMessageViaAppleScript(phoneNumber, balanceMessage);
    console.log(`✅ Balance info sent to ${phoneNumber}: ${formattedBalance} USDC, ${formattedEthBalance} ETH`);
    
    return { 
      usdcBalance: formattedBalance, 
      ethBalance: formattedEthBalance,
      address: aaWalletAddress 
    };
    
  } catch (error) {
    console.error(`❌ Failed to get balance for ${phoneNumber}:`, error);
    
    const errorMessage = 
      `❌ Failed to get balance\t\t` +
      `Error: ${error.message}\t\t` +
      `Please try again.`;
    
    try {
      await utils.sendMessageViaAppleScript(phoneNumber, errorMessage);
    } catch (msgError) {
      console.error("Failed to send error message:", msgError.message);
    }
    throw error;
  }
}

/**
 * Get ETH/NERO balance (read-only, no transaction needed)
 */
async function sendBalanceInfo(phoneNumber) {
  // Just call the USDC balance function which now shows both
  return await sendUsdcBalanceInfo(phoneNumber);
}

module.exports = {
  sendUsdcBalanceInfo,
  sendBalanceInfo,
  sendMintUsdcInfo,
  transfer,
  getUserWalletData,
  executePaymasterTransaction
};