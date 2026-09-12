import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validatePlan,deploymentMessage,PLAN_FIELDS} from '../shared/deployment-policy.mjs';
import {releaseGate} from '../scripts/release-gate.mjs';
import {revertData} from './revert-data.mjs';
const NOW=1789156800;
const plan=()=>({schema:'AGIClubDeploymentPlan/1',chainId:1,contract:'contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet',sourceSha256:'a'.repeat(64),creationCodeHash:'0x'+'11'.repeat(32),runtimeCodeHash:'0x'+'22'.repeat(32),deployer:'0x'+'33'.repeat(20),admin:'0x'+'44'.repeat(20),nonce:'0',predictedAddress:'0x'+'55'.repeat(20),gasLimit:'100',maxFeePerGas:'5',maxPriorityFeePerGas:'1',maxCostWei:'500',createdAt:NOW,expiresAt:NOW+1800,evidenceSha256:'b'.repeat(64)});
test('Canary plan has canonical field ordering regardless of JSON insertion order',()=>{const p=plan(),reversed=Object.fromEntries(Object.entries(p).reverse());assert.equal(deploymentMessage(p,NOW),deploymentMessage(reversed,NOW));});
test('Exact limited scope and no implied launch included in approval message',()=>{const m=deploymentMessage(plan(),NOW);assert(m.includes('LIMITED MAINNET CANARY'));assert(m.includes('No member launch'));assert(m.includes('fee ceiling'));});
for(const[field,value]of [['schema','OTHER'],['chainId',31337],['contract','QualificationENS'],['sourceSha256','bad'],['admin','0x'+'00'.repeat(20)],['nonce','-1'],['gasLimit','0'],['maxFeePerGas','0'],['maxPriorityFeePerGas','6'],['maxCostWei','499'],['createdAt',NOW+61],['expiresAt',NOW],['expiresAt',NOW+3601]])test('Malformed plan rejected: '+field+'='+value,()=>{const p=plan();p[field]=value;assert.throws(()=>validatePlan(p,NOW));});
test('Unknown plan fields cannot sneak extra authority into approved packet',()=>assert.throws(()=>validatePlan({...plan(),transfer:true},NOW)));
test('Removing any field fails closed',()=>{for(const f of PLAN_FIELDS){const p=plan();delete p[f];assert.throws(()=>validatePlan(p,NOW),f);}});
test('Deployment helper cannot broadcast from CI and requires exact mainnet acknowledgement',()=>{const s=fs.readFileSync('scripts/deploy-mainnet.mjs','utf8');assert(s.includes('!process.env.CI'));assert(s.includes('I_APPROVE_THIS_LIMITED_CANARY'));assert(s.includes('Wallet.fromEncryptedJson'));assert(s.includes('deploymentMessage(plan)'));assert(s.includes('isValidSignature'));});
test('GitHub workflows never deploy or use repository signing secrets',()=>{for(const f of ['ci.yml','bootstrap-lock.yml']){const s=fs.readFileSync('.github/workflows/'+f,'utf8');assert(!s.includes('pull_request_target'));assert(!s.includes('secrets.'));assert(!s.includes('deploy:mainnet'));assert(s.includes('contents: read'));assert(!s.includes('contents: write'));}});
test('Missing external qualification cannot authorize production',()=>{const g=releaseGate();assert.equal(g.deploymentAuthorized,false);assert(g.blockers.length>0);});
test('Public builder includes genuine ethers and deployment protocol without test crypto',()=>{const s=fs.readFileSync('scripts/package.mjs','utf8');assert(s.includes('require.resolve(\'ethers\')'));assert(s.includes("'deployment-policy.mjs'"));assert(!s.includes('crypto-reference'));});
test('Deployment model and fork are separate from HTTP mainnet network',()=>{const s=fs.readFileSync('hardhat.config.ts','utf8');assert(s.includes('isolatedMainnetModel'));assert(s.includes('ensFork'));assert(s.includes('accounts: []'));assert(s.includes('solc/soljson.js'));});
test('Plan rejects a nonce which would lose precision when constructing the transaction',()=>{const p=plan();p.nonce='9007199254740992';assert.throws(()=>validatePlan(p,NOW));});
test('Plan rejects gas values beyond the uint256 range',()=>{const p=plan();p.gasLimit=(1n<<256n).toString();assert.throws(()=>validatePlan(p,NOW));});
test('Revert evidence supports ethers, legacy RPC and Hardhat 3 nested data',()=>{
 const data='0x40598888'+'00'.repeat(64);
 for(const error of [{data},{data:{data}},{data:{result:data}},{info:{error:{data}}},{info:{error:{data:{result:data}}}},{data:null,info:{error:{code:-32000,data:{reason:{Revert:data},data,transactionHash:null}}}}])assert.equal(revertData(error),data);
});
test('Transport messages and transaction calldata cannot stand in for a Solidity rejection',()=>{
 const data='0x40598888'+'00'.repeat(64);
 for(const error of [new Error('network unavailable'),{message:'reverted: '+data},{transaction:{data}},{info:{payload:{params:[{data}]}}},{data:'0x'},{data:'0x123'},{data:'0xnothex00'}])assert.throws(()=>revertData(error),/missing Solidity revert data/);
});
