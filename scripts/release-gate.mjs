/** Evidence PRESENCE/BINDING gate, not an independent security opinion. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {sourceDigest,sha256} from './source-digest.mjs';
export function releaseGate(root=process.cwd()) {
 const source=sourceDigest(root).sourceSha256,blockers=[],checks=[];
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 try {const q=read('qualification/LOCAL_RELEASE.json');if(q.status!=='PASS'||q.sourceSha256!==source)blockers.push('Current source has not passed the complete local qualification');else checks.push({type:'local',sha256:sha256(fs.readFileSync(path.join(root,'qualification/LOCAL_RELEASE.json')))});}catch{blockers.push('Missing local qualification');}
 try {const q=read('qualification/mainnet-fork.json');if(q.status!=='PASS'||q.sourceSha256!==source||!q.identity?.runtimeCodeHash)blockers.push('Current source has not passed the mainnet fork');else checks.push({type:'fork',sha256:sha256(fs.readFileSync(path.join(root,'qualification/mainnet-fork.json')))});}catch{blockers.push('Missing mainnet-fork qualification');}
 try {
  const e=read('.local/external-evidence.json');if(e.sourceSha256!==source)blockers.push('External evidence does not bind current source');
  for(const name of ['independentSecurityReview','realWalletStaging','privateRequestStaging','eventbriteStaging']){
   const x=e[name];if(x?.status!=='PASS'||typeof x.reviewer!=='string'||!x.reviewer.trim()||typeof x.file!=='string'||!x.file.startsWith('.local/')||!(/^[0-9a-f]{64}$/.test(x.sha256||''))){blockers.push(name+': missing reviewed evidence');continue;}
   const f=path.resolve(root,x.file);if(!f.startsWith(path.resolve(root,'.local')+path.sep))throw Error('Evidence path escapes private directory');
   if(sha256(fs.readFileSync(f))!==x.sha256){blockers.push(name+': report hash mismatch');continue;}
   checks.push({type:name,reviewer:x.reviewer,sha256:x.sha256});
  }
 } catch(e) {blockers.push('External evidence unavailable or invalid: '+e.message);}
 return {schema:'AGIClubDeploymentGate/1',sourceSha256:source,status:blockers.length?'BLOCKED':'EVIDENCE_READY_FOR_PRINCIPAL_REVIEW',deploymentAuthorized:false,blockers,checks,evidenceSha256:sha256(JSON.stringify(checks)),note:'Checks bind documents; they do not prove the truth of external assertions. Root-holder approval is a separate step. Broad launch requires the subsequent real production canary.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 fs.mkdirSync('qualification',{recursive:true});const r=releaseGate();fs.writeFileSync('qualification/DEPLOYMENT_GATE.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(r.blockers.length)process.exitCode=1;
}
