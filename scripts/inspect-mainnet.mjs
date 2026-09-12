/** Read-only post-deployment identity check. No transactions. */
import assert from 'node:assert/strict';import fs from 'node:fs';import {network} from 'hardhat';import {ethers} from 'ethers';
import {checkProduction,save} from './runtime.mjs';
const connection=await network.create(),provider=new ethers.BrowserProvider(connection.provider);
try {
 assert.equal(connection.networkName,'mainnet');assert(process.env.REGISTRY_ADDRESS&&process.env.EXPECTED_ADMIN,'Set REGISTRY_ADDRESS and EXPECTED_ADMIN');
 const expected=fs.existsSync('.local/deployment-plan.json')?JSON.parse(fs.readFileSync('.local/deployment-plan.json','utf8')).runtimeCodeHash:process.env.EXPECTED_RUNTIME_HASH;
 assert(expected,'Supply a reviewed expected runtime hash; do not trust any contract having the same getters');
 const result=await checkProduction(provider,process.env.REGISTRY_ADDRESS,process.env.EXPECTED_ADMIN,expected),finalized=await provider.getBlock('finalized');assert(finalized);
 assert.equal(ethers.keccak256(await provider.getCode(result.address,finalized.number)),expected,'Contract not yet present at finalized state or wrong runtime');
 save('.local/post-deployment.json',{...result,finalizedBlock:{number:finalized.number,hash:finalized.hash},status:'IDENTITY_CHECK_PASS_NOT_BROAD_LAUNCH_AUTHORIZATION'});console.log(result);
} finally {provider.destroy();await connection.close();}
