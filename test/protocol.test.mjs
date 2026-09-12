import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fixture,NOW} from './fixtures.mjs';
import {id,namehash,signMessage,verifyMessage,walletAddress} from './crypto-reference.mjs';
import {validatePacket,verifyEntitlementRequest,requestMessage,claimKey,recipientCommitment,SCHEMA,preparePacket} from '../shared/entitlement-request.mjs';
const opts={now:NOW},rejects=(fn,code)=>assert.rejects(fn,e=>e.code===code,code);
test('Known Ethereum vectors, TEST-ONLY reference not production ethers',()=>{
 assert.equal(id(''),'0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
 assert.equal(namehash('club.agi.eth'),'0x39eb848f88bdfb0a6371096249dd451f56859dfe2cd3ddeab1e26d5bb68ede16');
 assert.equal(walletAddress(1n),'0x7e5f4552091a69125d5dfcb7b8c2659029395bdf');
 assert.equal(verifyMessage('AGI Club',signMessage('AGI Club')),walletAddress(1n));
});
test('Valid v4 receipt binds recipient; not a ticket or mailbox verification',async()=>{const f=await fixture(),r=await verifyEntitlementRequest(f.packet,f.policy,f.io,opts);assert.equal(r.status,'VERIFIED_REQUEST_NOT_FULFILLED');assert.equal(r.recipient.email,'alice@example.org');assert.equal(r.fulfillmentConfirmed,false);assert.equal(r.mailboxControlVerified,false);assert(!('email'in r.payload));});
test('WebCrypto commitment independently matches node crypto SHA-256',async()=>{const f=await fixture(),r=f.packet.recipient;assert.equal(await recipientCommitment(r),'0x'+createHash('sha256').update(JSON.stringify([SCHEMA+'/recipient',r.salt,r.name,r.email])).digest('hex'));});
test('Wallet message excludes recipient text AND the private salt',async()=>{const f=await fixture();for(const value of Object.values(f.packet.recipient))assert(!f.packet.message.includes(value));});
test('RPC IO sees no plaintext recipient or private salt',async()=>{const f=await fixture();await verifyEntitlementRequest(f.packet,f.policy,f.io,opts);const log=JSON.stringify(f.calls);for(const value of Object.values(f.packet.recipient)){assert(!log.includes(value));assert(!log.includes(Buffer.from(value).toString('hex')));}for(const c of f.calls.filter(x=>x.method==='claim'))assert.deepEqual(Object.keys(c.q).sort(),['entitlementId','membershipNode']);});
test('Same recipient gets distinct commitments with independent salts',async()=>{const a=await fixture(),b=await fixture();assert.notEqual(a.packet.recipient.salt,b.packet.recipient.salt);assert.notEqual(a.packet.payload.recipientCommitment,b.packet.payload.recipientCommitment);});
for(const [field,value,code]of [
 ['schema','AGIClubTicketRequest/2.2','UNSUPPORTED_SCHEMA'],['origin','https://evil.example','WRONG_SCOPE'],['chainId',11155111,'WRONG_SCOPE'],['registry','0x'+'33'.repeat(20),'WRONG_SCOPE'],['entitlementId',id('OTHER'),'ENTITLEMENT_NOT_ENABLED'],['membershipLabel','x.alice','INVALID_MEMBERSHIP'],['membershipNode','0x'+'00'.repeat(32),'INVALID_MEMBERSHIP'],['claimRevision',0,'INVALID_CLAIM'],['claimRevision',4294967296,'INVALID_CLAIM'],['claimant','0x'+'00'.repeat(20),'INVALID_CLAIM'],['issuedAt',NOW+301,'INVALID_TIME'],['issuedAt',-1,'INVALID_TIME'],['expiresAt',NOW,'REQUEST_EXPIRED'],['expiresAt',NOW+8*86400,'INVALID_TIME'],['nonce','0x12','INVALID_NONCE'],['recipientCommitment','bad','INVALID_COMMITMENT']
])test('Reject invalid '+field+' / '+code,async()=>{const f=await fixture();f.packet.payload[field]=value;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),code);});
for(const [field,value,code]of [['name','A\nB','INVALID_CONTACT'],['email','a@example.org\r\nBcc:x@evil.org','INVALID_CONTACT'],['email','invalid','INVALID_CONTACT'],['name','\u202eHidden','INVALID_CONTACT'],['salt','0x12','INVALID_SALT'],['salt','0x'+'00'.repeat(32),'INVALID_SALT']])test('Reject unsafe private '+field+' '+code,async()=>{const f=await fixture();f.packet.recipient[field]=value;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),code);});
for(const [field,value]of [['name','Mallory'],['email','mallory@example.org'],['salt','0x'+'cd'.repeat(32)]]){
 test('Changed private '+field+' rejected without contacting chain',async()=>{const f=await fixture();f.packet.recipient[field]=value;let calls=0;f.io.chainId=async()=>{calls++;return 1n;};await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'RECIPIENT_COMMITMENT_MISMATCH');assert.equal(calls,0);});
 test('Recomputed commitment cannot reuse signature after changing '+field,async()=>{const f=await fixture();f.packet.recipient[field]=value;f.packet.payload.recipientCommitment=await recipientCommitment(f.packet.recipient);f.packet.message=requestMessage(f.packet.payload);await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SIGNATURE');});
}
for(const [field,value]of [['nonce','0x'+'cd'.repeat(16)],['claimRevision',2],['issuedAt',NOW-20],['expiresAt',NOW+3000]])test('Unsigned scoped '+field+' alteration rejected',async()=>{const f=await fixture();f.packet.payload[field]=value;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'MESSAGE_PAYLOAD_MISMATCH');});
test('Extra top-level email field rejected',async()=>{const f=await fixture();f.packet.email='mallory@example.org';await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SCHEMA');});
test('Extra payload and private recipient fields rejected',async()=>{const f=await fixture();f.packet.payload.allowExpired=true;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SCHEMA');delete f.packet.payload.allowExpired;f.packet.recipient.debug=true;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_RECIPIENT_SCHEMA');});
test('Legacy flat and v2 packet structures fail closed',async()=>{const f=await fixture();await rejects(()=>verifyEntitlementRequest({...f.packet.payload,message:f.packet.message,signature:f.packet.signature},f.policy,f.io,opts),'INVALID_SCHEMA');delete f.packet.recipient;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SCHEMA');});
test('Canonical key order is independent of JSON insertion order',async()=>{const f=await fixture();f.packet.payload=Object.fromEntries(Object.entries(f.packet.payload).reverse());await verifyEntitlementRequest(f.packet,f.policy,f.io,opts);});
test('Wrong signing key rejected',async()=>{const f=await fixture();f.packet.signature=signMessage(f.packet.message,2n);await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SIGNATURE');});
test('Bad signature format rejected',async()=>{const f=await fixture();f.packet.signature='0xZZ';await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SIGNATURE_FORMAT');});
test('Wrong provider chain rejected',async()=>{const f=await fixture();f.state.chain=31337n;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'WRONG_CHAIN');});
for(const [key,value]of [['version','2.1.0'],['ens','0x'+'77'.repeat(20)],['wrapper','0x'+'88'.repeat(20)],['root',id('fake')],['codeHash',id('fake-bytecode')]])test('Wrong deployed identity '+key+' rejected',async()=>{const f=await fixture();f.state.identity[key]=value;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'WRONG_REGISTRY');});
for(const [key,value]of [['status',2],['revision',2],['claimant',walletAddress(2n)]])test('Changed current claim '+key+' blocks issuance',async()=>{const f=await fixture();f.state.claimL[key]=value;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'CLAIM_NOT_CURRENT');});
test('Pending finality is not invalid recipient identity',async()=>{const f=await fixture();f.state.claimF.status=0;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'WAITING_FOR_FINALITY');});
test('Contract-wallet policy changed in latest state rejected',async()=>{const f=await fixture();f.state.signaturePolicy=(_,__,___,b)=>b===100;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SIGNATURE');});
test('Reorganization detected on read-back',async()=>{const f=await fixture();f.io.block=async t=>t==='finalized'?f.state.finalized:t==='latest'?f.state.latest:{number:t,hash:id('reorg')};await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'CHAIN_CHANGED_RETRY');});
test('No server acceptance or expiry-bypass option in static-only protocol',async()=>{const f=await fixture();await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,{now:NOW+4000,acceptedAt:NOW}),'REQUEST_EXPIRED');});
test('Missing runtime hash cannot disable verifier',async()=>{const f=await fixture();delete f.policy.registryCodeHash;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'POLICY_NOT_CONFIGURED');});
for(const origin of ['http://claims.example.org','https://claims.example.org/path','https://u:p@claims.example.org','https://claims.example.org/'])test('Noncanonical policy origin rejected: '+origin,async()=>{const f=await fixture();f.policy.origin=origin;await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'POLICY_NOT_CONFIGURED');});
test('Claim key cannot be reset by a new signature, recipient or revision',async()=>{const a=await fixture(),b=await fixture();b.packet.payload.claimRevision=2;assert.equal(claimKey(a.packet.payload),claimKey(b.packet.payload));});
test('Safe error codes do not echo supplied private fields',async()=>{const f=await fixture();f.packet.recipient.email='secret\n@invalid';try{await validatePacket(f.packet,f.policy,f.io.crypto,opts);assert.fail('Expected rejection');}catch(e){assert.equal(e.message,'INVALID_CONTACT');assert(!e.message.includes('secret'));}});

for(const [field,value] of [['name','Changed Fictitious Recipient'],['email','changed@example.org']]){
 test('Pending verification retains the committed recipient '+field,async()=>{
  const f=await fixture(),expected=f.packet.recipient[field];
  f.io.chainId=async()=>{f.packet.recipient[field]=value;return 1n;};
  const result=await verifyEntitlementRequest(f.packet,f.policy,f.io,opts);
  assert.equal(result.recipient[field],expected);
 });
}
test('A pending request cannot swap in an unrelated signed message',async()=>{
 const f=await fixture(),unrelated='Unrelated fictitious statement';
 f.packet.signature=signMessage(unrelated);
 f.io.chainId=async()=>{f.packet.message=unrelated;return 1n;};
 await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SIGNATURE');
});
test('A pending request cannot replace its submitted signature',async()=>{
 const f=await fixture(),valid=f.packet.signature;
 f.packet.signature=signMessage(f.packet.message,2n);
 f.io.chainId=async()=>{f.packet.signature=valid;return 1n;};
 await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'INVALID_SIGNATURE');
});
test('Pending verification cannot relax the trusted runtime hash',async()=>{
 const f=await fixture(),wrong=id('unapproved-runtime');
 f.state.identity.codeHash=wrong;
 f.io.chainId=async()=>{f.policy.registryCodeHash=wrong;return 1n;};
 await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'WRONG_REGISTRY');
});
for(const elapsed of [3600,3601]){
 test('A request that expires during verification is rejected after '+elapsed+' seconds',async t=>{
  const f=await fixture();let now=NOW;
  t.mock.method(Date,'now',()=>now*1000);
  f.io.chainId=async()=>{now=NOW+elapsed;return 1n;};
  await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io),'REQUEST_EXPIRED');
 });
}
test('An unexpired delayed request records its completion time',async t=>{
 const f=await fixture();let now=NOW;
 t.mock.method(Date,'now',()=>now*1000);
 f.io.chainId=async()=>{now+=30;return 1n;};
 const result=await verifyEntitlementRequest(f.packet,f.policy,f.io);
 assert.equal(result.verifiedAt,NOW+30);assert(result.verifiedAt<result.payload.expiresAt);
});
test('The verified payload cannot be edited independently of its claim key',async()=>{
 const f=await fixture(),result=await verifyEntitlementRequest(f.packet,f.policy,f.io,opts);
 assert.throws(()=>{result.payload.claimRevision=99;},TypeError);
 assert.throws(()=>{result.payload.membershipNode=id('other');},TypeError);
 assert.equal(claimKey(result.payload),result.claimKey);
});
test('Snapshotting does not normalize unsupported request prototypes into valid packets',async()=>{
 const f=await fixture(),packet=Object.assign(Object.create({custom:true}),f.packet);
 await rejects(()=>verifyEntitlementRequest(packet,f.policy,f.io,opts),'INVALID_SCHEMA');
});

for(const contact of [{name:'',email:''},{name:'Fictitious Member',email:''},{name:'',email:'fictitious@example.org'}])test('General request accepts independently optional contacts: '+JSON.stringify(contact),async()=>{
 const f=await fixture(),p=await preparePacket(f.packet.payload,contact),packet={...p,signature:signMessage(p.message)};
 const result=await verifyEntitlementRequest(packet,f.policy,f.io,opts);
 assert.deepEqual(result.recipient,contact);assert.equal(result.status,'VERIFIED_REQUEST_NOT_FULFILLED');assert.equal(result.fulfillmentConfirmed,false);
 assert.equal(result.civilIdentityVerified,false);assert.equal(result.mailboxControlVerified,false);
 assert(p.message.includes('ENTITLEMENT REQUEST v4'));assert(p.message.includes('identified AGI Club entitlement'));assert(!p.message.includes('complimentary'));
 for(const value of Object.values(contact).filter(Boolean))assert(!JSON.stringify(f.calls).includes(value));
});
test('No contact argument produces a fresh private salt without fabricated contact text',async()=>{
 const f=await fixture(),a=await preparePacket(f.packet.payload),b=await preparePacket(f.packet.payload);
 assert.equal(a.recipient.name,'');assert.equal(a.recipient.email,'');assert.notEqual(a.recipient.salt,b.recipient.salt);assert.notEqual(a.payload.recipientCommitment,b.payload.recipientCommitment);
});
for(const field of ['name','email'])test('Removing the signed '+field+' is rejected before any chain read',async()=>{
 const f=await fixture();f.packet.recipient[field]='';let calls=0;f.io.chainId=async()=>{calls++;return 1n;};
 await rejects(()=>verifyEntitlementRequest(f.packet,f.policy,f.io,opts),'RECIPIENT_COMMITMENT_MISMATCH');assert.equal(calls,0);
});
for(const contact of [null,{name:null,email:''},{name:'',email:0},{name:undefined,email:''},{name:'',email:'invalid'},{name:'',email:'a@example.org\nBcc:x@example.org'}])test('Optional contacts do not accept malformed supplied values '+JSON.stringify(contact),async()=>{
 const f=await fixture();await rejects(()=>preparePacket(f.packet.payload,contact),'INVALID_CONTACT');
});
test('An authentic legacy ticket signature cannot be relabeled as a general request',async()=>{
 const f=await fixture(),legacy=structuredClone(f.packet);legacy.payload.schema='AGIClubTicketRequest/3';
 legacy.payload.recipientCommitment='0x'+createHash('sha256').update(JSON.stringify(['AGIClubTicketRequest/3/recipient',legacy.recipient.salt,legacy.recipient.name,legacy.recipient.email])).digest('hex');
 legacy.message='AGI CLUB — TICKET REQUEST v3\nPurpose: request one complimentary ticket from the organizer.\nNo transaction, transfer, permit, approval, or payment is authorized.\nRecipient name and email are bound by a private salted SHA-256 commitment.\n'+JSON.stringify(legacy.payload);
 legacy.signature=signMessage(legacy.message);assert.equal(verifyMessage(legacy.message,legacy.signature),legacy.payload.claimant);
 await rejects(()=>verifyEntitlementRequest(legacy,f.policy,f.io,opts),'UNSUPPORTED_SCHEMA');
 legacy.payload.schema=SCHEMA;legacy.payload.recipientCommitment=await recipientCommitment(legacy.recipient);legacy.message=requestMessage(legacy.payload);
 await rejects(()=>verifyEntitlementRequest(legacy,f.policy,f.io,opts),'INVALID_SIGNATURE');
});
