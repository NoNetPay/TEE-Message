// services/neroRegistrationService.js
import { ethers } from 'ethers';
import { 
  getAAWalletAddress, 
  createSignerFromPrivateKey, 
  isAAWalletDeployed,
  getAAWalletBalance 
} from '../utils/aaUtils.js';
import { NERO_CHAIN_CONFIG } from '../utils/neroConfig.js';

// In-memory storage for user wallets (use database in production)
const userWallets = new Map();

// Store user registration data to a JSON file for persistence (optional)
import fs from 'fs';
import path from 'path';

const WALLETS_FILE = path.join(process.cwd(), 'data', 'userWallets.json');

// Load existing wallets from file on startup
const loadWalletsFromFile = () => {
  try {
    if (fs.existsSync(WALLETS_FILE)) {
      const data = fs.readFileSync(WALLETS_FILE, 'utf8');
      const wallets = JSON.parse(data);
      
      // Restore to Map
      Object.entries(wallets).forEach(([phoneNumber, walletData]) => {
        userWallets.set(phoneNumber, walletData);
      });
      
      console.log(`📱 Loaded ${userWallets.size} existing wallet registrations`);
    }
  } catch (error) {
    console.error("Error loading wallets from file:", error);
  }
};

// Save wallets to file for persistence
const saveWalletsToFile = () => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(WALLETS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Convert Map to Object and save
    const walletsObject = Object.fromEntries(userWallets);
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(walletsObject, null, 2));
  } catch (error) {
    console.error("Error saving wallets to file:", error);
  }
};

// Initialize wallets on module load
loadWalletsFromFile();

/**
 * Register a new user with NERO Chain Account Abstraction wallet
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|string} Registration data or "already_registered"
 */
export async function registerIfNeeded(phoneNumber) {
  try {
    console.log(`🔍 Checking registration for: ${phoneNumber}`);
    
    // Check if user is already registered
    if (userWallets.has(phoneNumber)) {
      console.log(`✅ User ${phoneNumber} already registered`);
      return "already_registered";
    }

    console.log(`🚀 Starting NERO AA registration for: ${phoneNumber}`);

    // Generate a unique private key for this user
    // In production, consider using deterministic key derivation
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    
    console.log(`🔑 Generated private key for ${phoneNumber}`);
    
    // Create signer from the private key
    const signer = createSignerFromPrivateKey(privateKey);
    const signerAddress = await signer.getAddress();
    
    console.log(`📝 Signer address: ${signerAddress}`);
    
    // Get the AA wallet address (counterfactual - not deployed yet)
    console.log(`⏳ Calculating AA wallet address...`);
    const aaWalletAddress = await getAAWalletAddress(signer);
    
    // Check if wallet is already deployed (shouldn't be for new users)
    const isDeployed = await isAAWalletDeployed(aaWalletAddress);
    
    // Store the user data
    const userData = {
      phoneNumber,
      privateKey, // ⚠️ IMPORTANT: Store securely in production!
      aaWalletAddress,
      signerAddress,
      isDeployed,
      registeredAt: new Date().toISOString(),
      chainId: NERO_CHAIN_CONFIG.chainId,
      network: NERO_CHAIN_CONFIG.chainName
    };
    
    // Store in memory and file
    userWallets.set(phoneNumber, userData);
    saveWalletsToFile();
    
    console.log(`✅ User ${phoneNumber} registered successfully!`);
    console.log(`📍 AA Wallet: ${aaWalletAddress}`);
    console.log(`🏗️ Deployed: ${isDeployed ? 'Yes' : 'No (Counterfactual)'}`);
    
    return {
      aaWalletAddress,
      signerAddress,
      isCounterfactual: !isDeployed,
      chainId: NERO_CHAIN_CONFIG.chainId,
      network: NERO_CHAIN_CONFIG.chainName,
      explorerUrl: `${NERO_CHAIN_CONFIG.explorer}/address/${aaWalletAddress}`
    };
    
  } catch (error) {
    console.error(`❌ Error registering user ${phoneNumber}:`, error);
    throw new Error(`Registration failed: ${error.message}`);
  }
}

/**
 * Get user wallet information
 * @param {string} phoneNumber - User's phone number
 * @returns {Object|null} User wallet data or null if not found
 */
export function getUserWallet(phoneNumber) {
  return userWallets.get(phoneNumber) || null;
}

/**
 * Get user's signer instance
 * @param {string} phoneNumber - User's phone number
 * @returns {ethers.Wallet|null} Signer instance or null
 */
export function getUserSigner(phoneNumber) {
  const userData = userWallets.get(phoneNumber);
  if (!userData) return null;
  
  return createSignerFromPrivateKey(userData.privateKey);
}

/**
 * Get all registered users (for admin purposes)
 * @returns {Array} Array of phone numbers
 */
export function getAllRegisteredUsers() {
  return Array.from(userWallets.keys());
}

/**
 * Check wallet deployment status and balance
 * @param {string} phoneNumber - User's phone number
 * @returns {Object} Wallet status information
 */
export async function getWalletStatus(phoneNumber) {
  try {
    const userData = userWallets.get(phoneNumber);
    if (!userData) {
      throw new Error("User not registered");
    }

    const isDeployed = await isAAWalletDeployed(userData.aaWalletAddress);
    const balance = await getAAWalletBalance(userData.aaWalletAddress);
    
    // Update deployment status if it changed
    if (isDeployed !== userData.isDeployed) {
      userData.isDeployed = isDeployed;
      userWallets.set(phoneNumber, userData);
      saveWalletsToFile();
    }
    
    return {
      aaWalletAddress: userData.aaWalletAddress,
      signerAddress: userData.signerAddress,
      isDeployed,
      balance: `${balance} ${NERO_CHAIN_CONFIG.currency}`,
      network: userData.network,
      registeredAt: userData.registeredAt,
      explorerUrl: `${NERO_CHAIN_CONFIG.explorer}/address/${userData.aaWalletAddress}`
    };
    
  } catch (error) {
    console.error(`Error getting wallet status for ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Remove user registration (for testing/admin purposes)
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} Success status
 */
export function unregisterUser(phoneNumber) {
  try {
    const deleted = userWallets.delete(phoneNumber);
    if (deleted) {
      saveWalletsToFile();
      console.log(`🗑️ User ${phoneNumber} unregistered`);
    }
    return deleted;
  } catch (error) {
    console.error(`Error unregistering user ${phoneNumber}:`, error);
    return false;
  }
}