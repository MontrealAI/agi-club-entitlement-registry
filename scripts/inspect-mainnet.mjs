/** Read-only creation and identity check; the disposable deployer is untrusted. */
import assert from 'node:assert/strict';import fs from 'node:fs';import {network} from 'hardhat';import {ethers} from 'ethers';
import {randomUUID} from 'node:crypto';
import {checkProduction,save} from './runtime.mjs';
import {validatePlan} from '../shared/deployment-policy.mjs';
import {checkDeploymentOrigin} from './deployment-origin.mjs';
const reportFile='.local/post-deployment.json';
if(fs.existsSync(reportFile))fs.renameSync(reportFile,'.local/post-deployment-'+randomUUID()+'.json');
save(reportFile,{status:'INCOMPLETE',finalityVerified:false,creationVerified:false});
const connection=await network.create(),provider=new ethers.BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});
try {
 assert.equal(connection.networkName,'mainnet');assert(process.env.REGISTRY_ADDRESS&&process.env.EXPECTED_ADMIN,'Set REGISTRY_ADDRESS and EXPECTED_ADMIN');
 const plan=fs.existsSync('.local/deployment-plan.json')?JSON.parse(fs.readFileSync('.local/deployment-plan.json','utf8')):null;
 // Historical inspection checks plan structure at its original time, without renewing or authorizing it.
 if(plan){validatePlan(plan,plan.createdAt);assert.equal(process.env.REGISTRY_ADDRESS.toLowerCase(),plan.predictedAddress,'Registry address differs from the reviewed plan');}
 const expected=plan?.runtimeCodeHash??process.env.EXPECTED_RUNTIME_HASH;
 assert(typeof expected==='string'&&/^0x[0-9a-f]{64}$/i.test(expected),'Supply a reviewed expected runtime hash; do not trust any contract having the same getters');
 let transactionHash=process.env.DEPLOYMENT_TRANSACTION_HASH;
 if(fs.existsSync('.local/deployment-broadcast.json')){
  const checkpoint=JSON.parse(fs.readFileSync('.local/deployment-broadcast.json','utf8'));
  assert(checkpoint.schema==='AGIClubBroadcastCheckpoint/1'&&checkpoint.chainId===1,'Invalid deployment checkpoint');
  if(transactionHash)assert.equal(transactionHash.toLowerCase(),checkpoint.transactionHash?.toLowerCase(),'Transaction hash conflicts with the retained checkpoint');
  if(plan)for(const field of ['deployer','admin','nonce','predictedAddress','creationCodeHash','runtimeCodeHash','sourceSha256'])assert.equal(checkpoint[field],plan[field],'Checkpoint differs from the reviewed plan: '+field);
  transactionHash=checkpoint.transactionHash;
 }
 const creation={transactionHash,registryAddress:process.env.REGISTRY_ADDRESS,deployer:plan?.deployer??process.env.DEPLOYER_ADDRESS,creationCodeHash:plan?.creationCodeHash??process.env.EXPECTED_CREATION_HASH};
 if(plan)for(const field of ['nonce','gasLimit','maxFeePerGas','maxPriorityFeePerGas'])creation[field]=plan[field];
 assert.notEqual(creation.deployer?.toLowerCase(),process.env.EXPECTED_ADMIN.toLowerCase(),'The compromised deployer must not hold root authority');
 const [finalized,latest]=await Promise.all([provider.getBlock('finalized'),provider.getBlock('latest')]);
 for(const block of [finalized,latest])assert(block&&Number.isSafeInteger(block.number)&&block.number>=0&&/^0x[0-9a-f]{64}$/i.test(block.hash),'Complete canonical block identity required');
 assert(finalized.number<=latest.number,'Invalid finalized/latest block order');
 const origin=await checkDeploymentOrigin(provider,creation,ethers,finalized.number);
 // Code, registry getters and canonical ENS authority must all agree at each pinned state.
 const [finalIdentity,result]=await Promise.all([finalized,latest].map(block=>checkProduction(provider,process.env.REGISTRY_ADDRESS,process.env.EXPECTED_ADMIN,expected,block.number)));
 assert.equal(finalIdentity.admin.toLowerCase(),result.admin.toLowerCase(),'Root transfer is not finalized');
 for(const block of [finalized,latest,{number:origin.blockNumber,hash:origin.blockHash}])assert.equal((await provider.getBlock(block.number))?.hash,block.hash,'Canonical block changed during inspection; retry the read-only check');
 assert.equal((await provider.getNetwork()).chainId,1n,'Ethereum mainnet chainId required');
 const report={...result,creation:origin,creationVerified:true,deployerHasAdmin:false,finalizedBlock:{number:finalized.number,hash:finalized.hash},latestBlock:{number:latest.number,hash:latest.hash},finalityVerified:true,status:'CREATION_AND_IDENTITY_CHECK_PASS_NOT_LAUNCH_AUTHORIZATION'};
 save(reportFile,report);console.log(report);
} finally {provider.destroy();await connection.close();}
