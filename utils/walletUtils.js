// Example of using the nero Devnet with Viem
const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { neroDevnet } = require("./chains"); // Import our custom chain

const publicClient = createPublicClient({
  chain: neroDevnet,
  transport: http(),
});

async function getCurrentBlockNumber() {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Current block number: ${blockNumber}`);
    return blockNumber;
  } catch (error) {
    console.error("Error getting block number:", error);
  }
}

function createWallet(privateKey) {
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: neroDevnet,
    transport: http(),
  });
}

async function sendTransaction(walletClient, toAddress, amount) {
  try {
    const hash = await walletClient.sendTransaction({
      to: toAddress,
      value: amount,
    });

    console.log(`Transaction sent with hash: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    console.log("Transaction confirmed:", receipt);
    return receipt;
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}



// Uncomment to run the example
// main().catch(console.error);

module.exports = {
  getCurrentBlockNumber,
  createWallet,
  sendTransaction,
  publicClient,
};
