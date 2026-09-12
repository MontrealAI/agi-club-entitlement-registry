/** Exact local qualification, fail-closed. This never authorizes or deploys mainnet. */
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {sourceDigest} from './source-digest.mjs';
import {LOCAL_STAGES} from './release-gate.mjs';
fs.mkdirSync('qualification',{recursive:true});const before=sourceDigest().sourceSha256,results=[];
const npm=process.platform==='win32'?'npm.cmd':'npm';
for(const name of LOCAL_STAGES){
 const r=spawnSync(npm,['run',name],{encoding:'utf8',timeout:240000,shell:process.platform==='win32'});
 const log=(r.stdout||'')+(r.stderr||'')+(r.error?.message||'');const file='qualification/'+name.replaceAll(':','-')+'.log';fs.writeFileSync(file,log);
 results.push({name,status:r.status===0?'PASS':'FAIL_OR_BLOCKED',exitCode:r.status,log:file});console.log(name,results.at(-1).status);
 if(r.status!==0){console.error(log.trimEnd());break;} // Surface the failure in CI as well as its artifact; never cascade missing prerequisites.
}
const after=sourceDigest().sourceSha256;
const report={repositoryVersion:'2.4.0-rc.3',contractVersion:'2.1.1',status:results.length===8&&results.every(x=>x.status==='PASS')&&before===after?'PASS':'BLOCKED',sourceSha256:after,sourceUnchanged:before===after,at:new Date().toISOString(),results,mainnetAuthorization:false,notes:['All local suites must pass; report does not replace fork, independent review, real wallets and private-message/fulfillment acceptance.','Asset build must not modify canonical sources.']};
fs.writeFileSync('qualification/LOCAL_RELEASE.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
