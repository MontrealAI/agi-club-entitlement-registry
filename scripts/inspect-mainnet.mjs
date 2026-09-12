/** Read-only post-deployment identity check. No transactions. */
import assert from 'node:assert/strict';import fs from 'node:fs';import {network} from 'hardhat';import {ethers} from 'ethers';
import {checkProduction,save} from './runtime.mjs';
const connection=await network.create(),provider=new ethers.BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});
try {
 assert.equal(connection.networkName,'mainnet');assert(process.env.REGISTRY_ADDRESS&&process.env.EXPECTED_ADMIN,'Set REGISTRY_ADDRESS and EXPECTED_ADMIN');
 const expected=fs.existsSync('.local/deployment-plan.json')?JSON.parse(fs.readFileSync('.local/deployment-plan.json','utf8')).runtimeCodeHash:process.env.EXPECTED_RUNTIME_HASH;
 assert(typeof expected==='string'&&/^0x[0-9a-f]{64}$/i.test(expected),'Supply a reviewed expected runtime hash; do not trust any contract having the same getters');
 const [finalized,latest]=await Promise.all([provider.getBlock('finalized'),provider.getBlock('latest')]);
 for(const block of [finalized,latest])assert(block&&Number.isSafeInteger(block.number)&&block.number>=0&&/^0x[0-9a-f]{64}$/i.test(block.hash),'Complete canonical block identity required');
 assert(finalized.number<=latest.number,'Invalid finalized/latest block order');
 // Code, registry getters and canonical ENS authority must all agree at each pinned state.
 const [finalIdentity,result]=await Promise.all([finalized,latest].map(block=>checkProduction(provider,process.env.REGISTRY_ADDRESS,process.env.EXPECTED_ADMIN,expected,block.number)));
 assert.equal(finalIdentity.admin.toLowerCase(),result.admin.toLowerCase(),'Root transfer is not finalized');
 for(const block of [finalized,latest])assert.equal((await provider.getBlock(block.number))?.hash,block.hash,'Canonical block changed during inspection; retry the read-only check');
 assert.equal((await provider.getNetwork()).chainId,1n,'Ethereum mainnet chainId required');
 const report={...result,finalizedBlock:{number:finalized.number,hash:finalized.hash},latestBlock:{number:latest.number,hash:latest.hash},finalityVerified:true,status:'IDENTITY_CHECK_PASS_NOT_BROAD_LAUNCH_AUTHORIZATION'};
 save('.local/post-deployment.json',report);console.log(report);
} finally {provider.destroy();await connection.close();}
