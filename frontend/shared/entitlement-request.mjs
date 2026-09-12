/** AGI Club static-only request protocol. No storage, network or wallet access here.
 * The wallet signs a salted commitment, never plaintext name/email.
 * A signature is NOT encryption, civil identity, mailbox control, or fulfillment.
 */
export const SCHEMA = 'AGIClubEntitlementRequest/4';
export const REGISTRY_VERSION = '2.1.1';
export const ENS = '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e';
export const WRAPPER = '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401';
export const ROOT = '0x39eb848f88bdfb0a6371096249dd451f56859dfe2cd3ddeab1e26d5bb68ede16';
export const FIELDS = Object.freeze(['schema','origin','chainId','registry','entitlementId','membershipLabel','membershipNode','claimant','claimRevision','recipientCommitment','issuedAt','expiresAt','nonce']);
export const MAX_PACKET_BYTES = 14000;
export const MAX_TTL_SECONDS = 7 * 86400;
export const DEFAULT_TTL_SECONDS = 3 * 86400;
export class RequestError extends Error {
  constructor(code) { super(code); this.name = 'RequestError'; this.code = code; }
}
const fail = code => { throw new RequestError(code); };
const address = x => typeof x === 'string' && /^0x[0-9a-f]{40}$/.test(x) && !/^0x0{40}$/.test(x);
const bytes32 = x => typeof x === 'string' && /^0x[0-9a-f]{64}$/.test(x);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && [Object.prototype,null].includes(Object.getPrototypeOf(x));
const exactKeys = (x,keys) => plain(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const text = (x,max) => typeof x === 'string' && x.length > 0 && x.length <= max && x === x.trim() && x === x.normalize('NFC') && !/[\u0000-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/.test(x) && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(x);
export function randomHex(bytes) {
  const a = new Uint8Array(bytes); globalThis.crypto.getRandomValues(a);
  return '0x' + Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
}
export function validOrigin(origin) {
  try { const u=new URL(origin); return u.protocol==='https:' && u.origin===origin && !u.username && !u.password; } catch { return false; }
}
export function validatePolicy(policy) {
  if (!plain(policy) || !validOrigin(policy.origin) || policy.chainId!==1 || !address(policy.registry) || !bytes32(policy.registryCodeHash) || /^0x0{64}$/.test(policy.registryCodeHash)) fail('POLICY_NOT_CONFIGURED');
  const mode=policy.entitlementMode ?? 'allowlist';
  if (!['allowlist','registry'].includes(mode) || !Array.isArray(policy.entitlements) || !policy.entitlements.every(bytes32)) fail('POLICY_NOT_CONFIGURED');
  if (mode==='registry' ? policy.entitlements.length!==0 : policy.entitlements.length===0) fail('POLICY_NOT_CONFIGURED');
  if (policy.version!==REGISTRY_VERSION) fail('POLICY_VERSION_MISMATCH');
  return policy;
}
export function validateRecipient(recipient) {
  if (!exactKeys(recipient,['name','email','salt'])) fail('INVALID_RECIPIENT_SCHEMA');
  // Empty strings deliberately represent omitted contact fields; provided fields stay strict.
  if (recipient.name!=='' && !text(recipient.name,100)) fail('INVALID_CONTACT');
  if (recipient.email!=='' && (!text(recipient.email,254) || !/^[\x21-\x7e]+$/.test(recipient.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email))) fail('INVALID_CONTACT');
  if (!bytes32(recipient.salt) || /^0x0{64}$/.test(recipient.salt)) fail('INVALID_SALT');
  return recipient;
}
export async function recipientCommitment(recipient) {
  validateRecipient(recipient);
  const bytes=new TextEncoder().encode(JSON.stringify([SCHEMA+'/recipient',recipient.salt,recipient.name,recipient.email]));
  try {
    const hash=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
    return '0x'+Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
  } finally { bytes.fill(0); }
}
export function requestMessage(payload) {
  const p=Object.fromEntries(FIELDS.map(k=>[k,payload[k]]));
  return 'AGI CLUB — ENTITLEMENT REQUEST v4\n'
    + 'Purpose: request fulfillment of the identified AGI Club entitlement under its published terms.\n'
    + 'No transaction, transfer, permit, approval, or payment is authorized.\n'
    + 'Optional recipient details are bound by a private salted SHA-256 commitment.\n'
    + 'This request does not confirm delivery, access, a reservation, or a ticket.\n'
    + JSON.stringify(p);
}
export async function preparePacket(scope,contact={name:'',email:''}) {
  if (!plain(contact) || typeof contact.name!=='string' || typeof contact.email!=='string') fail('INVALID_CONTACT');
  const recipient={name:contact.name.trim().normalize('NFC'),email:contact.email.trim(),salt:randomHex(32)};
  const payload={...scope,schema:SCHEMA,recipientCommitment:await recipientCommitment(recipient)};
  return {payload,recipient,message:requestMessage(payload)};
}
function verificationTime(options) {
  const now=options.now ?? Math.floor(Date.now()/1000);
  if (!Number.isSafeInteger(now) || now<0) fail('INVALID_CLOCK');
  return now;
}
function validateTime(p,now) {
  if (!Number.isSafeInteger(p.issuedAt) || p.issuedAt<0 || !Number.isSafeInteger(p.expiresAt) || p.issuedAt>now+300 || p.expiresAt<=p.issuedAt || p.expiresAt-p.issuedAt>MAX_TTL_SECONDS) fail('INVALID_TIME');
  if (p.expiresAt<=now) fail('REQUEST_EXPIRED');
}
export async function validatePacket(packet,policy,crypto,options={}) {
  validatePolicy(policy);
  if (!exactKeys(packet,['payload','recipient','message','signature']) || !exactKeys(packet.payload,FIELDS)) fail('INVALID_SCHEMA');
  const p=Object.fromEntries(FIELDS.map(k=>[k,packet.payload[k]]));
  const now=verificationTime(options);
  if (p.schema!==SCHEMA) fail('UNSUPPORTED_SCHEMA');
  if (p.origin!==policy.origin || p.chainId!==1 || p.registry!==policy.registry) fail('WRONG_SCOPE');
  if (!bytes32(p.entitlementId) || /^0x0{64}$/.test(p.entitlementId) || (policy.entitlementMode!=='registry' && !policy.entitlements.includes(p.entitlementId))) fail('ENTITLEMENT_NOT_ENABLED');
  if (typeof p.membershipLabel!=='string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p.membershipLabel)) fail('INVALID_MEMBERSHIP');
  if (!bytes32(p.membershipNode) || p.membershipNode!==crypto.namehash(p.membershipLabel+'.club.agi.eth').toLowerCase()) fail('INVALID_MEMBERSHIP');
  if (!address(p.claimant) || !Number.isSafeInteger(p.claimRevision) || p.claimRevision<1 || p.claimRevision>4294967295) fail('INVALID_CLAIM');
  validateTime(p,now);
  if (typeof p.nonce!=='string' || !/^0x[0-9a-f]{32}$/.test(p.nonce)) fail('INVALID_NONCE');
  if (!bytes32(p.recipientCommitment)) fail('INVALID_COMMITMENT');
  if (packet.message!==requestMessage(p)) fail('MESSAGE_PAYLOAD_MISMATCH');
  if (typeof packet.signature!=='string' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(packet.signature) || packet.signature.length>4098) fail('INVALID_SIGNATURE_FORMAT');
  if (new TextEncoder().encode(JSON.stringify(packet)).length>MAX_PACKET_BYTES) fail('BODY_TOO_LARGE');
  if (await recipientCommitment(packet.recipient)!==p.recipientCommitment) fail('RECIPIENT_COMMITMENT_MISMATCH');
  return p;
}
export function claimKey(p) { return [p.chainId,p.registry,p.entitlementId,p.membershipNode].join(':'); }
export function revisionKey(p) { return claimKey(p)+':'+p.claimRevision; }
function claimMatches(r,p) { return r && Number(r.status)===1 && String(r.claimant).toLowerCase()===p.claimant && Number(r.revision)===p.claimRevision; }
function validateRegistry(s,policy) {
  if (!s || s.version!==policy.version || s.ens?.toLowerCase()!==ENS || s.wrapper?.toLowerCase()!==WRAPPER || s.root?.toLowerCase()!==ROOT || s.codeHash?.toLowerCase()!==policy.registryCodeHash) fail('WRONG_REGISTRY');
}
export async function verifyEntitlementRequest(packet,policy,io,options={}) {
  // Capture caller-owned data before the first await. Unsupported prototypes
  // and extra fields remain intact so the existing schema checks reject them.
  validatePolicy(policy);
  const trustedPolicy={...policy,entitlements:[...policy.entitlements]};
  const request=plain(packet)?{...packet}:packet;
  if (plain(request)) {
    if (plain(request.payload)) request.payload={...request.payload};
    if (plain(request.recipient)) request.recipient={...request.recipient};
  }
  const timing={now:options.now};
  const p=Object.freeze(await validatePacket(request,trustedPolicy,io.crypto,timing));
  if (BigInt(await io.chainId())!==1n) fail('WRONG_CHAIN');
  const [finalized,latest]=await Promise.all([io.block('finalized'),io.block('latest')]);
  if (!finalized || !latest || !Number.isSafeInteger(finalized.number) || finalized.number<0 || !bytes32(finalized.hash) || !Number.isSafeInteger(latest.number) || latest.number<finalized.number || !bytes32(latest.hash)) fail('FINALITY_UNAVAILABLE');
  // Only the public subset is passed into chain adapters. Never pass recipient/salt.
  const query=Object.freeze({entitlementId:p.entitlementId,membershipNode:p.membershipNode});
  const [rf,rl,cf,cl]=await Promise.all([io.registry(finalized.number),io.registry(latest.number),io.claim(query,finalized.number),io.claim(query,latest.number)]);
  validateRegistry(rf,trustedPolicy); validateRegistry(rl,trustedPolicy);
  if (!claimMatches(cl,p)) fail('CLAIM_NOT_CURRENT');
  if (!claimMatches(cf,p)) fail('WAITING_FOR_FINALITY');
  const [sf,sl]=await Promise.all([io.validSignature(p.claimant,request.message,request.signature,finalized.number),io.validSignature(p.claimant,request.message,request.signature,latest.number)]);
  if (sf!==true || sl!==true) fail('INVALID_SIGNATURE');
  const [checkF,checkL]=await Promise.all([io.block(finalized.number),io.block(latest.number)]);
  if (checkF?.hash!==finalized.hash || checkL?.hash!==latest.hash) fail('CHAIN_CHANGED_RETRY');
  const verifiedAt=verificationTime(timing);
  validateTime(p,verifiedAt);
  return Object.freeze({status:'VERIFIED_REQUEST_NOT_FULFILLED',payload:p,recipient:Object.freeze({name:request.recipient.name,email:request.recipient.email}),claimKey:claimKey(p),revisionKey:revisionKey(p),finalizedBlock:finalized.number,finalizedHash:finalized.hash,latestBlock:latest.number,latestHash:latest.hash,verifiedAt,fulfillmentConfirmed:false,mailboxControlVerified:false,civilIdentityVerified:false});
}
