require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hashkeyTestnet: {
      url: process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz",
      accounts: [PRIVATE_KEY],
      chainId: 133,
    },
    hashkeyMainnet: {
      url: process.env.HASHKEY_MAINNET_RPC || "https://mainnet.hsk.xyz",
      accounts: [PRIVATE_KEY],
      chainId: 177,
    },
  },
};
