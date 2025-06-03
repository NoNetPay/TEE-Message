import { serve } from "bun";
import express from "express";
import errorHandler from "./middleware/errorHandler.js";
import utils from "./utils/index.js";
import { startPolling } from "./poller/messagePoller";
import "./db/init"; // DB setup
import {createSendMessageUIScript} from './utils/index.js'

import { TappdClient } from "@phala/dstack-sdk";
import { toViemAccount } from '@phala/dstack-sdk/viem';
import { toKeypair } from '@phala/dstack-sdk/solana';

const port = process.env.PORT || 3000;
const expressPort = 4000; // Or run both on same port with different paths (see below)

console.log(`Bun DStack Server listening on port ${port}`);
console.log(`Express iMessage API running on port ${expressPort}`);

// 1. Start Bun server for tappd routes
serve({
  port,

  routes: {
    "/": async () => {
      const client = new TappdClient();
      const result = await client.info();
      return new Response(JSON.stringify(result), {
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
    },
  },
});

// 2. Start Express app separately
const app = express();
utils.createSendMessageUIScript();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "iMessage API Server Running" });
});

app.use(errorHandler);
createSendMessageUIScript();
startPolling(1000); // every 1s

app.listen(expressPort, () => {
  console.log(`Express server running on http://localhost:${expressPort}`);
});
