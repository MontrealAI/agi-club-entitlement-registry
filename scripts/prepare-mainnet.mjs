/** Creates an UNSIGNED, short-lived exact-bytecode canary plan. Sends no transaction. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {network,artifacts} from 'hardhat';import {ethers} from 'ethers';
import {canonicalAdmin,PROD,save} from './runtime.mjs';import {releaseGate} from './release-gate.mjs';import {validatePlan} from '../shared/deployment-policy.mjs';
const gate=releaseGate();assert.equal(gate.status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW',gate.blockers.join('; '));
const connection=await network.create();const provider=new ethers.BrowserProvider(connection.provider);
try {
 assert.equal(connection.networkName,'mainnet');assert.equal((await provider.getNetwork()).chainId,1n);
 assert(process.env.DEPLOYER_ADDRESS&&process.env.EXPECTED_ADMIN&&process.env.DEPLOY_MAX_COST_ETH,'Set DEPLOYER_ADDRESS, EXPECTED_ADMIN and your DEPLOY_MAX_COST_ETH budget');
 const deployer=ethers.getAddress(process.env.DEPLOYER_ADDRESS),admin=await canonicalAdmin(provider),finalAdmin=await canonicalAdmin(provider,'finalized');
 assert.equal(admin.toLowerCase(),process.env.EXPECTED_ADMIN.toLowerCase());assert.equal(admin,finalAdmin,'Wait for root transfer finality');
 const artifact=await artifacts.readArtifact(PROD);assert(/^0x[0-9a-fA-F]+$/.test(artifact.bytecode));
 const nonce=await provider.getTransactionCount(deployer,'pending');assert.equal(nonce,await provider.getTransactionCount(deployer,'latest'),'Clear pending deployer transactions first');
 const predictedAddress=ethers.getCreateAddress({from:deployer,nonce});assert.equal(await provider.getCode(predictedAddress),'0x');
 const estimate=await provider.estimateGas({from:deployer,data:artifact.bytecode,value:0});const gasLimit=(estimate*120n+99n)/100n;
 const fee=await provider.getFeeData();assert(fee.maxFeePerGas&&fee.maxPriorityFeePerGas,'EIP-1559 fee estimate required');const maxCostWei=gasLimit*fee.maxFeePerGas;
 assert(maxCostWei<=ethers.parseEther(process.env.DEPLOY_MAX_COST_ETH),'Estimated ceiling exceeds your budget');
 const fork=JSON.parse(fs.readFileSync('qualification/mainnet-fork.json','utf8'));
 const plan={schema:'AGIClubDeploymentPlan/1',chainId:1,contract:PROD,sourceSha256:gate.sourceSha256,creationCodeHash:ethers.keccak256(artifact.bytecode),runtimeCodeHash:fork.identity.runtimeCodeHash.toLowerCase(),deployer:deployer.toLowerCase(),admin:admin.toLowerCase(),nonce:String(nonce),predictedAddress:predictedAddress.toLowerCase(),gasLimit:String(gasLimit),maxFeePerGas:String(fee.maxFeePerGas),maxPriorityFeePerGas:String(fee.maxPriorityFeePerGas),maxCostWei:String(maxCostWei),createdAt:Math.floor(Date.now()/1000),expiresAt:Math.floor(Date.now()/1000)+1800,evidenceSha256:gate.evidenceSha256};
 validatePlan(plan);save('.local/deployment-plan.json',plan);
 console.log('UNSIGNED CANARY PLAN — no transaction sent');console.log(JSON.stringify(plan,null,2));console.log('Review reports and plan, then sign through dist/site/deployment.html on the trusted origin.');
} finally {provider.destroy();await connection.close();}
