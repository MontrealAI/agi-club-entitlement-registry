/** Own the fork report before Hardhat loads config; child output is never release evidence. */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {projectRoot,sourceDigest} from './source-digest.mjs';

export const FORK_SCOPE='LOCAL_FORK_OF_PINNED_MAINNET; no real transactions; not real-wallet acceptance';
export const FORK_PHASES=['configuration','connection','upstream','root','deployment','members'];
export function forkInputIssues(env) {
  const issues=[];
  if(env.ALLOW_READ_ONLY_FORK!=='yes')issues.push('Review the local-fork script, then set ALLOW_READ_ONLY_FORK=yes.');
  try {const url=new URL(env.MAINNET_FORK_RPC_URL);if(!['https:','http:'].includes(url.protocol)||url.hash)throw Error();}
  catch {issues.push('Set MAINNET_FORK_RPC_URL to your approved read-only HTTP(S) Ethereum provider.');}
  if(!/^\d+$/.test(env.MAINNET_FORK_BLOCK||'')||!Number.isSafeInteger(Number(env.MAINNET_FORK_BLOCK))||Number(env.MAINNET_FORK_BLOCK)<=0)issues.push('Set MAINNET_FORK_BLOCK to a positive finalized Ethereum block number.');
  if(!/^0x[0-9a-f]{40}$/i.test(env.EXPECTED_ADMIN||'')||/^0x0{40}$/i.test(env.EXPECTED_ADMIN||''))issues.push('Set EXPECTED_ADMIN to the independently checked club.agi.eth owning wallet.');
  const labels=(env.MEMBER_LABELS||'').split(',').map(x=>x.trim());
  if(!labels.every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||new Set(labels).size!==labels.length)issues.push('Set MEMBER_LABELS to distinct real direct ASCII membership labels, separated by commas.');
  return issues;
}
function environment(root) {if(fs.existsSync(path.join(root,'.env')))loadEnvFile(path.join(root,'.env'));return process.env;}
function hardhat({root,env,attemptId}) {
  const require=createRequire(path.join(root,'package.json'));
  const manifest=require.resolve('hardhat/package.json'),pkg=JSON.parse(fs.readFileSync(manifest,'utf8'));
  const cli=path.resolve(path.dirname(manifest),pkg.bin.hardhat);
  return spawnSync(process.execPath,[cli,'run','scripts/fork-tests.mjs','--build-profile','production','--network','ensFork'],{
    cwd:root,env:{...env,AGI_FORK_ATTEMPT_ID:attemptId},encoding:'utf8',timeout:240000,maxBuffer:16*1024*1024,
  });
}
export function runFork({root=projectRoot,loadEnvironment=environment,execute=hardhat}={}) {
  const attemptId=randomUUID(),lock=path.join(root,'.local/mainnet-fork.lock');
  const output=path.join(root,'qualification/mainnet-fork.json');
  const attempts=path.join(root,'.local/fork-attempts'),childOutput=path.join(attempts,attemptId+'.json');
  let owned=false,releaseLock=false;
  let report={status:'FAIL_OR_BLOCKED',scope:FORK_SCOPE,attemptId,at:new Date().toISOString(),phase:'configuration',results:[],error:'Fork rehearsal did not complete.'};
  const publish=()=>{releaseLock=false;fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600,flush:true});releaseLock=true;};
  try {
    fs.mkdirSync(path.dirname(lock),{recursive:true,mode:0o700});
    try {fs.writeFileSync(lock,JSON.stringify({attemptId,pid:process.pid,at:report.at})+'\n',{flag:'wx',mode:0o600,flush:true});owned=true;}
    catch {report.error='Fork rehearsal lock unavailable. Inspect .local/mainnet-fork.lock; do not remove it while a rehearsal is running.';return {report,exitCode:1};}
    fs.mkdirSync(attempts,{recursive:true,mode:0o700});
    if(fs.existsSync(output)) {
      const previous=path.join(attempts,attemptId+'.previous.json');
      fs.copyFileSync(output,previous,fs.constants.COPYFILE_EXCL);fs.chmodSync(previous,0o600);
    }
    publish(); // Any interruption from here leaves a blocked report and/or a blocking lock.
    const env=loadEnvironment(root),issues=forkInputIssues(env);
    if(issues.length) {report.issues=issues;report.error='Fork configuration incomplete. Correct the listed fields in your local environment.';publish();return {report,exitCode:1};}
    const source=sourceDigest(root).sourceSha256;
    report.phase='connection';publish();
    const child=execute({root,env,attemptId,childOutput});
    let candidate;
    try {candidate=JSON.parse(fs.readFileSync(childOutput,'utf8'));}catch {}
    if(child.status!==0||child.error||child.signal||candidate?.status!=='PASS') {
      if(FORK_PHASES.includes(candidate?.phase))report.phase=candidate.phase;
      report.error='Fork rehearsal failed or was interrupted during '+report.phase+'. No RPC error text was retained. Check local configuration/provider access and rerun the documented command.';
      publish();return {report,exitCode:1};
    }
    const labels=env.MEMBER_LABELS.split(',').map(x=>x.trim());
    if(candidate.attemptId!==attemptId||candidate.scope!==FORK_SCOPE||candidate.sourceSha256!==source||sourceDigest(root).sourceSha256!==source||candidate.forkBlock?.number!==Number(env.MAINNET_FORK_BLOCK)||candidate.identity?.admin?.toLowerCase()!==env.EXPECTED_ADMIN.toLowerCase()||candidate.results?.length!==labels.length||!labels.every((label,i)=>candidate.results[i]?.label===label&&candidate.results[i]?.status==='PASS'))throw Error('Unbound result');
    report={...candidate,completedAt:new Date().toISOString()};publish();
    return {report,exitCode:0};
  } catch {
    report={...report,status:'FAIL_OR_BLOCKED',error:'Fork runner could not validate or save this attempt. Check the local environment, installation and evidence files; retained locks require inspection.'};
    try {publish();}catch {}
    return {report,exitCode:1};
  } finally {
    if(owned&&releaseLock)fs.unlinkSync(lock);
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=runFork();console.log(JSON.stringify(result.report,null,2));process.exitCode=result.exitCode;
}
