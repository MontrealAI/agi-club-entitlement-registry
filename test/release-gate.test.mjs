import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {releaseGate} from '../scripts/release-gate.mjs';
import {sha256,sourceDigest} from '../scripts/source-digest.mjs';
import {ENS,WRAPPER,ROOT,REGISTRY_VERSION} from '../shared/ticket-request.mjs';

const stages=['check:repo','check:lock','test:offline','compile','test:evm','test:journey','build:site','test:browser'];
const kinds=['independentSecurityReview','realWalletStaging','privateRequestStaging','eventbriteStaging'];
const localFile='qualification/LOCAL_RELEASE.json',compilerFile='qualification/compiler-status.json',forkFile='qualification/mainnet-fork.json';
const hash=n=>'0x'+n.repeat(64),address=n=>'0x'+n.repeat(40);
function fixture(t) {
 // Synthetic reports exist ONLY in a temporary unit-test directory. They are never release evidence.
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agi-gate-test-'));
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
 write(forkFile,{status:'PASS',scope:'LOCAL_FORK_OF_PINNED_MAINNET; no real transactions; not real-wallet acceptance',sourceSha256:source,creationCodeHash:hash('1'),forkBlock:{number:20000000,hash:hash('3')},identity:{chainId:1,contractVersion:REGISTRY_VERSION,runtimeCodeHash:hash('4'),root:ROOT,ens:ENS,wrapper:WRAPPER,address:address('5'),admin:address('6')},results:[{label:'fixture',status:'PASS',owner:address('7'),node:hash('8'),wrapped:true}]});
 const external={sourceSha256:source};
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
test('A private report cannot point outside the private directory',t=>{
 const f=fixture(t);f.edit('.local/external-evidence.json',q=>{q.independentSecurityReview.file='.local/../package.json';q.independentSecurityReview.sha256=sha256(fs.readFileSync(path.join(f.root,'package.json')));});f.blocked();
});
test('A symlinked evidence directory cannot substitute other files',t=>{
 const f=fixture(t),target=path.join(f.root,'outside');fs.renameSync(path.join(f.root,'.local'),target);
 fs.symlinkSync(target,path.join(f.root,'.local'),process.platform==='win32'?'junction':'dir');f.blocked();
});
