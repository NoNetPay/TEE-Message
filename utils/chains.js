const { defineChain } = require("viem");

const neroDevnet = defineChain({
  id: 50002,
  name: "nero Devnet",
  network: "nero-devnet",
  nativeCurrency: {
    decimals: 18,
    name: "nero",
    symbol: "nero",
  },
  rpcUrls: {
    default: {
      http: ["https://devnet.dplabs-internal.com"],
      webSocket: ["wss://devnet.dplabs-internal.com"],
    },
    public: {
      http: ["https://devnet.dplabs-internal.com"],
      webSocket: ["wss://devnet.dplabs-internal.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "blockscan",
      url: "https://blockscan.xyz/",
    },
  },
  testnet: true,
  rateLimit: "500 times/5m",
  maxPendingTxs: 64,
});

module.exports = { neroDevnet };
