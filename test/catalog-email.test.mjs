import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Readable} from 'node:stream';
import {readCatalogPage,requestPolicy} from '../frontend/member-catalog.mjs';
import {membershipName,formatRequestEmail,parseRequestEmail,MAX_EMAIL_BYTES} from '../shared/request-email.mjs';
import {validatePolicy,verifyEntitlementRequest,validatePacket,requestMessage,REGISTRY_VERSION} from '../shared/entitlement-request.mjs';
import {defaultValue} from '../frontend/etherscan-tools.mjs';
import {readReceipt} from '../tools/read-receipt.mjs';
import {fixture,NOW} from './fixtures.mjs';
import {id,signMessage} from './crypto-reference.mjs';

const cfg={entitlementMode:'registry',allowedEntitlements:[]};
function catalogue(count=63) {
  const ids=Array.from({length:count},(_,i)=>id('FICTITIOUS_BENEFIT_'+i)),calls=[];
  const registry={entitlementCount:async()=>BigInt(ids.length),entitlementIdsPage:async(o,n)=>{calls.push([o,n]);return ids.slice(o,o+n);},
    entitlement:async()=>[id('PERK'),id('metadata'),0n,0n,0n,0n,0n,1n,true],titleEN:async()=>'',titleFR:async key=>'Fictitious '+ids.indexOf(key)};
  return {ids,calls,registry};
}
test('Public configuration and explorer creation fields are valid without a preselected event',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync('frontend/config.js','utf8'),context);
  const c=context.window.AGI_CONFIG;
  assert.deepEqual(Object.keys(c).sort(),['allowedEntitlements','chainId','contactEmail','entitlementMode','expectedOrigin','registryAddress','registryCodeHash']);
  assert.equal(c.chainId,1);assert.equal(c.contactEmail,'president@montreal.ai');assert(Array.isArray(c.allowedEntitlements));
  if([c.registryAddress,c.registryCodeHash,c.expectedOrigin].every(value=>value==='')){
    assert.equal(c.entitlementMode,'registry');assert.equal(c.allowedEntitlements.length,0);
  }else validatePolicy(requestPolicy(c,{id},REGISTRY_VERSION));
  for(const name of ['entitlementId','newId','category','newCategory','capacity','newCapacity','opensAt','closesAt'])assert.equal(defaultValue({name,type:/apacity|At$/.test(name)?'uint64':'bytes32'},'createEntitlement'),'');
  for(const file of fs.readdirSync('frontend',{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name!=='config.js').map(entry=>entry.name))assert.doesNotMatch(fs.readFileSync('frontend/'+file,'utf8'),/IA101|IA 101|AI 101|2026-09-22/);
  const values=fs.readFileSync('.env.example','utf8').split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith('#')).map(line=>line.split('='));
  assert.deepEqual(values.filter(([,value])=>value),[['EXPECTED_ADMIN','0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201']]);
});
test('Registry catalogue reads every bounded page without requiring a website event list',async()=>{
  const f=catalogue(),rows=[];let page;
  do{page=await readCatalogPage(f.registry,cfg,{id},rows.length);rows.push(...page.rows);}while(page.next<page.total);
  assert.deepEqual(rows.map(r=>r.id),f.ids);assert.deepEqual(f.calls,[[0,25],[25,25],[50,13]]);
});
test('An empty deployment produces an empty catalogue without querying an invalid page',async()=>{
  const f=catalogue(0);assert.deepEqual(await readCatalogPage(f.registry,cfg,{id}),{rows:[],total:0,next:0});assert.deepEqual(f.calls,[]);
});
test('Etherscan changes to titles and appended benefits appear on a fresh catalogue read',async()=>{
  const f=catalogue(1);f.ids.push(id('ANOTHER_FICTITIOUS_BENEFIT'));f.registry.titleFR=async()=>'<script>text only</script>';
  const page=await readCatalogPage(f.registry,cfg,{id});assert.equal(page.rows.length,2);assert.equal(page.rows[0].title,'<script>text only</script>');
});
test('Legacy allowlists remain restricted and case-normalized',async()=>{
  const f=catalogue();const c={allowedEntitlements:[f.ids[4].toUpperCase().replace('0X','0x'),'EXPLICIT_BENEFIT']};
  const page=await readCatalogPage(f.registry,c,{id});assert.deepEqual(page.rows.map(r=>r.id),[f.ids[4],id('EXPLICIT_BENEFIT')]);assert.deepEqual(f.calls,[]);
});
for(const mutation of ['short page','duplicate ID','zero ID','missing benefit','bad state','failed title'])test('Catalogue rejects '+mutation+' without a partial result',async()=>{
  const f=catalogue(2);
  if(mutation==='short page')f.registry.entitlementIdsPage=async()=>[f.ids[0]];
  if(mutation==='duplicate ID')f.registry.entitlementIdsPage=async()=>[f.ids[0],f.ids[0]];
  if(mutation==='zero ID')f.registry.entitlementIdsPage=async()=>['0x'+'0'.repeat(64),f.ids[1]];
  if(mutation==='missing benefit')f.registry.entitlement=async()=>[0,0,0,0,0,0,0,1,false];
  if(mutation==='bad state')f.registry.entitlement=async()=>[0,0,0,0,0,0,0,0,true];
  if(mutation==='failed title')f.registry.titleFR=async()=>{throw Error('offline fixture');};
  await assert.rejects(()=>readCatalogPage(f.registry,cfg,{id}));
});
test('Catalogue mode and page bounds fail closed',async()=>{
  const f=catalogue();
  for(const [c,o,n] of [[{entitlementMode:'anything'},0,25],[{...cfg,allowedEntitlements:['TEST']},0,25],[cfg,-1,25],[cfg,0,26],[cfg,0,0]])await assert.rejects(()=>readCatalogPage(f.registry,c,{id},o,n));
});
test('Registry-mode policy accepts only a current authenticated claim on the pinned registry',async()=>{
  const f=await fixture(),policy={...f.policy,entitlementMode:'registry',entitlements:[]};
  const result=await verifyEntitlementRequest(f.packet,policy,f.io,{now:NOW});assert.equal(result.status,'VERIFIED_REQUEST_NOT_FULFILLED');
  await assert.rejects(()=>verifyEntitlementRequest(f.packet,policy,{...f.io,claim:async()=>({status:0,claimant:f.packet.payload.claimant,revision:1})},{now:NOW}),{code:'CLAIM_NOT_CURRENT'});
  await assert.rejects(()=>verifyEntitlementRequest(f.packet,{...policy,registryCodeHash:id('different')},f.io,{now:NOW}),{code:'WRONG_REGISTRY'});
});
test('Empty legacy policy and unknown or ambiguous catalogue policy cannot authorize requests',async()=>{
  const f=await fixture();
  for(const overrides of [{entitlements:[]},{entitlementMode:'typo',entitlements:[]},{entitlementMode:'registry'}])assert.throws(()=>validatePolicy({...f.policy,...overrides}),{code:'POLICY_NOT_CONFIGURED'});
});
test('Public configuration explicitly selects registry mode without borrowing IDs from a receipt',()=>{
  const c={...cfg,registryAddress:'0x'+'11'.repeat(20),registryCodeHash:id('code'),expectedOrigin:'https://claims.example.org'};
  const p=requestPolicy(c,{id},'2.1.1');assert.equal(p.entitlementMode,'registry');assert.deepEqual(p.entitlements,[]);validatePolicy(p);
});
test('Email body visibly includes the full subname and preserves the signed v4 packet',async()=>{
  const f=await fixture(),body=formatRequestEmail(f.packet);
  assert(body.includes('AGI Club identity / Identité AGI Club: '+f.packet.payload.membershipLabel+'.club.agi.eth'));
  assert.deepEqual(parseRequestEmail(body),f.packet);assert.deepEqual(parseRequestEmail(JSON.stringify(f.packet)),f.packet);
  await validatePacket(parseRequestEmail(body),f.policy,f.io.crypto,{now:NOW});
  assert.equal(f.packet.message,requestMessage(f.packet.payload));
});
test('The copied email is accepted unchanged by the streaming organizer CLI',async()=>{
  const f=await fixture(),bytes=Buffer.from(formatRequestEmail(f.packet).replace(/\n/g,'\r\n'));
  assert.deepEqual(await readReceipt(Readable.from(Array.from(bytes,b=>Buffer.of(b)))),f.packet);
});
test('A misleading membership heading is rejected before cryptographic verification',async()=>{
  const f=await fixture(),body=formatRequestEmail(f.packet),old=membershipName(f.packet.payload.membershipLabel);
  assert.throws(()=>parseRequestEmail(body.replace(old,'impostor.club.agi.eth')),{code:'INVALID_EMAIL_IDENTITY'});
});
test('Changing both identity heading and payload still fails signed-message validation',async()=>{
  const f=await fixture();f.packet.payload.membershipLabel='impostor';f.packet.payload.membershipNode=f.io.crypto.namehash('impostor.club.agi.eth');
  const packet=parseRequestEmail(formatRequestEmail(f.packet));
  await assert.rejects(()=>validatePacket(packet,f.policy,f.io.crypto,{now:NOW}),{code:'MESSAGE_PAYLOAD_MISMATCH'});
});
test('Email parser rejects oversized input, extra mail text and invalid subnames without echoing them',async()=>{
  const f=await fixture();assert.throws(()=>parseRequestEmail(' '.repeat(MAX_EMAIL_BYTES+1)),{code:'BODY_TOO_LARGE'});
  assert.throws(()=>parseRequestEmail(formatRequestEmail(f.packet)+'\nSent from my phone'),{code:'INVALID_JSON'});
  for(const label of ['','alice\nBcc:private@example.org','nested.alice','alice@example.org','UPPER'])assert.throws(()=>membershipName(label),{code:'INVALID_MEMBERSHIP'});
});

test('Catalogue reads both administrator titles without inventing an English title',async()=>{
 const f=catalogue(1);f.registry.titleFR=async()=> 'Avantage';f.registry.titleEN=async()=> 'Benefit';
 const page=await readCatalogPage(f.registry,cfg,{id});assert.equal(page.rows[0].fr,'Avantage');assert.equal(page.rows[0].en,'Benefit');
 f.registry.titleEN=async()=>'';assert.equal((await readCatalogPage(f.registry,cfg,{id})).rows[0].en,'');
 f.registry.titleEN=async()=>{throw Error('Unavailable');};await assert.rejects(()=>readCatalogPage(f.registry,cfg,{id}));
});
