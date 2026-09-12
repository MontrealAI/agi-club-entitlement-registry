import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {deploymentMessage,validatePlan} from '../shared/deployment-policy.mjs';

const hash=n=>'0x'+n.repeat(64),address=n=>'0x'+n.repeat(40);
function plan(n='a') {const now=Math.floor(Date.now()/1000);return {schema:'AGIClubDeploymentPlan/1',chainId:1,contract:'contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet',sourceSha256:n.repeat(64),creationCodeHash:hash('1'),runtimeCodeHash:hash('2'),deployer:address('3'),admin:address('4'),nonce:'0',predictedAddress:address('5'),gasLimit:'100',maxFeePerGas:'5',maxPriorityFeePerGas:'1',maxCostWei:'500',createdAt:now,expiresAt:now+1800,evidenceSha256:'b'.repeat(64)};}
function fixture() {
 const elements=new Map(['plan','consent','sign','details','status'].map(id=>[id,{value:'',files:[],checked:false,disabled:id==='sign',textContent:'',listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);}}]));
 const events=new Map(),walletEvents=new Map(),waits=new Map(),providers=[],signatures=[],downloads=[],blobs=new Map();
 const state={account:address('4'),owner:address('4'),chain:1n,code:'0x',signatureValid:true,wrappedOwner:address('4'),fuses:0n,expiry:0n,timestamp:1000};
 const boundary=async name=>{const wait=waits.get(name);if(wait){waits.delete(name);wait.started.resolve();await wait.pending.promise;}};
 const signer={getAddress:async()=>state.account,signMessage:async message=>{signatures.push(message);await boundary('signature');return '0x'+'11'.repeat(65);}};
 const ethereum={request:async({method})=>{if(method==='eth_requestAccounts')await boundary('permission');if(method==='eth_chainId')return '0x'+state.chain.toString(16);return [state.account];},on:(event,fn)=>walletEvents.set(event,fn)};
 const ethers={namehash:()=>hash('7'),verifyMessage:()=>state.signatureValid?address('4'):address('6'),hashMessage:()=>hash('8'),
  BrowserProvider:class{constructor(){providers.push(this);}async send(method){return ethereum.request({method});}async getNetwork(){return {chainId:state.chain};}async getSigner(){return signer;}async getCode(){await boundary('code');return state.code;}async getBlock(){return {timestamp:state.timestamp};}destroy(){this.destroyed=true;}},
  Contract:class{async owner(){await boundary('owner');return state.owner;}async getData(){return [state.wrappedOwner,state.fuses,state.expiry];}async isValidSignature(){return state.signatureValid?'0x1626ba7e':'0xffffffff';}},
 };
 const window={ethereum,ethers,addEventListener:(event,fn)=>events.set(event,fn)};
 const source=readFileSync(new URL('../frontend/deployment.js',import.meta.url),'utf8');
 runInNewContext(source.replace(/^import .*;\r?\n/gm,''),{window,ethers,deploymentMessage,validatePlan,Blob,location:{protocol:'https:',hostname:'claims.example.org'},
  document:{getElementById:id=>elements.get(id),createElement:()=>({click(){downloads.push(blobs.get(this.href));}})},
  URL:{createObjectURL:blob=>{const url='blob:fixture-'+blobs.size;blobs.set(url,blob);return url;},revokeObjectURL:url=>blobs.delete(url)},setTimeout:()=>1,clearTimeout(){},
 },{filename:'frontend/deployment.js'});
 return {state,providers,signatures,downloads,el:id=>elements.get(id),
  load:async(value,wait)=>{elements.get('plan').files=[{size:500,text:async()=>{if(wait){wait.started.resolve();await wait.pending.promise;}return JSON.stringify(value);}}];await elements.get('plan').listeners.get('change')();},
  consent:async checked=>{elements.get('consent').checked=checked;await elements.get('consent').listeners.get('change')();},
  sign:async()=>{if(!elements.get('sign').disabled)await elements.get('sign').listeners.get('click')();},
  event:event=>(walletEvents.get(event)||events.get(event))?.([]),
  pause:name=>{const started=Promise.withResolvers(),pending=Promise.withResolvers();waits.set(name,{started,pending});return {started:started.promise,release:pending.resolve};},
 };
}
test('A stable reviewed plan produces an internally consistent approval and closes its provider',async()=>{
 const ui=fixture(),p=plan();await ui.load(p);await ui.consent(true);await ui.sign();
 assert.equal(ui.downloads.length,1);const packet=JSON.parse(await ui.downloads[0].text());
 assert.deepEqual(packet.plan,p);assert.equal(packet.message,deploymentMessage(packet.plan));
 assert(ui.providers.every(p=>p.destroyed));
});
test('A slower previous file read cannot replace the newly selected deployment plan',async()=>{
 const ui=fixture(),wait={started:Promise.withResolvers(),pending:Promise.withResolvers()},first=ui.load(plan('a'),wait);
 await wait.started.promise;await ui.load(plan('b'));wait.pending.resolve();await first;
 assert.equal(JSON.parse(ui.el('details').textContent).sourceSha256,'b'.repeat(64));
});
for(const phase of ['permission','owner','signature','code']) {
 test('Changing the plan during '+phase+' cancels the old approval',async()=>{
  const ui=fixture();await ui.load(plan('a'));await ui.consent(true);const wait=ui.pause(phase),pending=ui.sign();
  await wait.started;await ui.load(plan('b'));wait.release();await pending;
  assert.equal(ui.downloads.length,0);if(['permission','owner'].includes(phase))assert.equal(ui.signatures.length,0);
  assert.equal(ui.el('consent').checked,false);assert(ui.providers.every(p=>p.destroyed));
 });
 test('Revoking consent during '+phase+' cancels the approval',async()=>{
  const ui=fixture();await ui.load(plan());await ui.consent(true);const wait=ui.pause(phase),pending=ui.sign();
  await wait.started;await ui.consent(false);wait.release();await pending;
  assert.equal(ui.downloads.length,0);if(['permission','owner'].includes(phase))assert.equal(ui.signatures.length,0);
 });
}
for(const event of ['accountsChanged','chainChanged','disconnect','pagehide','pageshow']) {
 test('The '+event+' event invalidates a pending deployment signature',async()=>{
  const ui=fixture();await ui.load(plan());await ui.consent(true);const wait=ui.pause('signature'),pending=ui.sign();
  await wait.started;ui.event(event);wait.release();await pending;
  assert.equal(ui.downloads.length,0);assert.equal(ui.el('consent').checked,false);
 });
}
test('Changing account without an event during signing prevents approval download',async()=>{
 const ui=fixture();await ui.load(plan());await ui.consent(true);const wait=ui.pause('signature'),pending=ui.sign();
 await wait.started;ui.state.account=address('6');wait.release();await pending;assert.equal(ui.downloads.length,0);
});
test('Changing the root holder during signing prevents approval download',async()=>{
 const ui=fixture();await ui.load(plan());await ui.consent(true);const wait=ui.pause('signature'),pending=ui.sign();
 await wait.started;ui.state.owner=address('6');wait.release();await pending;assert.equal(ui.downloads.length,0);
});
test('Changing network without an event during signing prevents approval download',async()=>{
 const ui=fixture();await ui.load(plan());await ui.consent(true);const wait=ui.pause('signature'),pending=ui.sign();
 await wait.started;ui.state.chain=31337n;wait.release();await pending;assert.equal(ui.downloads.length,0);
});
for(const [description,fuses,expiry,allowed] of [
 ['parent-controlled wrapped root with zero expiry',0n,0n,true],
 ['emancipated wrapped root at exact expiry',65536n,1000n,true],
 ['expired emancipated wrapped root',65536n,999n,false],
]) test('Approval checks '+description,async()=>{
 const ui=fixture();Object.assign(ui.state,{owner:'0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401',fuses,expiry});await ui.load(plan());await ui.consent(true);await ui.sign();assert.equal(ui.downloads.length,allowed?1:0);assert(ui.providers.every(p=>p.destroyed));
});
test('Repeated sign clicks while a wallet request is pending produce only one signature',async()=>{
 const ui=fixture();await ui.load(plan());await ui.consent(true);const wait=ui.pause('permission'),pending=ui.sign();
 await wait.started;await ui.consent(true);const second=ui.sign();wait.release();await Promise.all([pending,second]);
 assert.equal(ui.signatures.length,1);assert.equal(ui.downloads.length,1);
});
test('A deployed contract wallet must validate the approval before download',async()=>{
 const ui=fixture();ui.state.code='0x6000';ui.state.signatureValid=false;await ui.load(plan());await ui.consent(true);await ui.sign();
 assert.equal(ui.downloads.length,0);assert(ui.providers.every(p=>p.destroyed));
});
