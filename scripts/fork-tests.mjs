/** Read-only upstream, LOCAL fork state mutations. Never broadcasts to Ethereum. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {network,artifacts} from 'hardhat';import {ethers} from 'ethers';
import {ENS,WRAPPER,ROOT,PROD,deploy,receipt,save,canonicalAdmin,checkProduction} from './runtime.mjs';
import {sourceDigest} from './source-digest.mjs';
import {revertData} from '../test/revert-data.mjs';
import {FORK_SCOPE} from './run-fork-tests.mjs';
const attemptId=process.env.AGI_FORK_ATTEMPT_ID;
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(attemptId||''),'Use npm run test:fork so the runner owns the qualification report');
const report={status:'NOT_EXECUTED',scope:FORK_SCOPE,attemptId,at:new Date().toISOString(),phase:'configuration',results:[]};
let connection,provider,upstream;
try {
 assert.equal(process.env.ALLOW_READ_ONLY_FORK,'yes','Set ALLOW_READ_ONLY_FORK=yes after reviewing the script');
 assert(process.env.MAINNET_FORK_RPC_URL&&process.env.MAINNET_FORK_BLOCK&&process.env.EXPECTED_ADMIN&&process.env.MEMBER_LABELS,'Supply fork RPC, pinned finalized block, expected admin and real representative member labels');
 const labels=process.env.MEMBER_LABELS.split(',').map(x=>x.trim());assert(labels.length>0&&labels.every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)));assert.equal(new Set(labels).size,labels.length,'Use distinct representative memberships');
 report.phase='connection';connection=await network.create();assert.equal(connection.networkName,'ensFork');
 // Fork mutations are mined synchronously in the local EVM.
 provider=new ethers.BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});provider.pollingInterval=100;
 const request=new ethers.FetchRequest(process.env.MAINNET_FORK_RPC_URL);request.timeout=15000;upstream=new ethers.JsonRpcProvider(request,undefined,{batchMaxCount:1});
 report.phase='upstream';assert.equal((await upstream.getNetwork()).chainId,1n);const pinned=Number(process.env.MAINNET_FORK_BLOCK),finalized=await upstream.getBlock('finalized');
 assert(Number.isSafeInteger(pinned)&&pinned>0,'Fork block must be a positive safe integer');assert(finalized&&pinned<=finalized.number,'Fork block must be finalized');const block=await upstream.getBlock(pinned);assert(block);
 assert.equal((await provider.getBlock(pinned)).hash,block.hash,'Fork must match upstream block hash');
 report.phase='root';const realAdmin=await canonicalAdmin(upstream,pinned);assert.equal(realAdmin.toLowerCase(),ethers.getAddress(process.env.EXPECTED_ADMIN).toLowerCase());
 report.phase='deployment';
 const [signer]=[await provider.getSigner(0)];const c=await deploy(artifacts,signer,PROD);
 const identity=await checkProduction(provider,await c.getAddress(),realAdmin);report.identity=identity;report.sourceSha256=sourceDigest().sourceSha256;report.forkBlock={number:pinned,hash:block.hash};report.creationCodeHash=ethers.keccak256((await artifacts.readArtifact(PROD)).bytecode);
 const raw=connection.provider;
 await raw.request({method:'hardhat_impersonateAccount',params:[realAdmin]});await raw.request({method:'hardhat_setBalance',params:[realAdmin,ethers.toQuantity(ethers.parseEther('5'))]});
 // Impersonated local accounts are not wallet accounts returned by eth_accounts.
 const admin=new ethers.JsonRpcSigner(provider,realAdmin),id=ethers.id('FORK_TEST_ONLY_'+block.hash);
 await receipt(c.connect(admin).createEntitlement(id,ethers.id('TEST'),labels.length,0,0,2,ethers.ZeroHash));
 report.phase='members';for(const label of labels){const info=await c.membershipInfo(label),owner=info[1];assert.notEqual(owner,ethers.ZeroAddress,'No live ownership for '+label);
  await raw.request({method:'hardhat_impersonateAccount',params:[owner]});await raw.request({method:'hardhat_setBalance',params:[owner,ethers.toQuantity(ethers.parseEther('5'))]});
  const member=new ethers.JsonRpcSigner(provider,owner);await receipt(c.connect(member).claim(id,label));assert.equal(await c.claimantOf(id,info[0]),owner);
  let rejected;try{await c.connect(member).claim.staticCall(id,label);}catch(e){rejected=e;}
  assert(rejected);assert.equal(c.interface.parseError(revertData(rejected))?.name,'ClaimRejected');
  report.results.push({label,node:info[0],owner,wrapped:info[3],status:'PASS'});
 }
 report.status='PASS';report.notes=['Actual canonical ENS queried at the pinned block.','Impersonation is a local capability; it does NOT prove control of the real wallet.','Full parent/fuse mutation and actual Safe acceptance require separate review.'];
} catch {report.status='FAIL_OR_BLOCKED';report.error='Fork rehearsal failed during '+report.phase+'. Check the approved provider, pinned block, root owner and representative memberships.';process.exitCode=1;}
finally {save('.local/fork-attempts/'+attemptId+'.json',report);provider?.destroy();upstream?.destroy();if(connection)await connection.close();}
