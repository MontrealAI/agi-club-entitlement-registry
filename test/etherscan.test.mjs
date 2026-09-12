import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ethers} from 'ethers';
import {EXPLORER_ABI, ACTIONS, prepareExplorerCall, utcSeconds, memberLabel, explorerLinks, uint} from '../frontend/etherscan-tools.mjs';
import {verificationPackage, exportEtherscan} from '../scripts/export-etherscan.mjs';
import {PROD} from '../scripts/runtime.mjs';
const address = '0x' + '11'.repeat(20), zero = ethers.ZeroHash;
const prepare = (method, values) => prepareExplorerCall(method, values, address, ethers);
test('Explorer has all public read/write categories and does not expose signing or persistence', () => {
  const functions = new ethers.Interface(EXPLORER_ABI).fragments;
  assert.equal(functions.length, 52); assert.equal(Object.keys(ACTIONS).length, 19);
  const js = fs.readFileSync('frontend/etherscan.js','utf8') + fs.readFileSync('frontend/etherscan-tools.mjs','utf8');
  for (const pattern of [/localStorage/,/sessionStorage/,/indexedDB/,/\.ethereum/,/sendTransaction\(/,/signMessage\(/,/fetch\(/,/innerHTML/,/URLSearchParams/]) assert(!pattern.test(js), String(pattern));
  const html = fs.readFileSync('frontend/etherscan.html','utf8');assert(html.includes("connect-src 'none'"));assert(html.includes('no-referrer'));
});
test('Readable IDs and categories produce canonical Keccak values; creation defaults remain draft', () => {
  const p = prepare('createEntitlement',['IA101_2026_09_22','EVENT','50','','','1','']);
  assert.deepEqual(p.args,[ethers.id('IA101_2026_09_22'),ethers.id('EVENT'),'50','0','0','1',zero]);
  assert.equal(p.transaction.value,'0');assert.equal(p.transaction.chainId,1);
  assert.equal(new ethers.Interface(EXPLORER_ABI).parseTransaction({data:p.transaction.data}).name,'createEntitlement');
});
test('Unnamed public metadata getters accept readable benefit identifiers', () => {
  for(const method of ['titleFR','titleEN','metadataURI'])assert.equal(prepare(method,['BENEFIT']).args[0],ethers.id('BENEFIT'));
});
test('Member node and direct-label preparations match the on-chain namespace', () => {
  assert.equal(memberLabel('alice.club.agi.eth'),'alice');
  const p=prepare('claimRecord',['BENEFIT','alice']);assert.equal(p.args[1],ethers.namehash('alice.club.agi.eth'));
  assert.equal(prepare('claim',['BENEFIT','alice']).args[1],'alice');
});
for(const value of ['','UPPER','-alice','alice-','a..b','a.b.club.agi.eth','a'.repeat(64),'person@example.org'])test('Reject invalid public membership label '+JSON.stringify(value),()=>assert.throws(()=>memberLabel(value),/LABEL/));
test('Integer parsing preserves uint64 precision and rejects overflow/rounded formats', () => {
  assert.equal(prepare('setCapacity',['BENEFIT','18446744073709551615']).args[1],'18446744073709551615');
  for(const v of ['18446744073709551616','1e3','-1','1.5','01'])assert.throws(()=>uint(v,64),/INTEGER/);
});
test('UTC dates round-trip exactly and never silently use browser local time', () => {
  assert.equal(utcSeconds('2026-09-22T16:00:00Z'),String(Date.UTC(2026,8,22,16)/1000));
  for(const v of ['2026-09-22T16:00','2026-02-30T16:00:00Z','2026-09-22T16:00:00-04:00','-1'])assert.throws(()=>utcSeconds(v),/DATE/);
  assert.throws(()=>prepare('setWindow',['BENEFIT','100','100']),/WINDOW/);
  assert.deepEqual(prepare('setWindow',['BENEFIT','','']).args.slice(1),['0','0']);
});
test('Array input is bounded, unique and rendered in Etherscan-compatible JSON', () => {
  const p=prepare('adminGrantBatchToCurrentOwners',['BENEFIT','alice\nbob.club.agi.eth']);assert.equal(p.fields[1].value,'["alice","bob"]');
  for(const value of ['', 'alice,alice','["alice",5]', Array.from({length:51},(_,i)=>'member-'+i).join(',')])assert.throws(()=>prepare('adminGrantBatchToCurrentOwners',['BENEFIT',value]),/BATCH|LABEL/);
});
test('Public descriptors enforce UTF-8 byte limits and reject executable URI schemes', () => {
  assert.throws(()=>prepare('setDescriptor',['BENEFIT','é'.repeat(81),'Title','','']),/TITLE/);
  assert.throws(()=>prepare('setDescriptor',['BENEFIT','Titre','Title','javascript:alert(1)','']),/URI/);
  assert.equal(prepare('setDescriptor',['BENEFIT','Titre','Title','https://example.org/public.json','']).args[4],zero);
});
test('Overrides require a nonzero public reason; metadata requires a literal digest', () => {
  for(const reason of ['',zero])assert.throws(()=>prepare('adminGrantClaimOverride',['BENEFIT','alice',address,reason]),/HASH/);
  assert.throws(()=>prepare('setMetadataHash',['BENEFIT','hash-this-text']),/HASH/);
  assert.equal(prepare('revokeClaim',['BENEFIT','alice','']).args[2],zero);
});
test('Read/write links contain only the checksummed address and fixed contract tab', () => {
  assert.deepEqual(explorerLinks(address,ethers),{code:'https://etherscan.io/address/'+address+'#code',read:'https://etherscan.io/address/'+address+'#readContract',write:'https://etherscan.io/address/'+address+'#writeContract'});
  assert(prepare('admin',[]).readOnly);assert(prepare('admin',[]).link.endsWith('#readContract'));assert(prepare('pause',[]).link.endsWith('#writeContract'));
  for(const value of [ethers.ZeroAddress,'https://evil.example/','0x'+'11'.repeat(20)+'?email=private'])assert.throws(()=>explorerLinks(value,ethers),/ADDRESS/);
});
test('Enums, pagination and boolean inputs reject unsupported values before preparing calldata', () => {
  assert.throws(()=>prepare('setEntitlementState',['BENEFIT','0']),/STATE/);
  assert.throws(()=>prepare('entitlementIdsPage',['0','101']),/PAGE/);
  assert.throws(()=>prepare('setSupportedNameWrapper',[address,'yes']),/BOOLEAN/);
});
function fixture() {
  const name='project/contracts/AGIClubEntitlementRegistryMainnet.sol';
  const sources=Object.fromEntries([name,'project/contracts/AGIClubEntitlementRegistry.sol','project/vendor/openzeppelin/utils/Context.sol','project/vendor/openzeppelin/utils/Pausable.sol'].map(k=>[k,{content:'PUBLIC FIXTURE '+k}]));
  const artifact={contractName:'AGIClubEntitlementRegistryMainnet',inputSourceName:name,buildInfoId:'fixture',bytecode:'0x6000',deployedBytecode:'0x6001',abi:[{type:'constructor',inputs:[],stateMutability:'nonpayable'}],linkReferences:{}};
  const buildInfo={id:'fixture',solcVersion:'0.8.37',solcLongVersion:'0.8.37+commit.f401782d',input:{language:'Solidity',sources,settings:{viaIR:true,evmVersion:'shanghai',optimizer:{enabled:true,runs:200}}}};
  const sourceSha256='a'.repeat(64),compilerReport={status:'PASS',sourceSha256,productionContract:PROD,profile:'production',creationCodeHash:ethers.keccak256(artifact.bytecode)};
  const output={contracts:{[name]:{AGIClubEntitlementRegistryMainnet:{abi:artifact.abi,evm:{bytecode:{object:'6000'},deployedBytecode:{object:'6001'}}}}}};
  return {artifact,buildInfo,sourceSha256,compilerReport,readSource:file=>'PUBLIC FIXTURE project/'+file,compiler:{version:()=>buildInfo.solcLongVersion,compile:()=>JSON.stringify(output)},output};
}
test('Verification package preserves Standard JSON paths and reports no deployed verification', () => {
  const f=fixture(),p=verificationPackage(f);
  assert.deepEqual(JSON.parse(p.inputText),f.buildInfo.input);assert.equal(p.manifest.contract,'project/contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet');
  assert.equal(p.manifest.constructorArguments,'');assert.equal(p.manifest.etherscanVerified,false);assert.equal(p.manifest.mainnetAuthorization,false);
});
for(const [name,mutate] of [
  ['stale source',f=>{f.compilerReport.sourceSha256='b'.repeat(64);}],
  ['wrong profile',f=>{f.compilerReport.profile='default';}],
  ['wrong IR setting',f=>{f.buildInfo.input.settings.viaIR=false;}],
  ['wrong EVM',f=>{f.buildInfo.input.settings.evmVersion='cancun';}],
  ['private extra source',f=>{f.buildInfo.input.sources['project/.env']={content:'PRIVATE FIXTURE'};}],
  ['stale embedded source',f=>{Object.values(f.buildInfo.input.sources)[0].content='ALTERED FIXTURE';}],
  ['mismatched build input',f=>{f.buildInfo.id='other';}],
  ['creation mismatch',f=>{Object.values(f.output.contracts)[0].AGIClubEntitlementRegistryMainnet.evm.bytecode.object='6002';}],
  ['runtime mismatch',f=>{Object.values(f.output.contracts)[0].AGIClubEntitlementRegistryMainnet.evm.deployedBytecode.object='6002';}],
  ['constructor arguments',f=>{f.artifact.abi[0].inputs=[{name:'owner',type:'address'}];}],
])test('Verification export rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>verificationPackage(f));});
test('A failed export removes previous generated input and records an explicit failure', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agi-explorer-'));
  try {fs.mkdirSync(path.join(root,'dist/etherscan'),{recursive:true});fs.writeFileSync(path.join(root,'dist/etherscan/standard-input.json'),'STALE PUBLIC FIXTURE');const report=exportEtherscan(root);assert.equal(report.status,'FAIL_OR_BLOCKED');assert(!fs.existsSync(path.join(root,'dist/etherscan')));assert.equal(JSON.parse(fs.readFileSync(path.join(root,'qualification/etherscan-export.json'))).status,'FAIL_OR_BLOCKED');}
  finally {fs.rmSync(root,{recursive:true,force:true});}
});
