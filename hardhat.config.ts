import { defineConfig, configVariable } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) loadEnvFile(".env");
const require = createRequire(import.meta.url);
// Use the exact npm-pinned compiler, not an implicit remote compiler download.
const compiler = {
  version: "0.8.37",
  path: require.resolve("solc/soljson.js"),
  settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "shanghai" },
};
const forkBlock = process.env.MAINNET_FORK_BLOCK;
if (forkBlock && (!/^\d+$/.test(forkBlock) || !Number.isSafeInteger(Number(forkBlock)) || Number(forkBlock) <= 0)) {
  throw new Error("MAINNET_FORK_BLOCK must be a positive safe integer.");
}
export default defineConfig({
  plugins: [hardhatVerify],
  paths: { sources: "./contracts", artifacts: "./artifacts", cache: "./cache" },
  solidity: { profiles: { default: { ...compiler }, production: { ...compiler } } },
  networks: {
    hardhat: { type: "edr-simulated", chainType: "l1", chainId: 31337, hardfork: "shanghai" },
    // Chain ID 1 here is a LOCAL model, never actual Ethereum. Used only by journey-tests.mjs.
    isolatedMainnetModel: { type: "edr-simulated", chainType: "l1", chainId: 1, hardfork: "shanghai" },
    localhost: { type: "http", chainType: "l1", chainId: 31337, url: "http://127.0.0.1:8545" },
    // Empty accounts: public RPC credentials never become deployment authority.
    mainnet: { type: "http", chainType: "l1", chainId: 1, url: configVariable("MAINNET_RPC_URL"), accounts: [] },
    ...(process.env.MAINNET_FORK_RPC_URL && forkBlock ? {
      ensFork: {
        type: "edr-simulated" as const, chainType: "l1" as const, chainId: 1,
        forking: { url: process.env.MAINNET_FORK_RPC_URL, blockNumber: Number(forkBlock) },
      },
    } : {}),
  },
  verify: { etherscan: { apiKey: configVariable("ETHERSCAN_API_KEY") } },
});
