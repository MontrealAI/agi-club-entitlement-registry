import {languageFixture} from './language-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {REGISTRY_VERSION,MAX_PACKET_BYTES,RequestError} from '../shared/ticket-request.mjs';
import {parseRequestEmail,membershipName,MAX_EMAIL_BYTES} from '../shared/request-email.mjs';
import {requestPolicy} from '../frontend/member-catalog.mjs';

function fixture() {
 const language=languageFixture('fr');
 const ids=['packetText','verifyResult','verifyStatus','verifyReceipt','clearReceipt'];
 const elements=new Map(ids.map(id=>[id,{value:'',textContent:'',disabled:false,listeners:new Map(),addEventListener(event,fn){this.listeners.set(event,fn);}}]));
 const windowEvents=new Map(),walletEvents=new Map(),timers=new Map(),calls=[],providers=[];
 const waits=new Map();let now=0,next=0,error=null;
 const boundary=async name=>{calls.push(name);const wait=waits.get(name);if(wait){waits.delete(name);wait.started.resolve();await wait.pending.promise;}};
 const window={AGI_CONFIG:{expectedOrigin:'https://claims.example.org',registryAddress:'0x'+'11'.repeat(20),registryCodeHash:'0x'+'22'.repeat(32),allowedEntitlements:['TEST']},addEventListener:(event,fn)=>windowEvents.set(event,fn),ethereum:{request:async()=>boundary('permission'),on:(event,fn)=>walletEvents.set(event,fn)}};
 const ethers={id:()=> '0x'+'33'.repeat(32),BrowserProvider:class{constructor(){providers.push(this);}destroy(){this.destroyed=true;}}};window.ethers=ethers;
 const source=readFileSync(new URL('../frontend/verify.js',import.meta.url),'utf8');
 runInNewContext(source.replace(/^import .*;\r?\n/gm,''),{
  ...language,window,ethers,REGISTRY_VERSION,MAX_PACKET_BYTES,RequestError,TextEncoder,parseRequestEmail,membershipName,MAX_EMAIL_BYTES,requestPolicy,
  location:{origin:window.AGI_CONFIG.expectedOrigin},document:{getElementById:id=>elements.get(id)},
  setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
  createEthersIO:()=>({}),verifyTicketRequest:async packet=>{await boundary('verification');if(error)throw error;return {status:'VERIFIED_REQUEST_NOT_A_TICKET',claimKey:'PUBLIC_FIXTURE',payload:{claimRevision:1,membershipLabel:'fictitious-member'},recipient:packet.recipient,finalizedBlock:100};},
 },{filename:'frontend/verify.js'});
 return {
  changeLanguage:language.changeLanguage,calls,providers,el:id=>elements.get(id),
  click:async id=>{const el=elements.get(id);if(!el.disabled)await el.listeners.get('click')?.();},
  input:async(name='FICTITIOUS_MEMBER')=>{const el=elements.get('packetText');el.value=JSON.stringify({recipient:{name,email:'fixture@example.org'}});await el.listeners.get('input')();},
  event:event=>(windowEvents.get(event)||walletEvents.get(event))?.(),
  advance:ms=>{now+=ms;for(const[id,timer]of timers)if(timer.at<=now){timers.delete(id);timer.fn();}},
  fail:value=>{error=value;},
  pause:name=>{const started=Promise.withResolvers(),pending=Promise.withResolvers();waits.set(name,{started,pending});return {started:started.promise,release:pending.resolve};},
 };
}

test('Organizer verifier displays the verified recipient and releases its provider',async()=>{
 const ui=fixture();await ui.input();await ui.click('verifyReceipt');
 assert.equal(JSON.parse(ui.el('verifyResult').textContent).email,'fixture@example.org');
 assert.equal(JSON.parse(ui.el('verifyResult').textContent).membership,'fictitious-member.club.agi.eth');
 assert(ui.providers.every(provider=>provider.destroyed));
});

test('Pasting a new receipt removes the previous verification success message',async()=>{
 const ui=fixture();await ui.input();await ui.click('verifyReceipt');await ui.input('NEW_FICTITIOUS_MEMBER');
 assert(!ui.el('verifyStatus').textContent.includes('Signature et droit vérifiés'));
 assert.equal(ui.el('verifyResult').textContent,'');
});

test('Starting a recheck removes the previous verified result while the wallet is pending',async()=>{
 const ui=fixture();await ui.input();await ui.click('verifyReceipt');
 const wait=ui.pause('permission'),pending=ui.click('verifyReceipt');await wait.started;
 const previous=ui.el('verifyResult').textContent;wait.release();await pending;
 assert.equal(previous,'');
});

for(const event of ['clearReceipt','pagehide','pageshow','beforeunload','accountsChanged','chainChanged','disconnect']) {
 test('Organizer verifier clears input and result on '+event,async()=>{
  const ui=fixture();await ui.input();await ui.click('verifyReceipt');
  if(event==='clearReceipt')await ui.click(event);else ui.event(event);
  assert.equal(ui.el('packetText').value,'');assert.equal(ui.el('verifyResult').textContent,'');
 });
}

test('A cleared receipt never starts verification after a delayed wallet permission',async()=>{
 const ui=fixture();await ui.input();const wait=ui.pause('permission'),pending=ui.click('verifyReceipt');
 await wait.started;await ui.click('clearReceipt');wait.release();await pending;
 assert(!ui.calls.includes('verification'));
 assert.equal(ui.el('verifyResult').textContent,'');
});

test('An old verification cannot extend the retention of newly pasted contact data',async()=>{
 const ui=fixture();await ui.input();const wait=ui.pause('verification'),pending=ui.click('verifyReceipt');
 await wait.started;ui.advance(60000);await ui.input('NEW_FICTITIOUS_MEMBER');ui.advance(120000);
 wait.release();await pending;
 assert.equal(ui.el('verifyResult').textContent,'');
 ui.advance(480000);
 assert.equal(ui.el('packetText').value,'','New input must clear ten minutes after its own last interaction');
});

test('Verification completion is not user activity and cannot extend the private receipt lifetime',async()=>{
 const ui=fixture();await ui.input();const wait=ui.pause('verification'),pending=ui.click('verifyReceipt');
 await wait.started;ui.advance(120000);wait.release();await pending;ui.advance(480000);
 assert.equal(ui.el('packetText').value,'');assert.equal(ui.el('verifyResult').textContent,'');
});

test('Private fields remain cleared when a verification completes after inactivity expiry',async()=>{
 const ui=fixture();await ui.input();const wait=ui.pause('verification'),pending=ui.click('verifyReceipt');
 await wait.started;ui.advance(600000);wait.release();await pending;
 assert.equal(ui.el('packetText').value,'');assert.equal(ui.el('verifyResult').textContent,'');
 assert(ui.providers.every(provider=>provider.destroyed));
});

for(const error of [new Error('FICTITIOUS_MEMBER'),{code:'FICTITIOUS_MEMBER',message:'fixture@example.org'},new RequestError('FICTITIOUS_MEMBER')]) {
 test('Provider or unrecognized error text is never copied into the verifier display: '+error.constructor.name,async()=>{
  const ui=fixture();await ui.input();ui.fail(error);await ui.click('verifyReceipt');
  assert(!ui.el('verifyStatus').textContent.includes('FICTITIOUS_MEMBER'));
  assert(!ui.el('verifyStatus').textContent.includes('fixture@example.org'));
  assert.equal(ui.el('verifyResult').textContent,'');
 });
}

test('A recognized protocol failure remains actionable without echoing the receipt',async()=>{
 const ui=fixture();await ui.input();ui.fail(new RequestError('WAITING_FOR_FINALITY'));await ui.click('verifyReceipt');
 assert.match(ui.el('verifyStatus').textContent,/finalit/i);
 assert.equal(ui.el('verifyResult').textContent,'');
});
