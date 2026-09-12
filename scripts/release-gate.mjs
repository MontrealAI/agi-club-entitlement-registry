/** Evidence completeness and binding gate, not an independent security opinion. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {sourceDigest,sha256} from './source-digest.mjs';
import {ENS,WRAPPER,ROOT,REGISTRY_VERSION} from '../shared/entitlement-request.mjs';

export const LOCAL_STAGES = Object.freeze(['check:repo','check:lock','test:offline','compile','test:evm','test:journey','build:site','test:browser']);
const PROD = 'contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet';
const hash = value => typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value);
const address = value => typeof value === 'string' && /^0x[0-9a-f]{40}$/i.test(value) && !/^0x0{40}$/.test(value);
export function releaseGate(root=process.cwd()) {
  root = fs.realpathSync(root);
  const source=sourceDigest(root).sourceSha256, blockers=[], checks=[];
  // Refuse path traversal and links before opening evidence, including parent directories.
  const readFile = (relative, directory) => {
    const base = path.join(root,directory), file = path.resolve(root,relative);
    assert(file.startsWith(base+path.sep), 'Evidence path escapes its directory');
    let part = root;
    for (const segment of path.relative(root,file).split(path.sep)) {
      part = path.join(part,segment);
      assert(!fs.lstatSync(part).isSymbolicLink(), 'Evidence symlinks are not allowed');
    }
    assert(fs.statSync(file).isFile(), 'Evidence must be a regular file');
    const bytes = fs.readFileSync(file);
    assert(bytes.length > 0, 'Evidence is empty');
    return bytes;
  };
  const read = (relative, directory='qualification') => {
    const bytes=readFile(relative,directory);
    return {report:JSON.parse(bytes.toString('utf8')),sha256:sha256(bytes)};
  };
  let compiler, qualifiedBytecode=null;
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  try {
    const entry=read('qualification/LOCAL_RELEASE.json'), q=entry.report;
    assert(q.status==='PASS' && q.sourceSha256===source && q.sourceUnchanged===true && q.mainnetAuthorization===false);
    assert(q.repositoryVersion===pkg.version && q.contractVersion===REGISTRY_VERSION);
    assert(typeof q.at==='string' && Number.isFinite(Date.parse(q.at)));
    assert(Array.isArray(q.results) && q.results.length===LOCAL_STAGES.length);
    const logs=LOCAL_STAGES.map((name,i)=>{
      const result=q.results[i], file='qualification/'+name.replaceAll(':','-')+'.log';
      assert(result?.name===name && result.status==='PASS' && result.exitCode===0 && result.log===file);
      return {path:file,sha256:sha256(readFile(file,'qualification'))};
    });
    checks.push({type:'local',sha256:entry.sha256,logs});
  } catch { blockers.push('Missing or incomplete local qualification for current source; rerun npm run qualify and keep all eight logs'); }
  try {
    const entry=read('qualification/compiler-status.json'), q=entry.report;
    assert(q.status==='PASS' && q.sourceSha256===source);
    assert(typeof q.compiler==='string' && q.compiler.startsWith(pkg.devDependencies.solc+'+'));
    assert(q.hardhat===pkg.devDependencies.hardhat && q.profile==='production' && q.productionContract===PROD);
    assert(Number.isInteger(q.creationBytes) && q.creationBytes>0 && q.creationBytes<=49152);
    assert(Number.isInteger(q.runtimeBytes) && q.runtimeBytes>0 && q.runtimeBytes<=24576);
    assert(hash(q.creationCodeHash) && hash(q.templateRuntimeCodeHash));
    compiler=q;
    checks.push({type:'compiler',sha256:entry.sha256});
  } catch { blockers.push('Missing or invalid production compiler evidence for current source; rerun npm run qualify'); }
  try {
    assert(!fs.existsSync(path.join(root,'.local/mainnet-fork.lock')),'Fork rehearsal running or interrupted');
    const entry=read('qualification/mainnet-fork.json'), q=entry.report, identity=q.identity;
    assert(q.status==='PASS' && q.sourceSha256===source);
    assert(typeof q.attemptId==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(q.attemptId));
    assert(typeof q.completedAt==='string' && Number.isFinite(Date.parse(q.completedAt)));
    assert(q.scope==='LOCAL_FORK_OF_PINNED_MAINNET; no real transactions; not real-wallet acceptance');
    assert(compiler && q.creationCodeHash===compiler.creationCodeHash);
    assert(Number.isSafeInteger(q.forkBlock?.number) && q.forkBlock.number>0 && hash(q.forkBlock.hash));
    assert(identity?.chainId===1 && identity.contractVersion===REGISTRY_VERSION && hash(identity.runtimeCodeHash));
    assert(identity.root?.toLowerCase()===ROOT && identity.ens?.toLowerCase()===ENS && identity.wrapper?.toLowerCase()===WRAPPER);
    assert(address(identity.address) && address(identity.admin));
    assert(Array.isArray(q.results) && q.results.length>0);
    const labels=new Set();
    for (const result of q.results) {
      assert(typeof result.label==='string' && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(result.label));
      assert(!labels.has(result.label)); labels.add(result.label);
      assert(result.status==='PASS' && address(result.owner) && hash(result.node) && typeof result.wrapped==='boolean');
    }
    qualifiedBytecode={creationCodeHash:compiler.creationCodeHash.toLowerCase(),runtimeCodeHash:identity.runtimeCodeHash.toLowerCase(),admin:identity.admin.toLowerCase()};
    checks.push({type:'fork',sha256:entry.sha256});
  } catch { blockers.push(fs.existsSync(path.join(root,'.local/mainnet-fork.lock'))?'Mainnet fork rehearsal is running or interrupted; inspect .local/mainnet-fork.lock before rerunning':'Missing or incomplete pinned mainnet-fork evidence matching the production build; rerun npm run test:fork with approved real memberships'); }
  try {
    const e=read('.local/external-evidence.json','.local').report;
    if(e.sourceSha256!==source) blockers.push('External evidence does not bind current source');
    for(const name of ['independentSecurityReview','legalReview','realWalletStaging','privateRequestStaging','fulfillmentStaging']) {
      const x=e[name];
      if(x?.status!=='PASS'||typeof x.reviewer!=='string'||!x.reviewer.trim()||typeof x.file!=='string'||!x.file.startsWith('.local/')||!(/^[0-9a-f]{64}$/.test(x.sha256||''))) {
        blockers.push(name+': missing reviewed evidence'); continue;
      }
      if(sha256(readFile(x.file,'.local'))!==x.sha256) { blockers.push(name+': report hash mismatch'); continue; }
      checks.push({type:name,reviewer:x.reviewer,sha256:x.sha256});
    }
  } catch { blockers.push('External evidence unavailable, empty or outside the private evidence directory'); }
  // The runner may start after the first lock check, including while private reports are read.
  // Recheck the exact fork bytes as well: a failed attempt can finish and remove its lock.
  if(qualifiedBytecode) {
    const lock=path.join(root,'.local/mainnet-fork.lock'),index=checks.findIndex(x=>x.type==='fork');
    try {
      assert(!fs.existsSync(lock),'Fork rehearsal started');
      assert.equal(sha256(readFile('qualification/mainnet-fork.json','qualification')),checks[index].sha256,'Fork report changed');
      assert(!fs.existsSync(lock),'Fork rehearsal started during final read');
    } catch {
      qualifiedBytecode=null;checks.splice(index,1);
      blockers.push('Fork evidence changed or a rehearsal started during the release check; rerun release:gate after completion and inspect any retained fork lock');
    }
  }
  return {schema:'AGIClubDeploymentGate/1',sourceSha256:source,status:blockers.length?'BLOCKED':'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW',deploymentAuthorized:false,blockers,checks,qualifiedBytecode,evidenceSha256:sha256(JSON.stringify(checks)),note:'Checks bind documents; they do not prove the truth of external assertions. Root-holder approval is a separate step. Broad launch requires the subsequent real production canary.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  fs.mkdirSync('qualification',{recursive:true});const r=releaseGate();fs.writeFileSync('qualification/DEPLOYMENT_GATE.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(r.blockers.length)process.exitCode=1;
}
