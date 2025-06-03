// Enhanced neroAAUtils.js with extensive debugging
import { ethers } from 'ethers';
import { Client, Presets } from 'userop';
import { NERO_CHAIN_CONFIG, AA_PLATFORM_CONFIG, CONTRACT_ADDRESSES } from './neroConfig.js';

// Get Ethereum provider for NERO Chain
export const getNeroProvider = () => {
  return new ethers.providers.JsonRpcProvider(NERO_CHAIN_CONFIG.rpcUrl);
};

// Create a signer from private key
export const createSignerFromPrivateKey = (privateKey) => {
  const provider = getNeroProvider();
  return new ethers.Wallet(privateKey, provider);
};

// Verify contract deployment
export const verifyContractDeployment = async (contractAddress, contractName) => {
  try {
    const provider = getNeroProvider();
    const code = await provider.getCode(contractAddress);
    console.log(`${contractName} (${contractAddress}) code:`, code);
    
    if (code === '0x') {
      console.error(`❌ ${contractName} is NOT deployed at ${contractAddress}`);
      return false;
    } else {
      console.log(`✅ ${contractName} is deployed at ${contractAddress}`);
      return true;
    }
  } catch (error) {
    console.error(`Error checking ${contractName} deployment:`, error);
    return false;
  }
};

// Enhanced AA wallet address calculation with debugging
export const getAAWalletAddress = async (accountSigner) => {
  try {
    console.log("🔍 Starting AA wallet address calculation...");
    
    // Verify signer
    const signerAddress = await accountSigner.getAddress();
    console.log("👤 Signer address:", signerAddress);
    
    // Verify network connection
    const provider = getNeroProvider();
    const network = await provider.getNetwork();
    console.log("🌐 Connected to network:", network);
    
    // Verify contract deployments
    console.log("🔍 Verifying contract deployments...");
    const entryPointDeployed = await verifyContractDeployment(
      CONTRACT_ADDRESSES.entryPoint, 
      "EntryPoint"
    );
    const factoryDeployed = await verifyContractDeployment(
      CONTRACT_ADDRESSES.accountFactory, 
      "Account Factory"
    );
    
    if (!entryPointDeployed || !factoryDeployed) {
      throw new Error("Required contracts are not deployed");
    }
    
    console.log("🏗️ Initializing SimpleAccount builder...");
    console.log("Config being used:", {
      signerAddress,
      rpcUrl: NERO_CHAIN_CONFIG.rpcUrl,
      bundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
      entryPoint: CONTRACT_ADDRESSES.entryPoint,
      factory: CONTRACT_ADDRESSES.accountFactory,
    });
    
    // Initialize the SimpleAccount builder with detailed error handling
    let simpleAccount;
    try {
      simpleAccount = await Presets.Builder.SimpleAccount.init(
        accountSigner,
        NERO_CHAIN_CONFIG.rpcUrl,
        {
          overrideBundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
          entryPoint: CONTRACT_ADDRESSES.entryPoint,
          factory: CONTRACT_ADDRESSES.accountFactory,
        }
      );
      console.log("✅ SimpleAccount initialized successfully");
    } catch (initError) {
      console.error("❌ Error initializing SimpleAccount:", initError);
      throw initError;
    }
    
    // Get the counterfactual address
    console.log("🔍 Getting counterfactual address...");
    let address;
    try {
      address = await simpleAccount.getSender();
      console.log("📍 Raw address from getSender():", address);
    } catch (getSenderError) {
      console.error("❌ Error calling getSender():", getSenderError);
      throw getSenderError;
    }
    
    // Validate the address
    if (!address || address === ethers.constants.AddressZero) {
      console.error("❌ Received invalid address:", address);
      
      // Additional debugging - try to get more info from the simpleAccount object
      console.log("🔍 SimpleAccount object:", simpleAccount);
      
      throw new Error(`Invalid AA wallet address received: ${address}`);
    }
    
    // Verify address format
    if (!ethers.utils.isAddress(address)) {
      console.error("❌ Invalid address format:", address);
      throw new Error(`Invalid address format: ${address}`);
    }
    
    console.log("✅ AA wallet address calculated successfully:", address);
    
    // Additional verification - check if this address would be the same with CREATE2
    try {
      const salt = 0; // Default salt for SimpleAccount
      const initCode = await simpleAccount.getInitCode();
      console.log("🔍 Init code:", initCode);
    } catch (e) {
      console.log("⚠️ Could not get init code for verification:", e.message);
    }
    
    return address;
  } catch (error) {
    console.error("❌ Error getting AA wallet address:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

// Test function to diagnose the issue
export const diagnoseAASetup = async (accountSigner) => {
  console.log("🩺 Starting AA setup diagnosis...");
  
  try {
    // Test 1: Check signer
    const signerAddress = await accountSigner.getAddress();
    console.log("✅ Test 1 - Signer address:", signerAddress);
    
    // Test 2: Check network connectivity
    const provider = getNeroProvider();
    const blockNumber = await provider.getBlockNumber();
    console.log("✅ Test 2 - Current block number:", blockNumber);
    
    // Test 3: Check contract deployments
    const entryPointDeployed = await verifyContractDeployment(
      CONTRACT_ADDRESSES.entryPoint, 
      "EntryPoint"
    );
    const factoryDeployed = await verifyContractDeployment(
      CONTRACT_ADDRESSES.accountFactory, 
      "Account Factory"
    );
    
    console.log("✅ Test 3 - Contract deployments:", {
      entryPoint: entryPointDeployed,
      factory: factoryDeployed
    });
    
    // Test 4: Check bundler connectivity
    try {
      const response = await fetch(AA_PLATFORM_CONFIG.bundlerRpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_supportedEntryPoints',
          params: [],
          id: 1
        })
      });
      const bundlerResponse = await response.json();
      console.log("✅ Test 4 - Bundler response:", bundlerResponse);
    } catch (bundlerError) {
      console.error("❌ Test 4 - Bundler connectivity failed:", bundlerError);
    }
    
    // Test 5: Try to get AA address
    console.log("🔍 Test 5 - Attempting to get AA address...");
    const aaAddress = await getAAWalletAddress(accountSigner);
    console.log("✅ Test 5 - AA address:", aaAddress);
    
    return {
      success: true,
      signerAddress,
      aaAddress,
      blockNumber,
      contracts: { entryPoint: entryPointDeployed, factory: factoryDeployed }
    };
    
  } catch (error) {
    console.error("❌ Diagnosis failed:", error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

// Initialize AA Client
export const initAAClient = async (accountSigner) => {
  return await Client.init(NERO_CHAIN_CONFIG.rpcUrl, {
    overrideBundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
    entryPoint: CONTRACT_ADDRESSES.entryPoint,
  });
};

// Check if AA wallet is deployed on-chain
export const isAAWalletDeployed = async (aaWalletAddress) => {
  try {
    const provider = getNeroProvider();
    const code = await provider.getCode(aaWalletAddress);
    return code !== '0x';
  } catch (error) {
    console.error("Error checking wallet deployment:", error);
    return false;
  }
};

// Get balance of AA wallet
export const getAAWalletBalance = async (aaWalletAddress) => {
  try {
    const provider = getNeroProvider();
    const balance = await provider.getBalance(aaWalletAddress);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error("Error getting AA wallet balance:", error);
    throw error;
  }
};

// Send a user operation (transaction) through AA wallet
export const sendUserOperation = async (accountSigner, to, value, data = '0x') => {
  try {
    console.log("Preparing user operation...");
    
    const simpleAccount = await Presets.Builder.SimpleAccount.init(
      accountSigner,
      NERO_CHAIN_CONFIG.rpcUrl,
      {
        overrideBundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
        entryPoint: CONTRACT_ADDRESSES.entryPoint,
        factory: CONTRACT_ADDRESSES.accountFactory,
      }
    );

    const client = await Client.init(NERO_CHAIN_CONFIG.rpcUrl, {
      overrideBundlerRpc: AA_PLATFORM_CONFIG.bundlerRpc,
      entryPoint: CONTRACT_ADDRESSES.entryPoint,
    });

    const res = await client.sendUserOperation(
      simpleAccount.execute(to, value, data),
      {
        onBuild: (op) => console.log("User operation built:", op),
      }
    );

    console.log("✅ User operation sent:", res.userOpHash);
    console.log("⏳ Waiting for transaction...");
    
    const ev = await res.wait();
    console.log("✅ Transaction mined:", ev?.transactionHash);
    
    return {
      userOpHash: res.userOpHash,
      transactionHash: ev?.transactionHash,
      success: true
    };
  } catch (error) {
    console.error("❌ Error sending user operation:", error);
    throw error;
  }
};