import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {deploymentMessage,validatePlan} from '../shared/deployment-policy.mjs';
import {reserveBroadcast} from '../scripts/broadcast-record.mjs';
import {checkDeploymentOrigin} from '../scripts/deployment-origin.mjs';

const hash=n=>'0x'+n.repeat(64),address=n=>'0x'+n.repeat(40);
const PROD='contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet';
function fixture() {
 // No Hardhat connection, filesystem writes, real key, or network transport exists in this VM.
 const now=Math.floor(Date.now()/1000),waits=new Map(),sent=[],saved=[],validations=[],providers=[];
 const state={now,admin:address('4'),valid:true,bytecode:'0x6000',nonce:0,closed:false,decryptions:0,checkpoint:null,checkpointError:false,broadcastError:false,finalizedNumber:100,latestNumber:104,reorg:false,finalAdmin:null,missingFinalCode:false,creationMissing:false,creationData:'0x6000',creationReceiptStatus:1,creationHash:hash('8'),creationFrom:address('3'),creationNonce:0,creationTo:null,creationNumber:99,planPresent:true,postReport:null,archives:[],creationReorgAfterIdentity:false};
 const plan={schema:'AGIClubDeploymentPlan/2',chainId:1,contract:PROD,sourceSha256:'a'.repeat(64),creationCodeHash:hash('1'),runtimeCodeHash:hash('2'),deployer:address('3'),admin:state.admin,nonce:'0',predictedAddress:address('5'),gasLimit:'100',maxFeePerGas:'5',maxPriorityFeePerGas:'1',maxCostWei:'500',createdAt:now,expiresAt:now+1800,evidenceSha256:'b'.repeat(64)};
 const gate={deploymentScope:'EMPTY_REGISTRY_ONLY',status:'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW',sourceSha256:plan.sourceSha256,evidenceSha256:plan.evidenceSha256,blockers:[],qualifiedBytecode:{creationCodeHash:plan.creationCodeHash,runtimeCodeHash:plan.runtimeCodeHash,admin:plan.admin}};
 const boundary=async name=>{const wait=waits.get(name);if(wait){waits.delete(name);wait.started.resolve();await wait.pending.promise;}};
 const signed=[];
 const signer={connect(){return this;},getAddress:async()=>plan.deployer,signTransaction:async request=>{signed.push(request);await boundary('sign');return '0x1234';}};
 const ethers={keccak256:code=>code==='0x6000'?hash('1'):code==='0x1234'?hash('8'):hash('7'),getAddress:value=>value,getCreateAddress:()=>plan.predictedAddress,hashMessage:()=>hash('6'),parseEther:()=>500n,
  Wallet:{fromEncryptedJson:async()=>{state.decryptions++;await boundary('decrypt');return signer;}},
  Contract:class{async isValidSignature(_message,_signature,{blockTag}){validations.push(blockTag);if(validations.length===4)await boundary('finalApproval');return state.valid?'0x1626ba7e':'0xffffffff';}},
  BrowserProvider:class{constructor(_provider,_network,options){this.options=options;providers.push(this);}getNetwork=async()=>({chainId:1n});getCode=async account=>account===plan.admin?'0x6001':'0x';getTransactionCount=async()=>state.nonce;estimateGas=async()=>50n;getFeeData=async()=>({maxFeePerGas:5n,maxPriorityFeePerGas:1n});getBalance=async()=>500n;getTransaction=async()=>state.creationMissing?null:{hash:state.creationHash,chainId:1n,to:state.creationTo,from:state.creationFrom,nonce:state.creationNonce,value:0n,data:state.creationData,type:2,gasLimit:100n,maxFeePerGas:5n,maxPriorityFeePerGas:1n,blockNumber:state.creationNumber,blockHash:hash('c')};getTransactionReceipt=async()=>state.creationMissing?null:{hash:state.creationHash,to:state.creationTo,from:state.creationFrom,status:state.creationReceiptStatus,contractAddress:plan.predictedAddress,blockNumber:state.creationNumber,blockHash:hash('c')};getBlock=async tag=>({transactions:[hash('8')],number:tag==='finalized'?state.finalizedNumber:tag==='latest'?state.latestNumber:tag,hash:hash(state.reorg&&typeof tag==='number'||state.creationReorgAfterIdentity&&identityCalls.length===2&&tag===99?'7':tag===99?'c':tag==='finalized'||tag===state.finalizedNumber?'a':'b')});destroy(){this.destroyed=true;}
   async broadcastTransaction(raw){assert(state.checkpoint,'Checkpoint must precede submission');sent.push(raw);if(state.broadcastError)throw Error('Simulated ambiguous RPC timeout');return {hash:hash('8'),wait:async()=>({status:1,contractAddress:plan.predictedAddress,blockNumber:100,blockHash:hash('a')})};}
  },
 };
 const env={AGI_MAINNET_SEND:'I_APPROVE_THIS_EMPTY_REGISTRY',DEPLOYER_KEYSTORE:'.local/fixture-keystore.json',DEPLOYER_KEYSTORE_PASSWORD:'UNIT_TEST_ONLY',DEPLOYER_ADDRESS:plan.deployer,EXPECTED_ADMIN:plan.admin,DEPLOY_MAX_COST_ETH:'0.0000000000000005',REGISTRY_ADDRESS:plan.predictedAddress,DEPLOYMENT_TRANSACTION_HASH:hash('8'),EXPECTED_CREATION_HASH:plan.creationCodeHash,EXPECTED_RUNTIME_HASH:plan.runtimeCodeHash};
 const identityCalls=[];
 return {state,plan,gate,env,sent,signed,saved,validations,providers,identityCalls,
  pause:name=>{const started=Promise.withResolvers(),pending=Promise.withResolvers();waits.set(name,{started,pending});return {started:started.promise,release:pending.resolve};},
  run:async name=>{
   const script=readFileSync(new URL('../scripts/'+name+'-mainnet.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
   return runInNewContext('(async()=>{\n'+script+'\n})()',{
    assert,PROD,ethers,checkDeploymentOrigin,randomUUID:()=>'fixture-uuid',process:{env},console:{log(){}},
    network:{create:async()=>({networkName:'mainnet',provider:{},close:async()=>{state.closed=true;}})},artifacts:{readArtifact:async()=>({bytecode:state.bytecode})},
    fs:{existsSync:file=>file==='.local/post-deployment.json'&&!!state.postReport||file==='.local/deployment-plan.json'&&state.planPresent||file==='.local/deployment-broadcast.json'&&!!state.checkpoint,renameSync:(from,to)=>{assert.equal(from,'.local/post-deployment.json');state.archives.push({file:to,report:state.postReport});state.postReport=null;},readFileSync:file=>{if(file==='.local/deployment-plan.json')return JSON.stringify(plan);if(file==='.local/deployment-broadcast.json')return JSON.stringify(state.checkpoint);if(file===env.DEPLOYER_KEYSTORE)return JSON.stringify({crypto:{cipher:'unit-test-placeholder'}});if(file==='.local/deployment-approval.json')return JSON.stringify({plan,message:deploymentMessage(plan,state.now),signature:'0x'+'11'.repeat(65)});throw Error('Unexpected file read in isolated test');}},
    reserveBroadcast:(file,record)=>{assert(!state.checkpoint);if(state.checkpointError)throw Error('Simulated checkpoint write failure');state.checkpoint=record;saved.push({file,report:record});},
    releaseGate:()=>structuredClone(gate),canonicalAdmin:async()=>state.admin,checkProduction:async(_provider,checkedAddress,admin,runtimeHash,blockTag)=>{identityCalls.push(blockTag);assert.equal(checkedAddress,plan.predictedAddress);assert.equal(runtimeHash,plan.runtimeCodeHash);if(blockTag===state.finalizedNumber){assert(!state.missingFinalCode,'No finalized deployed code');assert.equal(state.finalAdmin||state.admin,admin,'Finalized administrator differs');}return {address:plan.predictedAddress,chainId:1,admin:state.admin};},save:(file,report)=>{saved.push({file,report});if(file==='.local/post-deployment.json')state.postReport=report;},
    validatePlan:(p,now=state.now)=>validatePlan(p,now),deploymentMessage:p=>deploymentMessage(p,state.now),
   },{filename:'scripts/'+name+'-mainnet.mjs'});
  },
 };
}
test('Deployment script validates contract approval again after decryption and closes the connection',async()=>{
 const f=fixture();await f.run('deploy');assert.equal(f.sent.length,1);assert.deepEqual(f.validations,['finalized','latest','finalized','latest']);assert(f.state.closed);assert(f.providers.every(p=>p.destroyed&&p.options.cacheTimeout===-1));
 assert.equal(f.state.checkpoint.transactionHash,hash('8'));assert.equal(f.saved.at(-1).report.finalityVerified,false);
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

test('Ambiguous RPC failure keeps the transaction hash and blocks another attempt before key unlock',async()=>{
 const f=fixture();f.state.broadcastError=true;
 await assert.rejects(f.run('deploy'),/ambiguous RPC timeout/);
 assert.equal(f.state.checkpoint.transactionHash,hash('8'));
 assert.equal(f.state.checkpoint.status,'SIGNED_SUBMISSION_OUTCOME_UNCONFIRMED');
 assert(!JSON.stringify(f.state.checkpoint).includes('0x1234'));
 assert(f.state.closed);await assert.rejects(f.run('deploy'),/checkpoint already exists/);
 assert.equal(f.sent.length,1);assert.equal(f.state.decryptions,1);
});
test('Checkpoint write failure prevents submission',async()=>{
 const f=fixture();f.state.checkpointError=true;await assert.rejects(f.run('deploy'),/checkpoint write failure/);assert.equal(f.sent.length,0);
});
test('An existing checkpoint prevents a new plan from overwriting recovery context',async()=>{
 const f=fixture();f.state.checkpoint={transactionHash:hash('8')};
 await assert.rejects(f.run('prepare'),/checkpoint already exists/);assert.equal(f.saved.length,0);assert.equal(f.sent.length,0);
});
for(const [name,change] of [['approval expiry',f=>{f.state.now+=3600;}],['nonce change',f=>{f.state.nonce=1;}],['revoked signature',f=>{f.state.valid=false;}]])test(name+' during local signing prevents submission',async()=>{
 const f=fixture(),wait=f.pause('sign'),run=f.run('deploy');await wait.started;change(f);wait.release();await assert.rejects(run);assert.equal(f.sent.length,0);assert.equal(f.state.checkpoint,null);
});
test('Exclusive recovery file is flushed, contains no signed transaction and cannot be replaced',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agi-broadcast-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'private','broadcast.json'),record={schema:'SYNTHETIC_TEST_ONLY',transactionHash:hash('8')};
 reserveBroadcast(file,record);assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),record);
 assert.throws(()=>reserveBroadcast(file,{transactionHash:hash('9')}),{code:'EEXIST'});
 assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),record);
 if(process.platform!=='win32')assert.equal(fs.statSync(file).mode&0o777,0o600);
});
test('Inspection checks identity at finalized and latest blocks and records both anchors',async()=>{
 const f=fixture();await f.run('inspect');assert.deepEqual(f.identityCalls,[100,104]);assert.equal(f.sent.length,0);
 const report=f.saved.at(-1).report;assert.equal(report.creationVerified,true);assert.equal(report.deployerHasAdmin,false);assert.equal(report.finalityVerified,true);assert.equal(report.finalizedBlock.hash,hash('a'));assert.equal(report.latestBlock.hash,hash('b'));
 assert(f.state.closed);assert(f.providers.every(p=>p.destroyed&&p.options.cacheTimeout===-1));
});
for(const [name,change] of [['unfinalized root transfer',f=>{f.state.finalAdmin=address('9');}],['missing finalized code',f=>{f.state.missingFinalCode=true;}],['reorganized block',f=>{f.state.reorg=true;}],['invalid block order',f=>{f.state.finalizedNumber=105;}],['invalid block number',f=>{f.state.latestNumber=NaN;}]])test('Inspection rejects '+name,async()=>{
 const f=fixture();change(f);await assert.rejects(f.run('inspect'));assert.equal(f.saved.length,1);assert.equal(f.saved[0].report.status,'INCOMPLETE');assert.equal(f.sent.length,0);assert(f.state.closed);
});

for(const wrapped of [false,true])test('Production identity pins all '+(wrapped?'wrapped':'unwrapped')+' ENS and registry reads to the requested block',async()=>{
 const ENS='0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',WRAPPER='0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',calls=[];
 const observe=(method,tag,value)=>{calls.push({method,tag});return value;};
 const provider={getNetwork:async()=>({chainId:1n}),getCode:async(_address,tag)=>observe('code',tag,'0x6000'),getBlock:async tag=>observe('block',tag,{timestamp:100})};
 const ethers={namehash:()=>hash('c'),keccak256:()=>hash('1'),getAddress:value=>value,ZeroAddress:address('0'),Contract:class{
  async owner(_node,{blockTag}){return observe('owner',blockTag,wrapped?WRAPPER:address('4'));}
  async getData(_node,{blockTag}){return observe('getData',blockTag,[address('4'),0n,0n]);}
  async VERSION({blockTag}){return observe('VERSION',blockTag,'2.1.1');}
  async CLUB_AGI_ETH_NODE({blockTag}){return observe('root',blockTag,hash('c'));}
  async ensRegistry({blockTag}){return observe('ENS',blockTag,ENS);}
  async adminNameWrapper({blockTag}){return observe('wrapper',blockTag,WRAPPER);}
  async admin({blockTag}){return observe('admin',blockTag,address('4'));}
 }};
 const source=readFileSync(new URL('../scripts/runtime.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
 const context={assert,ethers};runInNewContext(source+'\nglobalThis.check=checkProduction;',context);
 const result=await context.check(provider,address('3'),address('4'),hash('1'),42);
 assert.equal(result.admin,address('4'));assert(calls.some(x=>x.method==='owner'));
 if(wrapped)assert(calls.some(x=>x.method==='getData'));
 for(const call of calls)assert.equal(call.tag,42,call.method);
});

for(const script of ['prepare','deploy'])test(script+' refuses an ambiguous deployment scope before contacting a wallet',async()=>{
 const f=fixture();delete f.gate.deploymentScope;await assert.rejects(()=>f.run(script),/Only empty-registry deployment evidence/);assert.equal(f.sent.length,0);assert.equal(f.state.decryptions,0);
});

for(const [name,change] of [
 ['different constructor',f=>{f.state.creationData='0x6002';}],
 ['missing reviewed transaction',f=>{f.state.creationMissing=true;}],
 ['compromised deployer now holding root',f=>{f.env.EXPECTED_ADMIN=f.plan.deployer;}],
 ['wrong registry address',f=>{f.env.REGISTRY_ADDRESS=address('9');}],
 ['conflicting checkpoint',f=>{f.state.checkpoint={schema:'AGIClubBroadcastCheckpoint/1',chainId:1,transactionHash:hash('9')};}],
])test('Final inspection blocks '+name+' even if the runtime identity matches',async()=>{
 const f=fixture();change(f);await assert.rejects(()=>f.run('inspect'));assert(f.saved.every(x=>!x.report.finalityVerified));assert.equal(f.sent.length,0);assert.equal(f.state.decryptions,0);
});
test('A reviewed checkpoint supplies the expected creation transaction without another wallet interaction',async()=>{
 const f=fixture();delete f.env.DEPLOYMENT_TRANSACTION_HASH;
 f.state.checkpoint={schema:'AGIClubBroadcastCheckpoint/1',chainId:1,transactionHash:hash('8')};
 for(const field of ['deployer','admin','nonce','predictedAddress','creationCodeHash','runtimeCodeHash','sourceSha256'])f.state.checkpoint[field]=f.plan[field];
 await f.run('inspect');assert.equal(f.saved.at(-1).report.creationVerified,true);assert.equal(f.sent.length,0);assert.equal(f.state.decryptions,0);
});
test('Independent recovery without a plan requires both reviewed code hashes, deployer and transaction',async()=>{
 const f=fixture();f.state.planPresent=false;await f.run('inspect');assert.equal(f.saved.at(-1).report.creationVerified,true);
 delete f.env.EXPECTED_CREATION_HASH;await assert.rejects(()=>f.run('inspect'),/reviewed creation-code hash/);assert.equal(f.saved.at(-1).report.status,'INCOMPLETE');
});
test('Historical inspection does not renew or reject an otherwise valid expired deployment plan',async()=>{
 const f=fixture();f.state.now+=7200;await f.run('inspect');assert.equal(f.saved.at(-1).report.creationVerified,true);
 await assert.rejects(()=>f.run('deploy'),/Expired/);assert.equal(f.sent.length,0);
});

test('A failed new inspection archives the previous success and leaves an incomplete current report',async()=>{
 const f=fixture();await f.run('inspect');const prior=f.state.postReport;assert.equal(prior.creationVerified,true);
 f.state.creationData='0x6002';await assert.rejects(()=>f.run('inspect'),/Creation bytecode differs/);
 assert.equal(f.state.archives.length,1);assert.equal(f.state.archives[0].report,prior);assert.equal(f.state.archives[0].file,'.local/post-deployment-fixture-uuid.json');
 assert.equal(f.state.postReport.status,'INCOMPLETE');assert.equal(f.state.postReport.creationVerified,false);assert.equal(f.state.postReport.finalityVerified,false);
});
test('Creation-block reorganization during identity reads invalidates the whole inspection',async()=>{
 const f=fixture();f.state.creationReorgAfterIdentity=true;await assert.rejects(()=>f.run('inspect'),/Canonical block changed/);
 assert.deepEqual(f.identityCalls,[100,104]);assert.equal(f.state.postReport.status,'INCOMPLETE');assert.equal(f.sent.length,0);
});
test('A valid transaction checkpoint for another reviewed plan is rejected',async()=>{
 const f=fixture();f.state.checkpoint={...f.plan,schema:'AGIClubBroadcastCheckpoint/1',transactionHash:hash('8'),creationCodeHash:hash('9')};
 await assert.rejects(()=>f.run('inspect'),/Checkpoint differs from the reviewed plan: creationCodeHash/);
 assert.equal(f.state.postReport.status,'INCOMPLETE');assert.equal(f.identityCalls.length,0);
});
