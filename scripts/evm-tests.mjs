/** Real Solidity/EVM regression suite. No missing dependency is counted as a pass. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {network, artifacts as hhArtifacts} from 'hardhat';
import {sourceDigest} from './source-digest.mjs';
import {revertData} from '../test/revert-data.mjs';
import {ACTIONS,EXPLORER_ABI,prepareExplorerCall} from '../frontend/etherscan-tools.mjs';
const report={version:'2.1.1',status:'NOT_EXECUTED',at:new Date().toISOString(),scope:'LOCAL HARDHAT + MOCK ENS/WRAPPERS. NOT mainnet-fork, Safe or real-wallet qualification',results:[]};
let rpc,provider,ethers,connection;
fs.mkdirSync('qualification',{recursive:true});
async function run(name,fn){try{await fn();report.results.push({name,status:'PASS'});}catch(e){report.results.push({name,status:'FAIL',error:e.shortMessage||e.message});}}
try{
 ({ethers}=await import('ethers'));connection=await network.create();
 assert.equal(connection.networkName,'hardhat','This suite must only run against the in-process hardhat network');
 // The local EVM mines synchronously; cached reads can describe the previous state.
 rpc=connection.provider;provider=new ethers.BrowserProvider(rpc,undefined,{cacheTimeout:-1});provider.pollingInterval=10;
 assert.equal((await provider.getNetwork()).chainId,31337n);
 report.sourceSha256=sourceDigest().sourceSha256;
 const artifactCache={};
 for(const n of ['AGIClubEntitlementRegistry','AGIClubEntitlementRegistryMainnet','QualificationENS','QualificationWrapper','QualificationFilteredWrapper','QualificationWallet'])artifactCache[n]=await hhArtifacts.readArtifact(n);
 const artifact=n=>{assert(artifactCache[n]?.bytecode,'Missing compiled artifact');return artifactCache[n];};
 const[deployer,admin,member,next]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
 const[da,aa,ma,na]=await Promise.all([deployer,admin,member,next].map(x=>x.getAddress()));
 async function deploy(n,args=[]){const a=artifact(n),c=await new ethers.ContractFactory(a.abi,a.bytecode,deployer).deploy(...args);await c.waitForDeployment();return c;}
 const tx=async p=>{const r=await(await p).wait();assert.equal(r.status,1);return r;};
 const root=ethers.namehash('club.agi.eth'),id=ethers.id('IA101_2026_09_22'),cat=ethers.id('EVENT'),node=ethers.namehash('alice.club.agi.eth');
 const ens=await deploy('QualificationENS'),wrapper=await deploy('QualificationWrapper');
 await tx(ens.setOwner(root,aa));await tx(ens.setOwner(node,ma));
 const c=await deploy('AGIClubEntitlementRegistry',[await ens.getAddress(),[await wrapper.getAddress()]]);
 async function reject(call,errorName,args){let caught;try{await call();}catch(e){caught=e;}assert(caught,'expected '+errorName+'; call succeeded');const decoded=c.interface.parseError(revertData(caught));assert.equal(decoded?.name,errorName);if(args)assert.deepEqual([...decoded.args],args);}
 const bad=(method,args,error,who=member,errorArgs)=>reject(()=>c.connect(who).getFunction(method).staticCall(...args),error,errorArgs);
 await run('Deployer is not administrator; root hash agrees with ethers',async()=>{assert.equal(await c.admin(),aa);assert.equal(await c.isAdmin(da),false);assert.equal(await c.CLUB_AGI_ETH_NODE(),root);});
 await run('Every administrative entry point rejects non-holder with decoded NotClubAdmin',async()=>{
  const ops=[['createEntitlement',[ethers.id('NO'),cat,50,0,0,1,ethers.ZeroHash]],['duplicateEntitlement',[id,ethers.id('COPY')]],['setEntitlementState',[id,1]],['setCapacity',[id,50]],['setWindow',[id,0,0]],['setCategory',[id,cat]],['setMetadataHash',[id,ethers.ZeroHash]],['setDescriptor',[id,'FR','EN','',ethers.ZeroHash]],['adminGrantClaimToCurrentOwner',[id,'bob']],['adminGrantBatchToCurrentOwners',[id,['bob']]],['adminGrantClaimOverride',[id,'bob',ma,ethers.id('AUDIT')]],['revokeClaim',[id,'alice',ethers.id('AUDIT')]],['revokeBatch',[id,['alice'],ethers.id('AUDIT')]],['reinstateClaim',[id,'alice']],['reassignRevokedClaim',[id,'alice',ma]],['setSupportedNameWrapper',[await wrapper.getAddress(),true]],['pause',[]],['unpause',[]]];
  const adminMethods=artifact('AGIClubEntitlementRegistry').abi.filter(x=>x.type==='function'&&['nonpayable','payable'].includes(x.stateMutability)&&x.name!=='claim').map(x=>x.name).sort();
  assert.deepEqual(ops.map(([method])=>method).sort(),adminMethods,'Every privileged ABI entry point must be exercised');
  for(const[m,a]of ops)for(const caller of [member,deployer])await bad(m,a,'NotClubAdmin',caller);
 });
 await run('Authority-source setters and stored-owner-transfer functions absent',async()=>{for(const n of ['setENSRegistry','transferOwnership','renounceOwnership'])assert(!artifact('AGIClubEntitlementRegistry').abi.some(x=>x.name===n));});
 await run('Admin creates first entitlement',()=>tx(c.connect(admin).createEntitlement(id,cat,50,0,0,2,ethers.ZeroHash)));
 await run('Self-claim active once; counters and claimant exact',async()=>{await tx(c.connect(member).claim(id,'alice'));assert.equal(await c.claimantOf(id,node),ma);const e=await c.entitlement(id);assert.equal(e[3],1n);assert.equal(e[4],1n);});
 await run('Duplicate self-claim is specifically rejected',()=>bad('claim',[id,'alice'],'ClaimRejected',member,[9n]));
 await run('Transfer does not create new entitlement consumption',async()=>{await tx(ens.setOwner(node,na));await bad('claim',[id,'alice'],'ClaimRejected',next,[9n]);assert.equal(await c.claimNodeCount(id),1n);});
 await run('Root transfer removes old admin immediately',async()=>{await tx(ens.setOwner(root,na));await bad('pause',[],'NotClubAdmin',admin);await tx(c.connect(next).pause());await tx(c.connect(next).unpause());await tx(ens.setOwner(root,aa));});
 await run('Wrapped root tracks current effective owner, not registry wrapper address',async()=>{await tx(wrapper.setData(root,aa,4000000000));await tx(ens.setOwner(root,await wrapper.getAddress()));assert.equal(await c.admin(),aa);await tx(wrapper.setData(root,na,4000000000));await bad('pause',[],'NotClubAdmin',admin);assert.equal(await c.admin(),na);});
 await run('Non-emancipated zero-expiry root retains owner',async()=>{await tx(wrapper.setData(root,aa,0));assert.equal(await c.admin(),aa);await tx(c.connect(admin).pause());await tx(c.connect(admin).unpause());});
 await run('Non-emancipated elapsed-expiry root retains owner',async()=>{await tx(wrapper.setData(root,aa,1));assert.equal(await c.admin(),aa);});
 await run('Emancipated elapsed-expiry root grants no authority',async()=>{await tx(wrapper.setDataFull(root,aa,65536,1));assert.equal(await c.admin(),ethers.ZeroAddress);await bad('pause',[],'AdminUnavailable',admin);});
 await run('Exact expiry boundary follows ENS strict less-than rule',async()=>{
  const last=await provider.getBlock('latest'),end=last.timestamp+120;await tx(wrapper.setDataFull(root,aa,65536,end));
  await rpc.request({method:'evm_setNextBlockTimestamp',params:[end]});await rpc.request({method:'evm_mine',params:[]});
  const n=Number(BigInt(await rpc.request({method:'eth_blockNumber',params:[]})));const b=await provider.getBlock(n);assert.equal(b.timestamp,end);assert.equal(await c.admin({blockTag:n}),aa);
  await rpc.request({method:'evm_increaseTime',params:[1]});await rpc.request({method:'evm_mine',params:[]});const n2=Number(BigInt(await rpc.request({method:'eth_blockNumber',params:[]})));assert.equal(await c.admin({blockTag:n2}),ethers.ZeroAddress);await tx(wrapper.setData(root,aa,0));
 });
 await run('Malformed/truncated/reverting root wrapper responses fail closed',async()=>{for(const mode of [1,2,3]){await tx(wrapper.setResponseMode(mode));assert.equal(await c.admin(),ethers.ZeroAddress);await bad('pause',[],'AdminUnavailable',admin);}await tx(wrapper.setResponseMode(0));});
 await run('ENS unavailable fails closed without conferring deployer privileges',async()=>{await tx(ens.setUnavailable(true));assert.equal(await c.admin(),ethers.ZeroAddress);await bad('pause',[],'AdminUnavailable',admin);await tx(ens.setUnavailable(false));});
 await run('Admin wrapper cannot be disabled by membership-wrapper settings',async()=>{await bad('setSupportedNameWrapper',[await wrapper.getAddress(),false],'CannotDisableCurrentAdminWrapper',admin);assert.equal(await c.admin(),aa);});
 await run('Wrapped membership non-emancipated zero expiry can self-claim',async()=>{const n=ethers.namehash('bob.club.agi.eth');await tx(ens.setOwner(n,await wrapper.getAddress()));await tx(wrapper.setData(n,ma,0));await tx(c.connect(member).claim(id,'bob'));assert.equal(await c.claimantOf(id,n),ma);});
 await run('Wrapped emancipated expired membership cannot self-claim',async()=>{const n=ethers.namehash('carol.club.agi.eth');await tx(ens.setOwner(n,await wrapper.getAddress()));await tx(wrapper.setDataFull(n,ma,65536,1));await bad('claim',[id,'carol'],'ClaimRejected',member,[11n]);});
 await run('Canonical-style filtered wrapper preserves same distinction',async()=>{const w=await deploy('QualificationFilteredWrapper');await tx(c.connect(admin).setSupportedNameWrapper(await w.getAddress(),true));for(const[label,fuses,expected]of [['valid',0,ma],['expired',65536,ethers.ZeroAddress]]){const n=ethers.namehash(label+'.club.agi.eth');await tx(ens.setOwner(n,await w.getAddress()));await tx(w.setDataFull(n,ma,fuses,1));assert.equal((await c.membershipInfo(label))[1],expected);}await tx(c.connect(admin).setSupportedNameWrapper(await w.getAddress(),false));assert.equal((await c.membershipInfo('valid'))[1],ethers.ZeroAddress);});
 await run('Revoke preserves uniqueness and changes revision',async()=>{await tx(c.connect(admin).revokeClaim(id,'alice',ethers.id('AUDIT')));assert.equal(await c.wasEverClaimed(id,node),true);assert.equal(await c.claimantOf(id,node),ethers.ZeroAddress);await bad('claim',[id,'alice'],'ClaimRejected',next,[10n]);assert.equal((await c.claimRecord(id,node))[4],2n);});
 await run('Reassignment is explicit and revisioned, not a second record',async()=>{await tx(c.connect(admin).reassignRevokedClaim(id,'alice',na));assert.equal((await c.claimRecord(id,node))[4],3n);assert.equal(await c.claimantOf(id,node),na);assert.equal(await c.claimNodeCount(id),2n);});
 await run('Pause blocks public claims but not admin corrections',async()=>{await tx(c.connect(admin).pause());await bad('claim',[id,'other'],'EnforcedPause');await tx(c.connect(admin).revokeClaim(id,'alice',ethers.id('AUDIT')));await tx(c.connect(admin).reinstateClaim(id,'alice'));await tx(c.connect(admin).unpause());});
 await run('Capacity cannot be reduced below active claims',()=>bad('setCapacity',[id,1],'CapacityBelowActiveClaims',admin));
 await run('Draft duplicate has no claims, dates or descriptor',async()=>{const n=ethers.id('NEXT');await tx(c.connect(admin).duplicateEntitlement(id,n));const e=await c.entitlement(n);assert.equal(e[3],0n);assert.equal(e[4],0n);assert.equal(e[5],0n);assert.equal(e[6],0n);assert.equal(e[7],1n);assert.equal(e[1],ethers.ZeroHash);assert.equal(await c.titleFR(n),'');});
 await run('Batch grant is atomic, not partial if a later member is invalid',async()=>{await tx(ens.setOwner(ethers.namehash('dave.club.agi.eth'),ma));await bad('adminGrantBatchToCurrentOwners',[id,['dave','missing']],'MembershipNotFound',admin);assert.equal(await c.wasEverClaimed(id,ethers.namehash('dave.club.agi.eth')),false);});
 await run('Batches are bounded at 50 and cannot be empty',async()=>{await bad('adminGrantBatchToCurrentOwners',[id,[]],'InvalidBatchSize',admin);await bad('adminGrantBatchToCurrentOwners',[id,Array(51).fill('dave')],'InvalidBatchSize',admin);});
 await run('Explicit override requires reference and emits separate audit event',async()=>{await bad('adminGrantClaimOverride',[id,'exception',na,ethers.ZeroHash],'InvalidReason',admin);const r=await tx(c.connect(admin).adminGrantClaimOverride(id,'exception',na,ethers.id('CASE_TEST')));assert(r.logs.some(l=>{try{return c.interface.parseLog(l)?.name==='AdministrativeOverrideGranted';}catch{return false;}}));});
 await run('URI executable schemes rejected, public IPFS descriptor accepted',async()=>{await bad('setDescriptor',[id,'FR','EN','javascript:alert(1)',ethers.ZeroHash],'InvalidDescriptor',admin);await tx(c.connect(admin).setDescriptor(id,'IA 101','AI 101','ipfs://example',ethers.ZeroHash));assert.equal(await c.titleFR(id),'IA 101');});
 await run('Read pagination bounds enforced',async()=>{assert.equal((await c.entitlementIdsPage(0,100)).length,2);await reject(()=>c.entitlementIdsPage(0,101),'InvalidPageSize');});
 await run('Labels cannot name a parent or deeper descendant',async()=>{for(const label of ['', 'club.agi.eth','x.alice','-bad','UPPER'])await reject(()=>c.membershipNode(label),'ClaimRejected');});
 await run('Contract-wallet holder is admin, its individual signer is not',async()=>{const w=await deploy('QualificationWallet',[aa]);await tx(ens.setOwner(root,await w.getAddress()));assert.equal(await c.admin(),await w.getAddress());await bad('pause',[],'NotClubAdmin',admin);await tx(w.connect(admin).execute(await c.getAddress(),c.interface.encodeFunctionData('pause')));assert.equal(await c.paused(),true);await tx(w.connect(admin).execute(await c.getAddress(),c.interface.encodeFunctionData('unpause')));await tx(ens.setOwner(root,aa));});
 await run('Closed, not-yet-open and ended entitlements return distinct reasons',async()=>{const n=ethers.id('NEXT');await bad('claim',[n,'dave'],'ClaimRejected',member,[4n]);await tx(c.connect(admin).setEntitlementState(n,3));await bad('claim',[n,'dave'],'ClaimRejected',member,[5n]);await tx(c.connect(admin).setEntitlementState(n,2));await tx(c.connect(admin).setWindow(n,4000000000,4000000100));await bad('claim',[n,'dave'],'ClaimRejected',member,[7n]);await tx(c.connect(admin).setWindow(n,1,2));await bad('claim',[n,'dave'],'ClaimRejected',member,[8n]);});

 await run('Explorer catalogue covers every public production function and all 19 writes',async()=>{
  const expected=new ethers.Interface(artifact('AGIClubEntitlementRegistryMainnet').abi).fragments.filter(f=>f.type==='function').map(f=>f.format('full')).sort();
  assert.deepEqual([...EXPLORER_ABI].sort(),expected);
  assert.deepEqual(Object.keys(ACTIONS).sort(),new ethers.Interface(EXPLORER_ABI).fragments.filter(f=>!['view','pure'].includes(f.stateMutability)).map(f=>f.name).sort());
 });
 await run('All 19 explorer-prepared write functions execute on the local EVM with exact claim history',async()=>{
  const registry=await deploy('AGIClubEntitlementRegistry',[await ens.getAddress(),[await wrapper.getAddress()]]),address=await registry.getAddress(),done=new Set();
  for(const label of ['explorer-a','explorer-b','explorer-c','explorer-d','explorer-e'])await tx(ens.setOwner(ethers.namehash(label+'.club.agi.eth'),ma));
  async function prepared(method,values,signer=admin){
   const p=prepareExplorerCall(method,values,address,ethers);assert.equal(p.transaction.chainId,1);assert.equal(p.transaction.value,'0');
   // Only ABI-shaped data is exercised here; the actual transaction uses the guarded local provider, never the helper's mainnet chain ID.
   await tx(signer.sendTransaction({to:address,data:p.transaction.data,value:0n}));done.add(method);
  }
  const id='EXPLORER_FIRST';
  for(const [method,values]of [
   ['createEntitlement',[id,'EVENT','5','0','0','1','']],['setCategory',[id,'BRIEFING']],['setMetadataHash',[id,'']],
   ['setDescriptor',[id,'Avantage de test','Test benefit','','']],['setWindow',[id,'','']],['setCapacity',[id,'5']],
   ['setEntitlementState',[id,'2']],['duplicateEntitlement',[id,'EXPLORER_SECOND']],
  ])await prepared(method,values);
  await prepared('claim',[id,'explorer-a'],member);
  for(const [method,values]of [
   ['adminGrantClaimToCurrentOwner',[id,'explorer-b']],['adminGrantBatchToCurrentOwners',[id,'explorer-c,explorer-d']],
   ['adminGrantClaimOverride',[id,'explorer-e',na,'PUBLIC_TEST_CASE']],['revokeClaim',[id,'explorer-a','PUBLIC_TEST_CASE']],
   ['reinstateClaim',[id,'explorer-a']],['revokeBatch',[id,'["explorer-b","explorer-c"]','PUBLIC_TEST_CASE']],
   ['reassignRevokedClaim',[id,'explorer-b',na]],['setSupportedNameWrapper',[await wrapper.getAddress(),'true']],['pause',[]],['unpause',[]],
  ])await prepared(method,values);
  assert.deepEqual([...done].sort(),Object.keys(ACTIONS).sort());
  const state=await registry.entitlement(ethers.id(id));assert.equal(state[3],4n);assert.equal(state[4],5n);
  assert.equal((await registry.claimRecord(ethers.id(id),ethers.namehash('explorer-a.club.agi.eth')))[4],3n);
  assert.equal(await registry.claimantOf(ethers.id(id),ethers.namehash('explorer-b.club.agi.eth')),na);
  assert.equal(await registry.claimantOf(ethers.id(id),ethers.namehash('explorer-c.club.agi.eth')),ethers.ZeroAddress);
  assert.equal(await registry.admin(),aa);assert.equal(await registry.isAdmin(da),false);
 });
 await run('Production constructor rejects chain 31337 even with canonical-shaped local fixtures',async()=>{
  const E='0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',W='0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
  await rpc.request({method:'hardhat_setCode',params:[E,await provider.getCode(await ens.getAddress())]});
  await rpc.request({method:'hardhat_setCode',params:[W,await provider.getCode(await wrapper.getAddress())]});
  await tx(new ethers.Contract(E,artifact('QualificationENS').abi,deployer).setOwner(root,aa));
  const a=artifact('AGIClubEntitlementRegistryMainnet');let caught;
  try{await provider.call({from:da,data:a.bytecode});}catch(e){caught=e;}
  assert(caught,'Mainnet constructor must reject');const data=revertData(caught);
  assert.equal(new ethers.Interface(a.abi).parseError(data)?.name,'EthereumMainnetRequired');
 });
 report.passed=report.results.filter(x=>x.status==='PASS').length;report.failed=report.results.filter(x=>x.status==='FAIL').length;report.status=report.failed?'FAIL':'PASS';
}catch(e){report.status=e.code==='ERR_MODULE_NOT_FOUND'?'BLOCKED_DEPENDENCY_UNAVAILABLE':'FAIL';report.error=e.code==='ERR_MODULE_NOT_FOUND'?'Production dependencies not installed':e.message;}
finally{report.testFileSha256=createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');fs.writeFileSync('qualification/evm-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));provider?.destroy();if(connection)await connection.close();if(report.status!=='PASS')process.exitCode=1;}
