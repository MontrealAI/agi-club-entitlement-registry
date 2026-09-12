/** Production constructor and practical allocation models in an isolated EVM.
 * All names, definitions and memberships below are fictitious test data.
 * No live RPC, deployment, inventory, access service or fulfillment is exercised.
 */
import assert from 'node:assert/strict';
import {network,artifacts} from 'hardhat';
import {ethers} from 'ethers';
import {ENS,WRAPPER,ROOT,PROD,deploy,receipt,save} from './runtime.mjs';
import {sourceDigest} from './source-digest.mjs';
import {revertData} from '../test/revert-data.mjs';

const report={schema:'AGIClubContractScenarios/1',status:'NOT_EXECUTED',scope:'LOCAL ISOLATED EVM; production constructor with fictitious canonical ENS infrastructure. No live mainnet, external integration or fulfillment evidence.',results:[]};
let connection,provider;
try {
 const before=sourceDigest().sourceSha256;
 connection=await network.create();assert.equal(connection.networkName,'isolatedMainnetModel');
 const rpc=connection.provider;await rpc.request({method:'hardhat_metadata',params:[]});
 provider=new ethers.BrowserProvider(rpc,undefined,{cacheTimeout:-1});provider.pollingInterval=10;
 assert.equal((await provider.getNetwork()).chainId,1n);
 const [deployer,admin,member,next]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
 const [da,aa,ma,na]=await Promise.all([deployer,admin,member,next].map(s=>s.getAddress()));
 for(const [name,target] of [['QualificationENS',ENS],['QualificationWrapper',WRAPPER]]){
  const mock=await deploy(artifacts,deployer,name);
  await rpc.request({method:'hardhat_setCode',params:[target,await provider.getCode(await mock.getAddress())]});
 }
 const ens=new ethers.Contract(ENS,(await artifacts.readArtifact('QualificationENS')).abi,deployer);
 await receipt(ens.setOwner(ROOT,aa));
 const node=label=>ethers.namehash(label+'.club.agi.eth'),key=name=>ethers.id('FICTITIOUS_SCENARIO_'+name);
 for(const [label,owner] of [['one',ma],['two',na],['same-wallet',ma]])await receipt(ens.setOwner(node(label),owner));
 const fresh=()=>deploy(artifacts,deployer,PROD);
 const create=(c,id,capacity=0,state=2,open=0,close=0)=>receipt(c.connect(admin).createEntitlement(id,key('CUSTOM_CATEGORY'),capacity,open,close,state,ethers.ZeroHash));
 const rejected=(c,call,name,args)=>assert.rejects(call,error=>{
  const parsed=c.interface.parseError(revertData(error));assert.equal(parsed?.name,name);
  if(args)assert.deepEqual(Array.from(parsed.args),args);return true;
 });
 async function check(name,fn){await fn();report.results.push({name,status:'PASS'});}

 await check('Empty production registry has no benefit, category default or deployer privilege',async()=>{
  const c=await fresh();assert.equal(await c.entitlementCount(),0n);
  assert.deepEqual(Array.from(await c.entitlementIdsPage(0,100)),[]);
  assert.equal(await c.admin(),aa);assert.equal(await c.isAdmin(da),false);
  await rejected(c,()=>c.connect(deployer).createEntitlement.staticCall(key('UNAUTHORIZED'),ethers.ZeroHash,0,0,0,1,ethers.ZeroHash),'NotClubAdmin');
 });
 await check('Uncapped resources and arbitrary categories preserve one allocation per membership, not per wallet',async()=>{
  const c=await fresh(),id=key('RESOURCE');await create(c,id);
  await receipt(c.connect(member).claim(id,'one'));await receipt(c.connect(member).claim(id,'same-wallet'));
  assert.deepEqual(Array.from(await c.remainingCapacity(id)),[false,0n]);
  const before=Array.from(await c.claimRecord(id,node('one')));
  await receipt(c.connect(admin).setCategory(id,key('NEW_CUSTOM_CATEGORY')));
  await receipt(c.connect(admin).setCategory(id,ethers.ZeroHash));
  assert.deepEqual(Array.from(await c.claimRecord(id,node('one'))),before);
  assert.equal((await c.entitlement(id))[3],2n);
  await rejected(c,()=>c.connect(member).claim.staticCall(id,'one'),'ClaimRejected',[9n]);
 });
 await check('Finite allocation pool reuses revoked capacity but never resets lifetime records or counts stock',async()=>{
  const c=await fresh(),id=key('SERVICE_POOL');await create(c,id,1);
  await receipt(c.connect(member).claim(id,'one'));
  await rejected(c,()=>c.connect(next).claim.staticCall(id,'two'),'ClaimRejected',[14n]);
  await receipt(c.connect(admin).revokeClaim(id,'one',key('CORRECTION')));
  await receipt(c.connect(next).claim(id,'two'));
  const e=await c.entitlement(id);assert.equal(e[2],1n);assert.equal(e[3],1n);assert.equal(e[4],2n);
  await rejected(c,()=>c.connect(admin).reinstateClaim.staticCall(id,'one'),'CapacityFull',[id]);
  await receipt(c.connect(admin).setCapacity(id,2));await receipt(c.connect(admin).reinstateClaim(id,'one'));
  assert.equal((await c.entitlement(id))[3],2n);assert.equal((await c.entitlement(id))[4],2n);
  await rejected(c,()=>c.connect(admin).setCapacity.staticCall(id,1),'CapacityBelowActiveClaims',[1n,2n]);
 });
 await check('Distinct reservation slots enforce individual capacity, without an implicit cross-slot booking rule',async()=>{
  const c=await fresh(),slots=[key('SLOT_A'),key('SLOT_B')];
  for(const id of slots){await create(c,id,1);await receipt(c.connect(member).claim(id,'one'));await rejected(c,()=>c.connect(next).claim.staticCall(id,'two'),'ClaimRejected',[14n]);}
  // The same membership can claim both IDs: scheduling/conflicts need a separate policy.
  for(const id of slots)assert.equal(await c.hasClaimed(id,node('one')),true);
 });
 await check('Curated grants work in Draft while member claiming stays closed; grants bypass time and pause but not capacity',async()=>{
  const c=await fresh(),id=key('CURATED');await create(c,id,1,1,4000000000,4000000100);
  await rejected(c,()=>c.connect(member).claim.staticCall(id,'one'),'ClaimRejected',[4n]);
  await receipt(c.connect(admin).pause());await receipt(c.connect(admin).adminGrantClaimToCurrentOwner(id,'one'));
  assert.equal(await c.hasClaimed(id,node('one')),true);
  await rejected(c,()=>c.connect(admin).adminGrantClaimToCurrentOwner.staticCall(id,'two'),'CapacityFull',[id]);
  await receipt(c.connect(admin).unpause());assert.equal((await c.entitlement(id))[7],1n);
 });
 await check('Recurring periods duplicate into independent empty Drafts and leave prior allocations intact',async()=>{
  const c=await fresh(),first=key('PERIOD_A'),second=key('PERIOD_B');await create(c,first,1);
  await receipt(c.connect(admin).setDescriptor(first,'Période fictive','Fictitious period','https://example.org/public-terms',key('TERMS')));
  await receipt(c.connect(member).claim(first,'one'));
  await receipt(c.connect(admin).setWindow(first,1,2));await receipt(c.connect(admin).duplicateEntitlement(first,second));
  const e=await c.entitlement(second);assert.equal(e[0],key('CUSTOM_CATEGORY'));assert.equal(e[2],1n);
  for(const index of [3,4,5,6])assert.equal(e[index],0n);assert.equal(e[7],1n);assert.equal(e[1],ethers.ZeroHash);
  for(const getter of ['titleFR','titleEN','metadataURI'])assert.equal(await c[getter](second),'');
  await receipt(c.connect(admin).setEntitlementState(second,2));await receipt(c.connect(member).claim(second,'one'));
  assert.equal(await c.hasClaimed(first,node('one')),true);assert.equal(await c.hasClaimed(second,node('one')),true);
  await receipt(c.connect(admin).setWindow(first,0,0));await rejected(c,()=>c.connect(member).claim.staticCall(first,'one'),'ClaimRejected',[9n]);
 });
 await check('Independent bundle components can be corrected separately; a bundle ID remains one indivisible record',async()=>{
  const c=await fresh(),ids=[key('BUNDLE'),key('COMPONENT_A'),key('COMPONENT_B')];
  for(const id of ids){await create(c,id);await receipt(c.connect(member).claim(id,'one'));}
  await receipt(c.connect(admin).revokeClaim(ids[1],'one',key('PART_CORRECTION')));
  assert.equal(await c.hasClaimed(ids[0],node('one')),true);assert.equal(await c.hasClaimed(ids[1],node('one')),false);assert.equal(await c.hasClaimed(ids[2],node('one')),true);
  for(const id of ids)assert.equal(await c.claimNodeCount(id),1n);
 });
 await check('Claim windows, Closed, Archived and pause do not expire an already active access claim',async()=>{
  const c=await fresh(),id=key('ACCESS');await create(c,id);await receipt(c.connect(member).claim(id,'one'));
  await receipt(c.connect(admin).setWindow(id,1,2));await rejected(c,()=>c.connect(next).claim.staticCall(id,'two'),'ClaimRejected',[8n]);
  for(const state of [3,4,1,2]){
   await receipt(c.connect(admin).setEntitlementState(id,state));
   assert.equal(await c.hasClaimed(id,node('one')),true);assert.equal(await c.claimantOf(id,node('one')),ma);
  }
  await receipt(c.connect(admin).pause());assert.equal(await c.hasClaimed(id,node('one')),true);
  await receipt(c.connect(admin).revokeClaim(id,'one',key('ACCESS_WITHDRAWN')));assert.equal(await c.hasClaimed(id,node('one')),false);
 });
 await check('Public terms remain editable without changing claim revision; material new offers need independent IDs',async()=>{
  const c=await fresh(),id=key('PUBLIC_TERMS');await create(c,id);await receipt(c.connect(member).claim(id,'one'));
  const before=Array.from(await c.claimRecord(id,node('one')));
  await receipt(c.connect(admin).setDescriptor(id,'Conditions fictives','Fictitious terms','ipfs://fictitious-public-document',key('NEW_TERMS')));
  await receipt(c.connect(admin).setMetadataHash(id,key('CORRECTED_TERMS')));
  assert.equal((await c.entitlement(id))[1],key('CORRECTED_TERMS'));
  assert.deepEqual(Array.from(await c.claimRecord(id,node('one'))),before);
 });
 await check('Membership transfer does not move or multiply an allocation; explicit correction preserves its history',async()=>{
  const c=await fresh(),id=key('TRANSFER');await create(c,id);await receipt(c.connect(member).claim(id,'one'));
  const before=await c.claimRecord(id,node('one'));await receipt(ens.setOwner(node('one'),na));
  try {
   assert.equal(await c.claimantOf(id,node('one')),ma);
   await rejected(c,()=>c.connect(next).claim.staticCall(id,'one'),'ClaimRejected',[9n]);
   await receipt(c.connect(admin).revokeClaim(id,'one',key('TRANSFER_CORRECTION')));
   await rejected(c,()=>c.connect(next).claim.staticCall(id,'one'),'ClaimRejected',[10n]);
   await receipt(c.connect(admin).reassignRevokedClaim(id,'one',na));
   const after=await c.claimRecord(id,node('one'));assert.equal(after[0],na);assert.equal(after[1],before[1]);assert.equal(after[4],3n);
   assert.equal(await c.claimNodeCount(id),1n);assert.equal((await c.entitlement(id))[4],1n);
  } finally {await receipt(ens.setOwner(node('one'),ma));}
 });
 await check('Root-controlled migration can assign a legacy record explicitly without creating delegated administrators',async()=>{
  const c=await fresh(),id=key('MIGRATION');await create(c,id,1,1);
  await rejected(c,()=>c.connect(admin).adminGrantClaimToCurrentOwner.staticCall(id,'legacy'),'MembershipNotFound',[node('legacy')]);
  const tx=await receipt(c.connect(admin).adminGrantClaimOverride(id,'legacy',na,key('PUBLIC_AUDIT_REFERENCE')));
  assert(tx.logs.some(log=>{try{return c.interface.parseLog(log)?.name==='AdministrativeOverrideGranted';}catch{return false;}}));
  assert.equal(await c.claimantOf(id,node('legacy')),na);assert.equal(await c.isAdmin(na),false);assert.equal(await c.isAdmin(da),false);
 });
 await check('Fifty-member batches and paged history preserve exact counts; a mined over-capacity batch rolls back completely',async()=>{
  const c=await fresh(),id=key('LARGE_CURATED');await create(c,id,52,1);
  const labels=Array.from({length:53},(_,i)=>'batch-'+i);for(const label of labels)await receipt(ens.setOwner(node(label),ma));
  const granted=await receipt(c.connect(admin).adminGrantBatchToCurrentOwners(id,labels.slice(0,50)));
  const block=BigInt(await rpc.request({method:'eth_blockNumber',params:[]}));
  await assert.rejects(()=>rpc.request({method:'eth_sendTransaction',params:[{from:aa,to:c.target,data:c.interface.encodeFunctionData('adminGrantBatchToCurrentOwners',[id,labels.slice(50)]),gas:'0x989680'}]}));
  const after=BigInt(await rpc.request({method:'eth_blockNumber',params:[]}));assert.equal(after,block+1n);
  const failedBlock=await rpc.request({method:'eth_getBlockByNumber',params:[ethers.toQuantity(after),false]});
  assert.equal(failedBlock.transactions.length,1);
  const failed=await rpc.request({method:'eth_getTransactionReceipt',params:[failedBlock.transactions[0]]});assert.equal(failed.status,'0x0');assert.deepEqual(failed.logs,[]);
  assert.equal((await c.entitlement(id))[3],50n);for(const label of labels.slice(50))assert.equal(await c.wasEverClaimed(id,node(label)),false);
  await receipt(c.connect(admin).adminGrantBatchToCurrentOwners(id,labels.slice(50,52)));
  const seen=[];for(const offset of [0,25,50])seen.push(...await c.claimNodesPage(id,offset,25));
  assert.deepEqual(seen,labels.slice(0,52).map(node));assert.equal(new Set(seen).size,52);
  await receipt(c.connect(admin).revokeBatch(id,labels.slice(0,50),key('BATCH_CORRECTION')));
  assert.equal((await c.entitlement(id))[3],2n);assert.equal((await c.entitlement(id))[4],52n);
  report.batchGrantGasUsed=granted.gasUsed.toString(); // Local estimate only; mainnet costs depend on current gas prices.
 });
 report.sourceSha256=sourceDigest().sourceSha256;assert.equal(report.sourceSha256,before);
 report.creationCodeHash=ethers.keccak256((await artifacts.readArtifact(PROD)).bytecode);
 report.status='PASS';report.passed=report.results.length;report.mainnetAuthorization=false;
} catch(error){report.status='FAIL_OR_BLOCKED';report.error=error.shortMessage||error.message;process.exitCode=1;}
finally {save('qualification/contract-scenarios.json',report);console.log(JSON.stringify(report,null,2));provider?.destroy();if(connection)await connection.close();}
