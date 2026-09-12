import {MAX_PACKET_BYTES,RequestError} from './ticket-request.mjs';

const heading='AGI CLUB — PRIVATE REQUEST / DEMANDE PRIVÉE';
const identity='AGI Club identity / Identité AGI Club: ';
const separator='\nReceipt / Reçu JSON:\n';
const fail=code=>{throw new RequestError(code);};
export function membershipName(label) {
  if(typeof label!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))fail('INVALID_MEMBERSHIP');
  return label+'.club.agi.eth';
}
// Presentation envelope only. The signed v3 packet stays byte-for-byte compatible.
// Neither function stores data, contacts a service or opens a mail client.
export function formatRequestEmail(packet) {
  const raw=JSON.stringify(packet,null,2);
  if(new TextEncoder().encode(raw).length>MAX_PACKET_BYTES)fail('BODY_TOO_LARGE');
  return heading+'\n'+identity+membershipName(packet?.payload?.membershipLabel)+separator+raw;
}
export const MAX_EMAIL_BYTES=MAX_PACKET_BYTES+256;
export function parseRequestEmail(raw) {
  if(typeof raw!=='string')fail('INVALID_JSON');
  if(new TextEncoder().encode(raw).length>MAX_EMAIL_BYTES)fail('BODY_TOO_LARGE');
  let json=raw,name=null;
  if(raw.startsWith(heading+'\n')||raw.startsWith(heading+'\r\n')) {
    const normalized=raw.replace(/\r\n/g,'\n'),start=heading+'\n'+identity,split=normalized.indexOf(separator);
    if(!normalized.startsWith(start)||split<start.length)fail('INVALID_EMAIL_IDENTITY');
    name=normalized.slice(start.length,split);json=normalized.slice(split+separator.length);
  }
  if(new TextEncoder().encode(json).length>MAX_PACKET_BYTES)fail('BODY_TOO_LARGE');
  let packet;try{packet=JSON.parse(json);}catch{fail('INVALID_JSON');}
  if(name!==null && name!==membershipName(packet?.payload?.membershipLabel))fail('INVALID_EMAIL_IDENTITY');
  return packet;
}
