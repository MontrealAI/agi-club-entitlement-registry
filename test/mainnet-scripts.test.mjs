import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {deploymentMessage,validatePlan} from '../shared/deployment-policy.mjs';

const hash=n=>'0x'+n.repeat(64),address=n=>'0x'+n.repeat(40);
const PROD='contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet';
function fixture() {
 // No Hardhat connection, filesystem writes, real key, or network transport exists in this VM.
 const now=Math.floor(Date.now()/1000),waits=new Map(),sent=[],saved=[],validations=[],providers=[];
 const state={now,admin:address('4'),valid:true,bytecode:'0x6000',nonce:0,closed:false,decryptions:0};
 const plan={schema:'AGIClubDeploymentPlan/1',chainId:1,contract:PROD,sourceSha256:'a'.repeat(64),creationCodeHash:hash('1'),runtimeCodeHash:hash('2'),deployer:address('3'),admin:state.admin,nonce:'0',predictedAddress:address('5'),gasLimit:'100',maxFeePerGas:'5',maxPriorityFeePerGas:'1',maxCostWei:'500',createdAt:now,expiresAt:now+1800,evidenceSha256:'b'.repeat(64)};
 const gate={status:'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW',sourceSha256:plan.sourceSha256,evidenceSha256:plan.evidenceSha256,blockers:[],qualifiedBytecode:{creationCodeHash:plan.creationCodeHash,runtimeCodeHash:plan.runtimeCodeHash,admin:plan.admin}};
 const boundary=async name=>{const wait=waits.get(name);if(wait){waits.delete(name);wait.started.resolve();await wait.pending.promise;}};
 const signer={connect(){return this;},getAddress:async()=>plan.deployer,sendTransaction:async request=>{sent.push(request);return {hash:hash('8'),wait:async()=>({status:1,contractAddress:plan.predictedAddress,blockNumber:100,blockHash:hash('9')})};}};
 const ethers={keccak256:code=>code==='0x6000'?hash('1'):hash('7'),getAddress:value=>value,getCreateAddress:()=>plan.predictedAddress,hashMessage:()=>hash('6'),parseEther:()=>500n,
  Wallet:{fromEncryptedJson:async()=>{state.decryptions++;await boundary('decrypt');return signer;}},
  Contract:class{async isValidSignature(_message,_signature,{blockTag}){validations.push(blockTag);if(validations.length===4)await boundary('finalApproval');return state.valid?'0x1626ba7e':'0xffffffff';}},
  BrowserProvider:class{constructor(_provider,_network,options){this.options=options;providers.push(this);}getNetwork=async()=>({chainId:1n});getCode=async account=>account===plan.admin?'0x6001':'0x';getTransactionCount=async()=>state.nonce;estimateGas=async()=>50n;getFeeData=async()=>({maxFeePerGas:5n,maxPriorityFeePerGas:1n});getBalance=async()=>500n;getBlock=async()=>({number:200});destroy(){this.destroyed=true;}},
 };
 const env={AGI_MAINNET_SEND:'I_APPROVE_THIS_LIMITED_CANARY',DEPLOYER_KEYSTORE:'.local/fixture-keystore.json',DEPLOYER_KEYSTORE_PASSWORD:'UNIT_TEST_ONLY',DEPLOYER_ADDRESS:plan.deployer,EXPECTED_ADMIN:plan.admin,DEPLOY_MAX_COST_ETH:'0.0000000000000005'};
 return {state,plan,gate,sent,saved,validations,providers,
  pause:name=>{const started=Promise.withResolvers(),pending=Promise.withResolvers();waits.set(name,{started,pending});return {started:started.promise,release:pending.resolve};},
  run:async name=>{
   const script=readFileSync(new URL('../scripts/'+name+'-mainnet.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
   return runInNewContext('(async()=>{\n'+script+'\n})()',{
    assert,PROD,ethers,process:{env},console:{log(){}},
    network:{create:async()=>({networkName:'mainnet',provider:{},close:async()=>{state.closed=true;}})},artifacts:{readArtifact:async()=>({bytecode:state.bytecode})},
    fs:{readFileSync:file=>{if(file===env.DEPLOYER_KEYSTORE)return JSON.stringify({crypto:{cipher:'unit-test-placeholder'}});if(file==='.local/deployment-approval.json')return JSON.stringify({plan,message:deploymentMessage(plan,state.now),signature:'0x'+'11'.repeat(65)});throw Error('Unexpected file read in isolated test');}},
    releaseGate:()=>structuredClone(gate),canonicalAdmin:async()=>state.admin,checkProduction:async()=>({address:plan.predictedAddress,chainId:1}),save:(file,report)=>saved.push({file,report}),
    validatePlan:p=>validatePlan(p,state.now),deploymentMessage:p=>deploymentMessage(p,state.now),
   },{filename:'scripts/'+name+'-mainnet.mjs'});
  },
 };
}
test('Deployment script validates contract approval again after decryption and closes the connection',async()=>{
 const f=fixture();await f.run('deploy');assert.equal(f.sent.length,1);assert.deepEqual(f.validations,['finalized','latest','finalized','latest']);assert(f.state.closed);assert(f.providers.every(p=>p.destroyed&&p.options.cacheTimeout===-1));
});
test('Revoked contract-wallet approval during decryption prevents broadcast',async()=>{
 const f=fixture(),wait=f.pause('decrypt'),run=f.run('deploy');await wait.started;f.state.valid=false;wait.release();await assert.rejects(run,/Contract-wallet approval rejected/);assert.equal(f.sent.length,0);assert(f.state.closed);
});
test('Root transfer during decryption prevents broadcast',async()=>{
 const f=fixture(),wait=f.pause('decrypt'),run=f.run('deploy');await wait.started;f.state.admin=address('6');wait.release();await assert.rejects(run,/Root administrator changed/);assert.equal(f.sent.length,0);
});
test('Plan expiry during the final approval RPC prevents broadcast',async()=>{
 const f=fixture(),wait=f.pause('finalApproval'),run=f.run('deploy');await wait.started;f.state.now+=3600;wait.release();await assert.rejects(run);assert.equal(f.sent.length,0);
});
test('Evidence mutation during decryption prevents broadcast',async()=>{
 const f=fixture(),wait=f.pause('decrypt'),run=f.run('deploy');await wait.started;f.gate.evidenceSha256='c'.repeat(64);wait.release();await assert.rejects(run);assert.equal(f.sent.length,0);
});
test('A different qualified runtime blocks broadcast before unlocking a key',async()=>{
 const f=fixture();f.gate.qualifiedBytecode.runtimeCodeHash=hash('7');await assert.rejects(f.run('deploy'),/qualified runtime/);assert.equal(f.sent.length,0);assert.equal(f.state.decryptions,0);
});
test('Unsigned preparation binds the qualified artifact and never accesses a key',async()=>{
 const f=fixture();await f.run('prepare');assert.equal(f.sent.length,0);assert.equal(f.state.decryptions,0);assert.equal(f.saved.length,1);assert.equal(f.saved[0].report.creationCodeHash,f.gate.qualifiedBytecode.creationCodeHash);assert(f.state.closed);
});
test('Substituted build artifact cannot produce an unsigned plan',async()=>{
 const f=fixture();f.state.bytecode='0x6002';await assert.rejects(f.run('prepare'),/Artifact differs/);assert.equal(f.saved.length,0);assert.equal(f.sent.length,0);assert(f.state.closed);
});
test('A new root holder requires a fresh fork qualification before planning',async()=>{
 const f=fixture();f.gate.qualifiedBytecode.admin=address('6');await assert.rejects(f.run('prepare'),/Root holder differs/);assert.equal(f.saved.length,0);
});
