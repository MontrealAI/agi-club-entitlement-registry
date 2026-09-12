/** Document binding for a chosen benefit canary, not an on-chain launch or approval. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {releaseGate} from './release-gate.mjs';
import {readEvidenceFile} from './evidence-files.mjs';
import {sha256} from './source-digest.mjs';
const digest=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x)&&!/^0x0{64}$/.test(x);
const address=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&!/^0x0{40}$/.test(x);
const fields=['chainId','registryAddress','registryCodeHash','entitlementId','definitionFile','definitionSha256'];
export function benefitLaunchGate(root=process.cwd()) {
  root=fs.realpathSync(root);
  const deployment=releaseGate(root),blockers=[...deployment.blockers],checks=[];
  let benefit=null,benefitScopeSha256=null;
  try {
    const bytes=readEvidenceFile(root,'.local/benefit-launch-evidence.json','.local'),e=JSON.parse(bytes);
    assert(e.schema==='AGIClubBenefitLaunchEvidence/1'&&e.sourceSha256===deployment.sourceSha256&&e.scope==='LIMITED_BENEFIT_CANARY','Launch scope/source mismatch');
    const b=e.benefit;
    assert(b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).sort().join()===fields.slice().sort().join(),'Exact benefit scope required');
    assert(b.chainId===1&&address(b.registryAddress)&&hash(b.registryCodeHash)&&hash(b.entitlementId)&&digest(b.definitionSha256),'Invalid benefit scope');
    assert(typeof b.definitionFile==='string'&&b.definitionFile.startsWith('.local/'),'Private definition required');
    assert.equal(sha256(readEvidenceFile(root,b.definitionFile,'.local')),b.definitionSha256,'Benefit definition hash mismatch');
    benefit=Object.fromEntries(fields.map(f=>[f,b[f]]));benefitScopeSha256=sha256(JSON.stringify(benefit));
    if(deployment.qualifiedBytecode&&benefit.registryCodeHash!==deployment.qualifiedBytecode.runtimeCodeHash)blockers.push('Benefit runtime does not match qualified production code');
    checks.push({type:'benefitScope',sha256:benefitScopeSha256},{type:'launchEvidence',sha256:sha256(bytes)});
    for(const name of ['benefitLegalReview','fulfillmentStaging']) {
      const x=e[name];
      if(x?.status!=='PASS'||typeof x.reviewer!=='string'||!x.reviewer.trim()||x.scopeSha256!==benefitScopeSha256||!digest(x.sha256)||typeof x.file!=='string'||!x.file.startsWith('.local/')) {
        blockers.push(name+': missing reviewed evidence for this benefit');continue;
      }
      if(sha256(readEvidenceFile(root,x.file,'.local'))!==x.sha256){blockers.push(name+': report hash mismatch');continue;}
      checks.push({type:name,reviewer:x.reviewer,scopeSha256:x.scopeSha256,sha256:x.sha256});
    }
  } catch {blockers.push('Chosen benefit evidence is missing, invalid, changed or outside the private directory');}
  // Bind the deployment evidence observed throughout this read; a new rehearsal cannot lend stale proof.
  const current=releaseGate(root);
  if(current.status!=='EVIDENCE_READY_FOR_PRINCIPAL_REVIEW'||current.evidenceSha256!==deployment.evidenceSha256||current.sourceSha256!==deployment.sourceSha256)blockers.push('Deployment qualification is incomplete or changed during benefit review');
  return {schema:'AGIClubBenefitLaunchGate/1',scope:'LIMITED_BENEFIT_CANARY',sourceSha256:deployment.sourceSha256,
    status:blockers.length?'BLOCKED':'EVIDENCE_READY_FOR_BENEFIT_REVIEW',deploymentAuthorized:false,benefitLaunchAuthorized:false,broadLaunchAuthorized:false,
    benefit,benefitScopeSha256,blockers,checks,evidenceSha256:sha256(JSON.stringify({deploymentEvidenceSha256:deployment.evidenceSha256,checks})),
    note:'Evidence presence and hashes do not prove external assertions or current on-chain state. The root holder separately reviews the exact benefit and authorizes any canary operation. Actual production acceptance is required before broad launch. Etherscan/root calls are not mechanically restricted by this local gate.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  fs.mkdirSync('qualification',{recursive:true});const r=benefitLaunchGate();fs.writeFileSync('qualification/BENEFIT_LAUNCH_GATE.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(r.blockers.length)process.exitCode=1;
}
