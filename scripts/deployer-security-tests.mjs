/** A hostile disposable deployer in a guarded local EVM. No real accounts or RPC. */
import assert from 'node:assert/strict';
import {network,artifacts} from 'hardhat';
import {ethers} from 'ethers';
import {ENS,WRAPPER,ROOT,PROD,deploy,receipt,checkProduction,save} from './runtime.mjs';
import {sourceDigest} from './source-digest.mjs';
import {checkDeploymentOrigin} from './deployment-origin.mjs';
import {revertData} from '../test/revert-data.mjs';
const report={status:'NOT_EXECUTED',scope:'LOCAL ISOLATED EVM; production constructor with fictitious ENS infrastructure and hostile deployer. Not live mainnet or independent audit evidence.',results:[]};
let connection,provider;
try {
 const before=sourceDigest().sourceSha256;
 connection=await network.create();assert.equal(connection.networkName,'isolatedMainnetModel');
 const rpc=connection.provider;await rpc.request({method:'hardhat_metadata',params:[]});
 provider=new ethers.BrowserProvider(rpc,undefined,{cacheTimeout:-1});provider.pollingInterval=10;assert.equal((await provider.getNetwork()).chainId,1n);
 const [deployer,admin,member]=await Promise.all([0,1,2].map(i=>provider.getSigner(i)));
 const [da,aa,ma]=await Promise.all([deployer,admin,member].map(s=>s.getAddress()));
 for(const [name,address] of [['QualificationENS',ENS],['QualificationWrapper',WRAPPER]]){
  const mock=await deploy(artifacts,deployer,name);await rpc.request({method:'hardhat_setCode',params:[address,await provider.getCode(mock.target)]});
 }
 const ens=new ethers.Contract(ENS,(await artifacts.readArtifact('QualificationENS')).abi,deployer);
 await receipt(ens.setOwner(ROOT,aa));const label='fictitious-member',node=ethers.namehash(label+'.club.agi.eth');await receipt(ens.setOwner(node,ma));
 const c=await deploy(artifacts,deployer,PROD),artifact=await artifacts.readArtifact(PROD),creationCodeHash=ethers.keccak256(artifact.bytecode),runtime=await provider.getCode(c.target),runtimeCodeHash=ethers.keccak256(runtime);
 const check=async(name,fn)=>{await fn();report.results.push({name,status:'PASS'});};
 const parse=error=>c.interface.parseError(revertData(error));
 const id=ethers.id('FICTITIOUS_DEPLOYER_TEST'),category=ethers.id('FICTITIOUS_CATEGORY'),reason=ethers.id('FICTITIOUS_REASON');
 const operations=[['createEntitlement',[ethers.id('FICTITIOUS_SECOND'),category,1,0,0,1,ethers.ZeroHash]],['duplicateEntitlement',[id,ethers.id('FICTITIOUS_COPY')]],['setEntitlementState',[id,1]],['setCapacity',[id,1]],['setWindow',[id,0,0]],['setCategory',[id,category]],['setMetadataHash',[id,ethers.ZeroHash]],['setDescriptor',[id,'Test fictif','Fictitious test','',ethers.ZeroHash]],['adminGrantClaimToCurrentOwner',[id,label]],['adminGrantBatchToCurrentOwners',[id,[label]]],['adminGrantClaimOverride',[id,label,da,reason]],['revokeClaim',[id,label,reason]],['revokeBatch',[id,[label],reason]],['reinstateClaim',[id,label]],['reassignRevokedClaim',[id,label,da]],['setSupportedNameWrapper',[WRAPPER,true]],['pause',[]],['unpause',[]]];
 await check('Genuine direct creation passes independent origin verification and grants the deployer no initial role',async()=>{
  assert.equal(await c.entitlementCount(),0n);assert.equal(await c.admin(),aa);assert.equal(await c.isAdmin(da),false);
  const tx=c.deploymentTransaction(),latest=await provider.getBlock('latest');
  const r=await checkDeploymentOrigin(provider,{transactionHash:tx.hash,creationCodeHash,registryAddress:c.target,deployer:da,nonce:tx.nonce},ethers,latest.number);
  assert.equal(r.creationVerified,true);assert.equal(r.deployer,da.toLowerCase());
 });
 await receipt(c.connect(admin).createEntitlement(id,category,1,0,0,2,ethers.ZeroHash));
 await check('Every privileged production ABI function rejects a mined hostile-deployer transaction without changing state',async()=>{
  const privileged=artifact.abi.filter(f=>f.type==='function'&&!['view','pure'].includes(f.stateMutability)&&f.name!=='claim').map(f=>f.name).sort();
  assert.deepEqual(operations.map(([method])=>method).sort(),privileged,'New privileged ABI functions must be included');
  const before=Array.from(await c.entitlement(id));
  for(const [method,args] of operations){
   const last=await provider.getBlock('latest');let caught;
   try{await rpc.request({method:'eth_sendTransaction',params:[{from:da,to:c.target,data:c.interface.encodeFunctionData(method,args),gas:'0x1e8480'}]});}catch(error){caught=error;}
   assert(caught,method+' unexpectedly succeeded');assert.equal(parse(caught)?.name,'NotClubAdmin',method);
   const block=await provider.getBlock('latest');assert.equal(block.number,last.number+1);assert.equal(block.transactions.length,1);
   const mined=await provider.getTransactionReceipt(block.transactions[0]);assert.equal(mined.status,0,method);assert.deepEqual(Array.from(mined.logs),[]);
   assert.equal(await c.isAdmin(da),false);assert.equal(await c.admin(),aa);assert.equal(await c.paused(),false);assert.equal(await c.entitlementCount(),1n);
   assert.deepEqual(Array.from(await c.entitlement(id)),before);assert.equal(await c.claimNodeCount(id),0n);assert.equal(await c.nameWrapperCount(),1n);
  }
  report.privilegedFunctionsTested=privileged.length;
 });
 await check('A hostile deployer cannot claim another member’s allocation',async()=>{
  await assert.rejects(()=>c.connect(deployer).claim.staticCall(id,label),error=>{const p=parse(error);return p?.name==='ClaimRejected'&&p.args[0]===12n;});
  assert.equal(await c.wasEverClaimed(id,node),false);
 });
 await check('Root rotation and unavailable ENS never activate a deployer recovery path',async()=>{
  await receipt(ens.setOwner(ROOT,ma));assert.equal(await c.admin(),ma);
  for(const [method,args] of operations)await assert.rejects(()=>c.connect(deployer).getFunction(method).staticCall(...args),error=>parse(error)?.name==='NotClubAdmin');
  await assert.rejects(()=>c.connect(admin).pause.staticCall(),error=>parse(error)?.name==='NotClubAdmin');
  await receipt(c.connect(member).pause());await receipt(c.connect(member).unpause());
  await receipt(ens.setUnavailable(true));assert.equal(await c.admin(),ethers.ZeroAddress);
  for(const [method,args] of operations)await assert.rejects(()=>c.connect(deployer).getFunction(method).staticCall(...args),error=>parse(error)?.name==='AdminUnavailable');
  await receipt(ens.setUnavailable(false));await receipt(ens.setOwner(ROOT,aa));assert.equal(await c.isAdmin(da),false);
 });
 await check('Identical runtime from an unreviewed constructor is rejected despite matching ENS getters',async()=>{
  // TEST ONLY EVM init code: seed Pausable's first slot, then return the genuine runtime.
  // This proves that runtime identity alone cannot establish trusted initialization.
  const length=ethers.toBeHex(ethers.getBytes(runtime).length,2).slice(2);
  const data='0x600160005561'+length+'61001460003961'+length+'6000f3'+runtime.slice(2);
  const hostile=await deployer.sendTransaction({data}),mined=await receipt(hostile),clone=new ethers.Contract(mined.contractAddress,artifact.abi,provider);
  assert.equal(await clone.paused(),true);assert.equal(await c.paused(),false);assert.equal(await clone.nameWrapperCount(),0n);
  await checkProduction(provider,clone.target,aa,runtimeCodeHash); // The previous identity-only inspector accepted this.
  const latest=await provider.getBlock('latest');
  await assert.rejects(()=>checkDeploymentOrigin(provider,{transactionHash:hostile.hash,creationCodeHash,registryAddress:clone.target,deployer:da,nonce:hostile.nonce},ethers,latest.number),/Creation bytecode differs/);
 });
 report.sourceSha256=sourceDigest().sourceSha256;assert.equal(report.sourceSha256,before);report.creationCodeHash=creationCodeHash;
 report.status='PASS';report.passed=report.results.length;report.mainnetAuthorization=false;
}catch(error){report.status='FAIL_OR_BLOCKED';report.error=error.shortMessage||error.message;process.exitCode=1;}
finally{save('qualification/deployer-security.json',report);console.log(JSON.stringify(report,null,2));provider?.destroy();if(connection)await connection.close();}
