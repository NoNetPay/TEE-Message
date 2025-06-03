import { ethers } from "ethers";
import { getAddress } from "viem";

// config/neroConfig.js
export const NERO_CHAIN_CONFIG = {
  chainId: 689,
  chainName: "NERO Chain Testnet",
  rpcUrl: "https://rpc-testnet.nerochain.io",
  currency: "NERO",
  explorer: "https://testnet.neroscan.io"
};

export const AA_PLATFORM_CONFIG = {
  bundlerRpc: "https://bundler-testnet.nerochain.io/",
  paymasterRpc: "https://paymaster-testnet.nerochain.io",
};

export const CONTRACT_ADDRESSES = {
  entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  accountFactory: getAddress("0x9406cc6185a346906296840746125a0e44976454"),
};