import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PrivateMemory} from '../frontend/private-memory.mjs';
const read=p=>fs.readFileSync(p,'utf8');
test('PrivateMemory clear invalidates prior pending preparation',()=>{const m=new PrivateMemory(),e=m.epoch;m.clear();assert.equal(m.set({recipient:'private'},e),false);assert.equal(m.packet,null);});
test('PrivateMemory stores only a volatile reference until explicit clear',()=>{const m=new PrivateMemory();assert(m.set({example:true},m.epoch));assert(m.packet.example);m.clear();assert.equal(m.packet,null);});
test('No relay or private database shipped',()=>{for(const p of ['worker','docs/CLOUD_RELAY.md','test/relay.test.mjs','test/d1-local.mjs'])assert(!fs.existsSync(p),p);});
for(const file of ['member.js','private-memory.mjs','verify.js','app.js']){
 test(file+' does not use persistent browser stores or telemetry sinks',()=>{const s=read('frontend/'+file);for(const p of [/localStorage\s*\./,/sessionStorage\s*\./,/indexedDB\s*\./,/document\s*\.cookie\s*=/,/caches\s*\./,/serviceWorker\s*\./,/sendBeacon\s*\(/,/fetch\s*\(/,/XMLHttpRequest/,/new\s+WebSocket/,/console\.(log|error|info|debug)\s*\(/])assert(!p.test(s),file+' '+p);});
}
for(const [file,ids]of [['member.html',['ticketName','ticketEmail','requestPreview']],['verify.html',['packetText']]])test(file+' has no submit form and suppresses contact-field autocomplete',()=>{const s=read('frontend/'+file);assert(!/<form\b/i.test(s));for(const id of ids){const tag=s.match(new RegExp('<(?:input|textarea)[^>]*id="'+id+'"[^>]*>'))?.[0];assert(tag);assert(tag.includes('autocomplete="off"'));assert(tag.includes('spellcheck="false"'));assert(!/\sname=/.test(tag));}});
test('Email link is fixed and contains no body or recipient data',()=>{const s=read('frontend/member.html'),links=[...s.matchAll(/href="(mailto:[^"]+)"/g)];assert.equal(links.length,1);assert(links[0][1].startsWith('mailto:president@montreal.ai?subject='));assert(!/body=/i.test(links[0][1]));});
test('Administrative code has no legacy receipt, mailto-body or member-signature path',()=>{
 const s=read('frontend/app.js');assert(s.includes("if(PAGE!=='admin')return;"));
 for(const pattern of [/mailto:/i,/signedPacket|sendEmail|downloadRequest|relayRequest/,/signMessage|personal_sign/])assert(!pattern.test(s));
});
test('No member file download and no network endpoint in config',()=>{assert(!/Blob|createObjectURL|\.download\s*=|fetch\s*\(|mailto:/i.test(read('frontend/member.js')));assert(!/requestEndpoint|apiKey|mailToken/.test(read('frontend/config.js')));});
test('Organizer verifier has no receipt export, file persistence or logging path',()=>{const s=read('frontend/verify.js');for(const pattern of [/Blob|createObjectURL|\.download\s*=|mailto:/i,/showSaveFilePicker|showDirectoryPicker|getDirectory|createWritable|FileSystem/,/console\.(log|error|warn|info|debug|trace)\s*\(/])assert(!pattern.test(s));});
test('Wallet signs commitment-only message rather than a raw contact packet',()=>{const s=read('frontend/member.js');assert(s.includes('signer.signMessage(unsigned.message)'));assert(!s.includes('signer.signMessage(JSON.stringify'));});
test('Private state reset on navigation, BFCache return, account and input changes',()=>{const s=read('frontend/member.js');for(const v of ['pagehide','pageshow','beforeunload','accountsChanged','chainChanged','disconnect','600000'])assert(s.includes(v));});
test('User acknowledgement precedes clipboard handoff and success clears page',()=>{const s=read('frontend/member.js');assert(s.includes("if(!$('copyConsent').checked)throw Error('COPY_CONSENT')"));assert(s.includes('navigator.clipboard.writeText(JSON.stringify(packet,null,2))'));assert(s.includes('clearPrivate();message(\'Copiée'));});
test('All application HTML pages forbid form submission and direct network connections',()=>{for(const f of fs.readdirSync('frontend').filter(x=>x.endsWith('.html'))){const s=read('frontend/'+f);assert(s.includes("connect-src 'none'"),f);assert(s.includes("form-action 'none'"),f);assert(s.includes('no-referrer'),f);}});

test('Clear control is not blocked by an outstanding wallet operation',()=>{const s=read('frontend/member.js');assert(s.includes("$('clearPrivate').addEventListener('click'"));assert(!s.includes("on('clearPrivate'"));});
