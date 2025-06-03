const {
    createPublicClient,
    createWalletClient,
    http,
    encodeFunctionData,
    generatePrivateKey,
    privateKeyToAccount,
  } = require("viem");
  const SafeProxyFactoryArtifact = require('@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json');
  const SafeArtifact = require('@safe-global/safe-contracts/build/artifacts/contracts/Safe.sol/Safe.json');
  
  require('dotenv').config();
  
  const SAFE_ABI = SafeArtifact.abi;
  const SAFE_PROXY_FACTORY_ABI = SafeProxyFactoryArtifact.abi;
  const SAFE_BYTECODE = SafeArtifact.bytecode;
  const SAFE_PROXY_FACTORY_BYTECODE = SafeProxyFactoryArtifact.bytecode;
  
  const RPC_URL = process.env.RPC_URL;
  const CHAIN_ID = Number(process.env.CHAIN_ID);
  
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
  
  const publicClient = createPublicClient({ chain: customChain, transport: http(RPC_URL) });
  const deployerPrivateKey = process.env.ALICE_PRIVATE_KEY.startsWith('0x') ? process.env.ALICE_PRIVATE_KEY : `0x${process.env.ALICE_PRIVATE_KEY}`;
  const aliceAccount = privateKeyToAccount(deployerPrivateKey);
  const walletClient = createWalletClient({ account: aliceAccount, chain: customChain, transport: http(RPC_URL) });
  
  async function deployContract(abi, bytecode) {
    const hash = await walletClient.deployContract({ abi, bytecode, account: aliceAccount });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt.contractAddress;
  }
  
  async function deploySafeForUser(account) {
    console.log(`🚀 Deploying Safe for ${account.address}`);
  
    const safeImplementationAddress = await deployContract(SAFE_ABI, SAFE_BYTECODE);
    console.log(`✅ Safe implementation deployed at: ${safeImplementationAddress}`);
  
    const proxyFactoryAddress = await deployContract(SAFE_PROXY_FACTORY_ABI, SAFE_PROXY_FACTORY_BYTECODE);
    console.log(`✅ Proxy Factory deployed at: ${proxyFactoryAddress}`);
  
    const owners = [account.address];
    const threshold = 1n;
    const setupCalldata = encodeFunctionData({
      abi: SAFE_ABI,
      functionName: 'setup',
      args: [owners, threshold, "0x0000000000000000000000000000000000000000", "0x", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", 0n, "0x0000000000000000000000000000000000000000"],
    });
  
    const saltNonce = BigInt(Date.now());
    const gasEstimate = await publicClient.estimateContractGas({
      address: proxyFactoryAddress,
      abi: SAFE_PROXY_FACTORY_ABI,
      functionName: 'createProxyWithNonce',
      args: [safeImplementationAddress, setupCalldata, saltNonce],
      account: aliceAccount.address,
    });
  
    const createProxyTx = await walletClient.writeContract({
      address: proxyFactoryAddress,
      abi: SAFE_PROXY_FACTORY_ABI,
      functionName: 'createProxyWithNonce',
      args: [safeImplementationAddress, setupCalldata, saltNonce],
      gas: gasEstimate + 50000n,
    })
  
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createProxyTx });
    const safeAddress = receipt.logs && receipt.logs.length > 0 ? receipt.logs[0].address : null;
  
    if (!safeAddress) throw new Error("Failed to extract Safe address from receipt");
  
    console.log(`✅ Safe deployed at: ${safeAddress}`);
  
    return { safeAddress, ownerAddress: account.address };
  }
  
  module.exports = {
    deploySafeForUser,
  };
  