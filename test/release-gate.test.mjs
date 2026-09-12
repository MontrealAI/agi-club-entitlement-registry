import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {releaseGate} from '../scripts/release-gate.mjs';
import {benefitLaunchGate} from '../scripts/benefit-launch-gate.mjs';
import {sha256,sourceDigest} from '../scripts/source-digest.mjs';
import {ENS,WRAPPER,ROOT,REGISTRY_VERSION} from '../shared/entitlement-request.mjs';

const stages=['check:repo','check:lock','test:offline','compile','test:evm','test:journey','build:site','test:browser'];
const kinds=['independentSecurityReview','legalReview','realWalletStaging','privateRequestStaging'];
const localFile='qualification/LOCAL_RELEASE.json',compilerFile='qualification/compiler-status.json',forkFile='qualification/mainnet-fork.json';
const hash=n=>'0x'+n.repeat(64),address=n=>'0x'+n.repeat(40);
function fixture(t) {
 // Synthetic reports exist ONLY in a temporary unit-test directory. They are never release evidence.
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'agi-gate-test-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(file,data)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof data==='string'?data:JSON.stringify(data));};
 const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const edit=(file,fn)=>{const value=read(file);fn(value);write(file,value);};
 const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 write('package.json',pkg);
 const source=sourceDigest(root).sourceSha256;
 const results=stages.map(name=>{const log='qualification/'+name.replaceAll(':','-')+'.log';write(log,'SYNTHETIC UNIT TEST LOG: '+name);return {name,status:'PASS',exitCode:0,log};});
 write(localFile,{repositoryVersion:pkg.version,contractVersion:REGISTRY_VERSION,status:'PASS',sourceSha256:source,sourceUnchanged:true,at:new Date().toISOString(),results,mainnetAuthorization:false});
 write(compilerFile,{status:'PASS',sourceSha256:source,compiler:pkg.devDependencies.solc+'+fixture',hardhat:pkg.devDependencies.hardhat,profile:'production',productionContract:'contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet',creationBytes:100,runtimeBytes:80,creationCodeHash:hash('1'),templateRuntimeCodeHash:hash('2')});
 write(forkFile,{status:'PASS',attemptId:'00000000-0000-4000-8000-000000000001',completedAt:new Date().toISOString(),scope:'LOCAL_FORK_OF_PINNED_MAINNET; no real transactions; not real-wallet acceptance',sourceSha256:source,creationCodeHash:hash('1'),forkBlock:{number:20000000,hash:hash('3')},identity:{chainId:1,contractVersion:REGISTRY_VERSION,runtimeCodeHash:hash('4'),root:ROOT,ens:ENS,wrapper:WRAPPER,address:address('5'),admin:address('6')},results:[{label:'fixture',status:'PASS',owner:address('7'),node:hash('8'),wrapped:true}]});
 const external={sourceSha256:source,deploymentScope:'EMPTY_REGISTRY_ONLY'};
 for(const kind of kinds) {const file='.local/'+kind+'.txt',report='SYNTHETIC UNIT TEST EVIDENCE: '+kind;write(file,report);external[kind]={status:'PASS',reviewer:'Fixture reviewer',file,sha256:sha256(report)};}
 write('.local/external-evidence.json',external);
 return {root,write,read,edit,gate:()=>releaseGate(root),remove:file=>fs.rmSync(path.join(root,file)),blocked:()=>assert.equal(releaseGate(root).status,'BLOCKED')};
}
test('Complete evidence binds every log and both code hashes, without granting deployment authority',t=>{
 const f=fixture(t),g=f.gate();assert.equal(g.status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW');assert.equal(g.deploymentAuthorized,false);
 assert.equal(g.checks.find(x=>x.type==='local').logs.length,8);
 assert.deepEqual(g.qualifiedBytecode,{creationCodeHash:hash('1'),runtimeCodeHash:hash('4'),admin:address('6')});
});
for(const [name,modify] of [
 ['missing stages',q=>{q.results=[];}],
 ['duplicated stage',q=>{q.results[7]={...q.results[0]};}],
 ['failed stage under PASS summary',q=>{q.results[7].status='FAIL_OR_BLOCKED';}],
 ['nonzero exit code',q=>{q.results[7].exitCode=1;}],
 ['source changed during qualification',q=>{q.sourceUnchanged=false;}],
 ['different source',q=>{q.sourceSha256='0'.repeat(64);}],
 ['wrong repository version',q=>{q.repositoryVersion='0.0.0';}],
 ['log traversal',q=>{q.results[0].log='qualification/../package.json';}],
]) test('Local evidence refuses '+name,t=>{const f=fixture(t);f.edit(localFile,modify);f.blocked();});
test('Missing qualification log blocks the gate',t=>{const f=fixture(t);f.remove('qualification/test-browser.log');f.blocked();});
test('Changed log changes the approval evidence fingerprint',t=>{
 const f=fixture(t),before=f.gate();f.write('qualification/test-browser.log','CHANGED SYNTHETIC LOG');const after=f.gate();assert.notEqual(after.evidenceSha256,before.evidenceSha256);
});
for(const [name,modify] of [
 ['missing completion time',q=>{delete q.completedAt;}],
 ['missing attempt identity',q=>{delete q.attemptId;}],
 ['missing block hash',q=>{delete q.forkBlock.hash;}],
 ['invalid block',q=>{q.forkBlock.number=-1;}],
 ['substitute ENS registry',q=>{q.identity.ens=address('9');}],
 ['wrong chain',q=>{q.identity.chainId=31337;}],
 ['zero owner',q=>{q.results[0].owner=address('0');}],
 ['unexecuted members',q=>{q.results=[];}],
 ['failed member',q=>{q.results[0].status='FAIL';}],
 ['repeated members',q=>{q.results.push({...q.results[0]});}],
 ['different creation code',q=>{q.creationCodeHash=hash('9');}],
 ['missing creation code',q=>{delete q.creationCodeHash;}],
]) test('Fork evidence refuses '+name,t=>{const f=fixture(t);f.edit(forkFile,modify);f.blocked();});
for(const [name,modify] of [
 ['wrong compiler',q=>{q.compiler='0.0.0+fixture';}],
 ['wrong profile',q=>{q.profile='default';}],
 ['unqualified build',q=>{q.status='FAIL';}],
 ['runtime too large',q=>{q.runtimeBytes=24577;}],
]) test('Compiler evidence refuses '+name,t=>{const f=fixture(t);f.edit(compilerFile,modify);f.blocked();});
test('Missing compiler identity cannot qualify a fork',t=>{const f=fixture(t);f.remove(compilerFile);f.blocked();});
test('Private report mutation invalidates its recorded hash',t=>{const f=fixture(t);f.write('.local/independentSecurityReview.txt','CHANGED SYNTHETIC REPORT');f.blocked();});
test('Technical evidence alone cannot replace the legal review',t=>{
 const f=fixture(t);f.edit('.local/external-evidence.json',q=>{delete q.legalReview;});
 assert(f.gate().blockers.includes('legalReview: missing reviewed evidence'));
});
test('An unexecuted legal review blocks deployment preparation',t=>{
 const f=fixture(t);f.edit('.local/external-evidence.json',q=>{q.legalReview.status='NOT_EXECUTED';});f.blocked();
});
test('Legal review bytes are bound into the root holder approval',t=>{
 const f=fixture(t),before=f.gate();f.write('.local/legalReview.txt','CHANGED SYNTHETIC LEGAL REPORT');f.blocked();
 f.edit('.local/external-evidence.json',q=>{q.legalReview.sha256=sha256('CHANGED SYNTHETIC LEGAL REPORT');});
 const after=f.gate();assert.equal(after.status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW');assert.notEqual(after.evidenceSha256,before.evidenceSha256);
});
for(const file of ['frontend/legal.html','PRIVACY.md','LICENSE','docs/LEGAL_RELEASE_REVIEW.md'])test('Changing '+file+' invalidates prior reviewed source',t=>{
 const f=fixture(t);assert.equal(f.gate().status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW');
 f.write(file,'CHANGED SYNTHETIC LEGAL SCOPE');assert(f.gate().blockers.includes('External evidence does not bind current source'));
});
test('A private report cannot point outside the private directory',t=>{
 const f=fixture(t);f.edit('.local/external-evidence.json',q=>{q.independentSecurityReview.file='.local/../package.json';q.independentSecurityReview.sha256=sha256(fs.readFileSync(path.join(f.root,'package.json')));});f.blocked();
});
test('A symlinked evidence directory cannot substitute other files',t=>{
 const f=fixture(t),target=path.join(f.root,'outside');fs.renameSync(path.join(f.root,'.local'),target);
 fs.symlinkSync(target,path.join(f.root,'.local'),process.platform==='win32'?'junction':'dir');f.blocked();
});

test('A running or interrupted fork blocks otherwise complete evidence',t=>{const f=fixture(t);f.write('.local/mainnet-fork.lock','SYNTHETIC INTERRUPTED RUN');assert(f.gate().blockers.some(x=>x.includes('running or interrupted')));f.blocked();});

for(const [name,whenRead,occurrence,replaceReport] of [
 ['lock acquired after the initial lock check',forkFile,1,false],
 ['lock acquired while external evidence is read','.local/privateRequestStaging.txt',1,false],
 ['failed attempt completes after the fork report was read','.local/privateRequestStaging.txt',1,true],
 ['lock acquired during the final fork-report read',forkFile,2,false],
])test('Concurrent fork evidence rejects '+name,t=>{
 const f=fixture(t),previous=f.read(forkFile),original=fs.readFileSync;
 const watched=path.join(f.root,whenRead);let count=0,triggered=false;
 t.mock.method(fs,'readFileSync',function(file,...args){
  const bytes=original.call(this,file,...args);
  if(file===watched&&++count===occurrence){
   triggered=true;f.write('.local/mainnet-fork.lock','SYNTHETIC CONCURRENT ATTEMPT');
   if(replaceReport){f.write(forkFile,{...previous,status:'FAIL_OR_BLOCKED'});f.remove('.local/mainnet-fork.lock');}
  }
  return bytes;
 });
 const g=f.gate();assert(triggered,'The intended filesystem interleaving must execute');
 assert.equal(g.status,'BLOCKED');assert.equal(g.qualifiedBytecode,null);assert(!g.checks.some(x=>x.type==='fork'),'A stale fork must not contribute to approval evidence');
});

test('An explicitly reviewed empty deployment does not need a chosen benefit or fulfillment report',t=>{
 const f=fixture(t),q=f.read('.local/external-evidence.json'),g=f.gate();assert(!q.fulfillmentStaging);assert.equal(g.status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW');
 assert.equal(g.deploymentScope,'EMPTY_REGISTRY_ONLY');assert.equal(g.benefitLaunchAuthorized,false);assert.equal(g.deploymentAuthorized,false);
 assert.equal(benefitLaunchGate(f.root).status,'BLOCKED');
});
for(const scope of [undefined,'BENEFIT_LAUNCH','',null])test('Empty deployment refuses missing or different scope '+scope,t=>{
 const f=fixture(t);f.edit('.local/external-evidence.json',e=>{e.deploymentScope=scope;});assert(f.gate().blockers.includes('Explicit EMPTY_REGISTRY_ONLY deployment scope is required'));f.blocked();
});

function launchFixture(t) {
 const f=fixture(t),definition='FICTITIOUS reviewed access allocation. No real launch evidence.';
 const benefit={chainId:1,registryAddress:address('5'),registryCodeHash:hash('4'),entitlementId:hash('9'),definitionFile:'.local/benefit-definition.txt',definitionSha256:sha256(definition)};
 f.write(benefit.definitionFile,definition);
 const scopeSha256=sha256(JSON.stringify(benefit));
 const launch={schema:'AGIClubBenefitLaunchEvidence/1',scope:'LIMITED_BENEFIT_CANARY',sourceSha256:sourceDigest(f.root).sourceSha256,benefit};
 for(const kind of ['benefitLegalReview','fulfillmentStaging']){
  const file='.local/'+kind+'.txt',report='SYNTHETIC REVIEW FOR '+kind;f.write(file,report);
  launch[kind]={status:'PASS',reviewer:'Fixture reviewer',scopeSha256,file,sha256:sha256(report)};
 }
 f.write('.local/benefit-launch-evidence.json',launch);
 return {...f,launch:()=>benefitLaunchGate(f.root),change:fn=>f.edit('.local/benefit-launch-evidence.json',fn)};
}
test('A chosen non-event benefit needs its own legal and fulfillment evidence and grants no launch authority',t=>{
 const f=launchFixture(t),g=f.launch();assert.equal(g.status,'EVIDENCE_READY_FOR_BENEFIT_REVIEW');
 assert.equal(g.scope,'LIMITED_BENEFIT_CANARY');for(const k of ['deploymentAuthorized','benefitLaunchAuthorized','broadLaunchAuthorized'])assert.equal(g[k],false);
 assert.equal(g.benefit.entitlementId,hash('9'));assert.deepEqual(g.checks.map(x=>x.type),['benefitScope','launchEvidence','benefitLegalReview','fulfillmentStaging']);
 assert.match(g.note,/not mechanically restricted/);
});
for(const [name,change] of [
 ['missing delivery rehearsal',e=>{delete e.fulfillmentStaging;}],
 ['legacy Eventbrite label',e=>{e.eventbriteStaging=e.fulfillmentStaging;delete e.fulfillmentStaging;}],
 ['missing benefit legal review',e=>{delete e.benefitLegalReview;}],
 ['unexecuted rehearsal',e=>{e.fulfillmentStaging.status='NOT_EXECUTED';}],
 ['absent reviewer',e=>{e.fulfillmentStaging.reviewer=' ';}],
 ['different source',e=>{e.sourceSha256='0'.repeat(64);}],
 ['different launch scope',e=>{e.scope='BROAD_LAUNCH';}],
 ['substituted entitlement',e=>{e.benefit.entitlementId=hash('a');}],
 ['substituted registry',e=>{e.benefit.registryAddress=address('a');}],
 ['wrong runtime',e=>{e.benefit.registryCodeHash=hash('a');}],
 ['wrong chain',e=>{e.benefit.chainId=31337;}],
 ['extra benefit scope field',e=>{e.benefit.approved=true;}],
 ['zero ID',e=>{e.benefit.entitlementId=hash('0');}],
 ['unbound review',e=>{e.fulfillmentStaging.scopeSha256='a'.repeat(64);}],
 ['report hash mismatch',e=>{e.fulfillmentStaging.sha256='a'.repeat(64);}],
 ['definition hash mismatch',e=>{e.benefit.definitionSha256='a'.repeat(64);}],
 ['definition traversal',e=>{e.benefit.definitionFile='.local/../package.json';}],
 ['report traversal',e=>{e.fulfillmentStaging.file='.local/../package.json';}],
])test('Benefit gate refuses '+name+' without blocking the separately reviewed empty deployment',t=>{
 const f=launchFixture(t);f.change(change);assert.equal(f.launch().status,'BLOCKED');assert.equal(f.gate().status,'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW');
});
test('Changed definition bytes require new benefit scope and matching new reviews',t=>{
 const f=launchFixture(t),before=f.launch();f.write('.local/benefit-definition.txt','REVISED FICTITIOUS TERMS');assert.equal(f.launch().status,'BLOCKED');
 f.change(e=>{e.benefit.definitionSha256=sha256('REVISED FICTITIOUS TERMS');});assert.equal(f.launch().status,'BLOCKED');
 f.change(e=>{const scope=sha256(JSON.stringify(e.benefit));for(const k of ['benefitLegalReview','fulfillmentStaging'])e[k].scopeSha256=scope;});
 const after=f.launch();assert.equal(after.status,'EVIDENCE_READY_FOR_BENEFIT_REVIEW');assert.notEqual(after.benefitScopeSha256,before.benefitScopeSha256);assert.notEqual(after.evidenceSha256,before.evidenceSha256);
});
for(const [name,mutate] of [
 ['new fork lock',f=>f.write('.local/mainnet-fork.lock','SYNTHETIC NEW ATTEMPT')],
 ['changed qualification log',f=>f.write('qualification/test-browser.log','SYNTHETIC CHANGED LOG')],
 ['changed source',f=>f.write('frontend/changed.js','// SYNTHETIC CHANGED SOURCE')],
])test('Benefit review refuses '+name+' appearing during its private report read',t=>{
 const f=launchFixture(t),read=fs.readFileSync;let triggered=false;
 t.mock.method(fs,'readFileSync',function(file,...args){const bytes=read.call(this,file,...args);if(file===path.join(f.root,'.local/fulfillmentStaging.txt')&&!triggered){triggered=true;mutate(f);}return bytes;});
 const g=f.launch();assert(triggered);assert.equal(g.status,'BLOCKED');assert(g.blockers.includes('Deployment qualification is incomplete or changed during benefit review'));
});
