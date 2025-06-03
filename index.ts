// server.js
import { serve } from "bun";
import express from "express";
import errorHandler from "./middleware/errorHandler.js";
import utils from "./utils/index.js";
import { startPolling } from "./poller/messagePoller.js";
import "./db/init.js"; // DB setup
import { createSendMessageUIScript } from './utils/index.js';


// DStack imports
import { TappdClient } from "@phala/dstack-sdk";
import { toViemAccount } from '@phala/dstack-sdk/viem';
import { toKeypair } from '@phala/dstack-sdk/solana';

const port = process.env.PORT || 3000;
const expressPort = 4000;

// 1. Start Bun server for tappd routes
serve({
  port,

  routes: {
    "/": async () => {
      const client = new TappdClient();
      const result = await client.info();
      return new Response(JSON.stringify({
        ...result,
        neroChain: {
          network: NERO_CHAIN_CONFIG.chainName,
          chainId: NERO_CHAIN_CONFIG.chainId,
          rpcUrl: NERO_CHAIN_CONFIG.rpcUrl
        }
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },

    "/tdx_quote": async () => {
      const client = new TappdClient();
      const result = await client.tdxQuote('test');
      return new Response(JSON.stringify(result));
    },

    "/tdx_quote_raw": async () => {
      const client = new TappdClient();
      const result = await client.tdxQuote('Hello DStack!', 'raw');
      return new Response(JSON.stringify(result));
    },

    "/derive_key": async () => {
      const client = new TappdClient();
      const result = await client.deriveKey('test');
      return new Response(JSON.stringify(result));
    },

    "/ethereum": async () => {
      const client = new TappdClient();
      const result = await client.deriveKey('ethereum');
      const viemAccount = toViemAccount(result);
      return new Response(JSON.stringify({ address: viemAccount.address }));
    },

    "/solana": async () => {
      const client = new TappdClient();
      const result = await client.deriveKey('solana');
      const solanaAccount = toKeypair(result);
      return new Response(JSON.stringify({ address: solanaAccount.publicKey.toBase58() }));
    }
  },
});

// 2. Start Express app separately
const app = express();

// Create Apple Script for sending messages
utils.createSendMessageUIScript();

app.use(express.json());


app.use(errorHandler);

// Initialize services
createSendMessageUIScript();

// Start message polling with NERO Chain integration
console.log("🔧 Starting NERO Chain AA message polling...");
startPolling(1000); // Poll every 1 second

app.listen(expressPort, () => {
  console.log(`✅ Express server running on http://localhost:${expressPort}`);
  console.log(`🌐 NERO Chain integration active`);
  console.log(`📚 API Documentation available at http://localhost:${expressPort}`);
});