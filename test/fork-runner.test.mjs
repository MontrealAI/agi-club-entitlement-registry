import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {runFork,FORK_SCOPE} from '../scripts/run-fork-tests.mjs';
import {sourceDigest} from '../scripts/source-digest.mjs';

const secret='FICTITIOUS_RPC_CREDENTIAL_MUST_NOT_APPEAR';
const admin='0x'+'1'.repeat(40);
function fixture(t) {
  // Synthetic reports and providers in temporary directories; never release evidence.
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agi-fork-runner-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'qualification'));
  const file=path.join(root,'qualification/mainnet-fork.json');
  const old=JSON.stringify({status:'PASS',note:'SYNTHETIC OLD UNIT TEST REPORT'});
  fs.writeFileSync(file,old);
  const env={ALLOW_READ_ONLY_FORK:'yes',MAINNET_FORK_RPC_URL:'https://rpc.example.org/'+secret,MAINNET_FORK_BLOCK:'20000000',EXPECTED_ADMIN:admin,MEMBER_LABELS:'fixture-one,fixture-two'};
  const candidate=({attemptId})=>({status:'PASS',scope:FORK_SCOPE,attemptId,sourceSha256:sourceDigest(root).sourceSha256,forkBlock:{number:20000000},identity:{admin},results:[{label:'fixture-one',status:'PASS'},{label:'fixture-two',status:'PASS'}]});
  const execute=args=>{assert.equal(JSON.parse(fs.readFileSync(file)).status,'FAIL_OR_BLOCKED');fs.writeFileSync(args.childOutput,JSON.stringify(candidate(args)));return {status:0};};
  const run=options=>runFork({root,loadEnvironment:()=>env,execute,...options});
  return {root,file,old,env,run,candidate,read:()=>JSON.parse(fs.readFileSync(file)),lock:path.join(root,'.local/mainnet-fork.lock')};
}
test('Runner replaces an old PASS before Hardhat starts and binds only the current successful attempt',t=>{
  const f=fixture(t),r=f.run();assert.equal(r.exitCode,0);assert.equal(f.read().status,'PASS');assert(f.read().completedAt);assert(!fs.existsSync(f.lock));
  const archived=path.join(f.root,'.local/fork-attempts',r.report.attemptId+'.previous.json');assert.equal(fs.readFileSync(archived,'utf8'),f.old);
  if(process.platform!=='win32')assert.equal(fs.statSync(archived).mode&0o777,0o600);
});
for(const [name,edit] of [
  ['missing RPC',e=>{delete e.MAINNET_FORK_RPC_URL;}],
  ['malformed pinned block',e=>{e.MAINNET_FORK_BLOCK='invalid';}],
  ['unsafe block integer',e=>{e.MAINNET_FORK_BLOCK='9007199254740993';}],
  ['zero root owner',e=>{e.EXPECTED_ADMIN='0x'+'0'.repeat(40);}],
  ['duplicate memberships',e=>{e.MEMBER_LABELS='fixture-one,fixture-one';}],
  ['non-direct memberships',e=>{e.MEMBER_LABELS='fixture.club.agi.eth';}],
  ['missing read-only acknowledgement',e=>{delete e.ALLOW_READ_ONLY_FORK;}],
])test('Preflight reports '+name+' without starting Hardhat or retaining credentials',t=>{
  const f=fixture(t);edit(f.env);let calls=0;const r=f.run({execute:()=>{calls++;}});assert.equal(r.exitCode,1);assert.equal(calls,0);assert.equal(f.read().status,'FAIL_OR_BLOCKED');assert(r.report.issues.length);assert(!JSON.stringify(r).includes(secret));assert(!fs.existsSync(f.lock));
});
test('Environment loading failure invalidates prior evidence and hides error contents',t=>{
  const f=fixture(t),r=f.run({loadEnvironment:()=>{throw Error(secret);}});assert.equal(r.exitCode,1);assert.equal(f.read().status,'FAIL_OR_BLOCKED');assert(!JSON.stringify(r).includes(secret));
});
test('Default launcher runs the installed package entry through Node and captures failing child output',t=>{
  const f=fixture(t),pkg=path.join(f.root,'node_modules/hardhat');fs.mkdirSync(pkg,{recursive:true});
  fs.writeFileSync(path.join(pkg,'package.json'),JSON.stringify({name:'hardhat',bin:{hardhat:'cli.cjs'},exports:{'./package.json':'./package.json'}}));
  fs.writeFileSync(path.join(pkg,'cli.cjs'),'process.stderr.write('+JSON.stringify(secret)+');process.exit(1);');
  const r=f.run({execute:undefined});assert.equal(r.exitCode,1);assert.match(r.report.error,/failed or was interrupted/);assert(!JSON.stringify(r).includes(secret));assert.equal(f.read().status,'FAIL_OR_BLOCKED');
});
for(const [name,result] of [
  ['configuration-load failure',{status:1,stderr:secret}],
  ['timeout',{status:null,signal:'SIGTERM',error:Error(secret)}],
  ['spawn failure',{status:null,error:Error(secret)}],
])test('A '+name+' cannot reuse a child PASS or leak captured output',t=>{
  const f=fixture(t);let child;
  const r=f.run({execute:args=>{child=args;fs.writeFileSync(args.childOutput,JSON.stringify(f.candidate(args)));return result;}});
  assert.equal(r.exitCode,1);assert.equal(f.read().status,'FAIL_OR_BLOCKED');assert(!JSON.stringify(r).includes(secret));
  fs.writeFileSync(child.childOutput,JSON.stringify(f.candidate(child)));assert.equal(f.read().status,'FAIL_OR_BLOCKED','A late child write cannot publish qualification');
});
test('A concurrent invocation cannot overwrite the active attempt or release its lock',t=>{
  const f=fixture(t),outer=f.run({execute:args=>{
    const before=fs.readFileSync(f.file,'utf8'),inner=f.run();assert.equal(inner.exitCode,1);assert(fs.existsSync(f.lock));assert.equal(fs.readFileSync(f.file,'utf8'),before);
    fs.writeFileSync(args.childOutput,JSON.stringify(f.candidate(args)));return {status:0};
  }});assert.equal(outer.exitCode,0);assert(!fs.existsSync(f.lock));
});
test('An interrupted lock is retained for inspection',t=>{
  const f=fixture(t);fs.mkdirSync(path.dirname(f.lock),{recursive:true});fs.writeFileSync(f.lock,'SYNTHETIC INTERRUPTED RUN');assert.equal(f.run().exitCode,1);assert.equal(fs.readFileSync(f.lock,'utf8'),'SYNTHETIC INTERRUPTED RUN');
});
for(const [name,edit] of [
  ['different attempt',q=>{q.attemptId='00000000-0000-4000-8000-000000000001';}],
  ['different pinned block',q=>{q.forkBlock.number++;}],
  ['different root',q=>{q.identity.admin='0x'+'2'.repeat(40);}],
  ['missing member result',q=>{q.results.pop();}],
  ['failed member',q=>{q.results[0].status='FAIL';}],
  ['different source',q=>{q.sourceSha256='0'.repeat(64);}],
])test('A claimed PASS for '+name+' is rejected',t=>{
  const f=fixture(t),r=f.run({execute:args=>{const q=f.candidate(args);edit(q);fs.writeFileSync(args.childOutput,JSON.stringify(q));return {status:0};}});assert.equal(r.exitCode,1);assert.equal(f.read().status,'FAIL_OR_BLOCKED');
});
test('Source mutation during rehearsal invalidates its result',t=>{
  const f=fixture(t),r=f.run({execute:args=>{const q=f.candidate(args);fs.writeFileSync(path.join(f.root,'VERSION'),'CHANGED SYNTHETIC SOURCE');fs.writeFileSync(args.childOutput,JSON.stringify(q));return {status:0};}});assert.equal(r.exitCode,1);assert.equal(f.read().status,'FAIL_OR_BLOCKED');
});
test('The actual fork child replaces raw provider exceptions with a fixed phase failure',async()=>{
  const source=fs.readFileSync(new URL('../scripts/fork-tests.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  const attemptId='00000000-0000-4000-8000-000000000001',writes=[];
  const process={env:{AGI_FORK_ATTEMPT_ID:attemptId,ALLOW_READ_ONLY_FORK:'yes',MAINNET_FORK_RPC_URL:'https://rpc.example.org/'+secret,MAINNET_FORK_BLOCK:'20000000',EXPECTED_ADMIN:admin,MEMBER_LABELS:'fixture-one'}};
  const context=vm.createContext({assert,FORK_SCOPE,process,network:{create:async()=>{throw Error(secret);}},save:(file,report)=>writes.push({file,report}),Date});
  await new vm.Script('(async()=>{'+source+'})()').runInContext(context);
  assert.equal(process.exitCode,1);assert.equal(writes.length,1);assert.equal(writes[0].file,'.local/fork-attempts/'+attemptId+'.json');assert.equal(writes[0].report.status,'FAIL_OR_BLOCKED');assert.equal(writes[0].report.phase,'connection');assert(!JSON.stringify(writes).includes(secret));
});
