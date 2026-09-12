/** Explicit empty-registry deployment ONLY. No CI deploy, no hard-coded key, no deployer admin privileges. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {network,artifacts} from 'hardhat';import {ethers} from 'ethers';
import {PROD,save,canonicalAdmin,checkProduction} from './runtime.mjs';import {releaseGate} from './release-gate.mjs';
import {deploymentMessage,validatePlan} from '../shared/deployment-policy.mjs';
import {reserveBroadcast} from './broadcast-record.mjs';
assert(!process.env.CI,'Mainnet broadcasting from CI is intentionally disabled');
assert.equal(process.env.AGI_MAINNET_SEND,'I_APPROVE_THIS_EMPTY_REGISTRY','Explicit one-time broadcast phrase missing');
const checkpoint='.local/deployment-broadcast.json';
assert(!fs.existsSync(checkpoint),'Deployment checkpoint already exists. Inspect its transaction hash; do not repeat or overwrite a deployment attempt');
const gate=releaseGate();assert.equal(gate.status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW',gate.blockers.join('; '));assert.equal(gate.deploymentScope,'EMPTY_REGISTRY_ONLY','Only empty-registry deployment evidence is accepted');
const packet=JSON.parse(fs.readFileSync('.local/deployment-approval.json','utf8'));assert.deepEqual(Object.keys(packet).sort(),['message','plan','signature']);
const plan=validatePlan(packet.plan),message=deploymentMessage(plan);assert.equal(packet.message,message);
assert.equal(plan.sourceSha256,gate.sourceSha256);assert.equal(plan.evidenceSha256,gate.evidenceSha256);
assert.equal(plan.creationCodeHash,gate.qualifiedBytecode.creationCodeHash,'Approval does not match qualified creation code');assert.equal(plan.runtimeCodeHash,gate.qualifiedBytecode.runtimeCodeHash,'Approval does not match qualified runtime');assert.equal(plan.admin,gate.qualifiedBytecode.admin,'Approval does not match qualified root holder');
const connection=await network.create();const provider=new ethers.BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});provider.pollingInterval=4000;
try {
 assert.equal(connection.networkName,'mainnet');assert.equal((await provider.getNetwork()).chainId,1n);
 const artifact=await artifacts.readArtifact(PROD);assert.equal(ethers.keccak256(artifact.bytecode),plan.creationCodeHash);
 const checkApproval=async()=>{for(const tag of ['finalized','latest']){
  assert.equal((await canonicalAdmin(provider,tag)).toLowerCase(),plan.admin,'Root administrator changed');
  if(await provider.getCode(plan.admin,tag)==='0x')assert.equal(ethers.verifyMessage(message,packet.signature).toLowerCase(),plan.admin,'Wrong approval signer');
  else {const verifier=new ethers.Contract(plan.admin,['function isValidSignature(bytes32,bytes) view returns(bytes4)'],provider);assert.equal(await verifier.isValidSignature(ethers.hashMessage(message),packet.signature,{blockTag:tag}),'0x1626ba7e','Contract-wallet approval rejected');}
 }};
 await checkApproval();
 assert(process.env.DEPLOYER_KEYSTORE&&process.env.DEPLOYER_KEYSTORE_PASSWORD,'Encrypted deployer keystore and local password required');
 const key=JSON.parse(fs.readFileSync(process.env.DEPLOYER_KEYSTORE,'utf8'));assert(key.crypto||key.Crypto,'Only encrypted JSON keystores accepted');
 const signer=(await ethers.Wallet.fromEncryptedJson(JSON.stringify(key),process.env.DEPLOYER_KEYSTORE_PASSWORD)).connect(provider);
 assert.equal((await signer.getAddress()).toLowerCase(),plan.deployer,'Wrong deployer');
 assert.equal(BigInt(await provider.getTransactionCount(plan.deployer,'pending')),BigInt(plan.nonce),'Deployer nonce changed; create and sign a fresh plan');
 assert.equal(await provider.getCode(plan.predictedAddress),'0x','Target already has code; inspect, do not redeploy');
 assert.equal(ethers.getCreateAddress({from:plan.deployer,nonce:BigInt(plan.nonce)}).toLowerCase(),plan.predictedAddress);
 const txRequest={type:2,chainId:1,nonce:Number(plan.nonce),data:artifact.bytecode,value:0,gasLimit:BigInt(plan.gasLimit),maxFeePerGas:BigInt(plan.maxFeePerGas),maxPriorityFeePerGas:BigInt(plan.maxPriorityFeePerGas)};
 assert((await provider.estimateGas({...txRequest,from:plan.deployer}))<=BigInt(plan.gasLimit),'Gas estimate exceeded signed limit');
 assert((await provider.getBalance(plan.deployer))>=BigInt(plan.maxCostWei),'Insufficient deployer balance');
 // Sign the complete bounded transaction locally so its recovery hash is known before RPC submission.
 const signedTransaction=await signer.signTransaction(txRequest),transactionHash=ethers.keccak256(signedTransaction);
 for(const tag of ['pending','latest'])assert.equal(BigInt(await provider.getTransactionCount(plan.deployer,tag)),BigInt(plan.nonce),'Deployer nonce changed; inspect before creating a fresh plan');
 // ERC-1271 validity can change during keystore decryption and RPC preflight.
 await checkApproval();
 // Revalidate time and evidence after the final asynchronous reads, before the ONLY network write.
 validatePlan(plan);const finalGate=releaseGate();assert.equal(finalGate.status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW');assert.equal(finalGate.sourceSha256,plan.sourceSha256);assert.equal(finalGate.evidenceSha256,plan.evidenceSha256);
 reserveBroadcast(checkpoint,{schema:'AGIClubBroadcastCheckpoint/1',chainId:1,transactionHash,deployer:plan.deployer,admin:plan.admin,nonce:plan.nonce,predictedAddress:plan.predictedAddress,creationCodeHash:plan.creationCodeHash,runtimeCodeHash:plan.runtimeCodeHash,sourceSha256:plan.sourceSha256,status:'SIGNED_SUBMISSION_OUTCOME_UNCONFIRMED'});
 validatePlan(plan);
 console.log('Recovery checkpoint saved:',transactionHash,'An RPC error does not prove this transaction was rejected.');
 const tx=await provider.broadcastTransaction(signedTransaction);
 assert.equal(tx.hash,transactionHash,'RPC returned a different transaction hash; inspect the checkpoint');
 console.log('Broadcast:',tx.hash,'Do not repeat this command if confirmation is interrupted.');
 const receipt=await tx.wait(2,180000);assert.equal(receipt?.status,1,'Failed or unconfirmed deployment; inspect broadcast record');
 assert.equal(receipt.contractAddress?.toLowerCase(),plan.predictedAddress);
 const checked=await checkProduction(provider,receipt.contractAddress,plan.admin,plan.runtimeCodeHash);
 save('.local/mainnet-deployment.json',{...checked,transactionHash:tx.hash,blockNumber:receipt.blockNumber,blockHash:receipt.blockHash,finalityVerified:false,scope:'LATEST_IDENTITY_ONLY; run inspect:mainnet for finalized verification',sourceSha256:plan.sourceSha256,broadMemberLaunchAuthorized:false});
 console.log('Runtime and authority verified at latest observed state. Wait for finality, verify source on Etherscan, keep the registry empty until a chosen benefit passes launch:gate and separate root review. Broad access remains closed.');
} finally {provider.destroy();await connection.close();}
