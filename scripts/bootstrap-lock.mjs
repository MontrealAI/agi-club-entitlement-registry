/** Explicit, one-time maintainer step. It creates a CANDIDATE lock for review;
 * it is NOT allowed to run silently inside release qualification CI. */
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
fs.mkdirSync('qualification',{recursive:true});
if(fs.existsSync('package-lock.json')){console.error('Lockfile already exists. Refusing to regenerate it silently.');process.exit(1);}
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund','--fetch-retries=1','--fetch-timeout=20000'],{encoding:'utf8',timeout:180000,shell:process.platform==='win32'});
fs.writeFileSync('qualification/lock-bootstrap.log',(result.stdout||'')+(result.stderr||'')+(result.error?.message||''));
const ok=result.status===0&&fs.existsSync('package-lock.json');
fs.writeFileSync('qualification/lock-bootstrap.json',JSON.stringify({status:ok?'GENERATED_AWAITING_REVIEW':'BLOCKED',command:'npm install --package-lock-only --ignore-scripts --no-audit --no-fund',exitCode:result.status,at:new Date().toISOString(),note:ok?'Review dependencies, integrity records, audit and commit the lock; then run the exact clean-install gate.':'A genuine npm-resolved lockfile could not be generated. Do not fabricate integrity fields or mark clean-install as passed.'},null,2));
console.log(ok?'Candidate lock created. Review and commit it before CI.':'Lock generation failed; see qualification/lock-bootstrap.log.');process.exitCode=ok?0:1;
