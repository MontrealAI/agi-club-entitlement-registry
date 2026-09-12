/** Rehearsal of the ACTUAL static UI, with explicitly simulated Ethereum/crypto.
 * This is NOT genuine ethers, chain, wallet, mail or Eventbrite qualification.
 * Uses temporary localhost HTTPS, a temporary test certificate and fictitious contacts.
 */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import https from 'node:https';import assert from 'node:assert/strict';import {spawn,spawnSync} from 'node:child_process';
import {id,namehash,walletAddress} from '../test/crypto-reference.mjs';
import {parseRequestEmail} from '../shared/request-email.mjs';
const source=process.argv.includes('--source'),root=path.resolve(source?'frontend':'dist/site');
const report={status:'NOT_EXECUTED',scope:'Actual member/verify page code on local HTTPS; ETHEREUM, WALLET AND SIGNATURE VERIFICATION ARE TEST DOUBLES. No real contacts, external mail, tickets or mainnet transactions.',sourceMode:source,checks:[]};
let server,child,ws,tmp,currentLanguage;const sleep=n=>new Promise(r=>setTimeout(r,n));
try{
 tmp=fs.mkdtempSync(path.join(os.tmpdir(),'agi-privacy-'));
 const ssl=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(tmp,'key.pem'),'-out',path.join(tmp,'cert.pem'),'-days','1','-subj','/CN=localhost'],{encoding:'utf8'});assert.equal(ssl.status,0,'OpenSSL required for a throwaway local HTTPS certificate');
 const A=walletAddress(1n),E=id('FICTITIOUS_TEST_BENEFIT'),N=namehash('alice.club.agi.eth'),CODE='0x'+'22'.repeat(32);let base;
 const fixture=`window.__calls=[];window.__clipboard=[];window.__walletEvents={};window.ethereum={request:async r=>{window.__calls.push(r);if(r.method==='eth_requestAccounts'){if(window.__permissionError)throw Error(window.__permissionError);if(window.__permissionGate)await window.__permissionGate;}if(r.method==='eth_chainId')return '0x1';return ['${A}'];},on:(event,fn)=>{window.__walletEvents[event]=fn;}};
 window.ethers={id:()=> '${E}',namehash:n=>n==='club.agi.eth'?'${namehash('club.agi.eth')}':'${N}',isAddress:x=>/^0x[0-9a-f]{40}$/i.test(x),keccak256:()=> '${CODE}',ZeroAddress:'0x'+'0'.repeat(40),verifyMessage:()=> '${A}',hashMessage:()=> '${id('mock-hash')}',
 BrowserProvider:class{async getSigner(){return{getAddress:async()=> '${A}',signMessage:async m=>{window.__calls.push({method:'personal_sign',message:m});if(window.__signatureGate)await window.__signatureGate;return '0x'+'11'.repeat(65);}};}async getCode(a){window.__calls.push({method:'getCode',a});return a.toLowerCase()==='${A}'?'0x':'0x6000';}async getNetwork(){return{chainId:1n};}async getBlock(t){return{number:t==='finalized'||t===100?100:104,hash:'0x'+(t==='finalized'||t===100?'aa':'bb').repeat(32)};}destroy(){}},
 Contract:class{async VERSION(){return '2.1.1';}async CANONICAL_ENS(){return '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e';}async CANONICAL_WRAPPER(){return '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401';}async CLUB_AGI_ETH_NODE(){return '${namehash('club.agi.eth')}';}async admin(){return '${A}';}async entitlementCount(){return 1n;}async entitlementIdsPage(){return ['${E}'];}async entitlement(){return ['${E}','0x'+'0'.repeat(64),50n,1n,1n,0n,0n,2n,true];}async titleFR(){return 'TEST FICTIF — AVANTAGE';}async titleEN(){return 'FICTITIOUS TEST — BENEFIT';}async claimability(){return[9,'${N}','${A}','${A}',1,false,false,0,1,50,2];}async claimRecord(...args){window.__calls.push({method:'claimRecord',args});return ['${A}',1n,1n,0n,1n,1n];}}};
 Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__clipboard.push(t);}},configurable:true});
 `;
 const requests=[];
 server=https.createServer({key:fs.readFileSync(path.join(tmp,'key.pem')),cert:fs.readFileSync(path.join(tmp,'cert.pem'))},(req,res)=>{
  requests.push({url:req.url,method:req.method});const u=new URL(req.url,'https://localhost');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if(u.pathname==='/config.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.AGI_CONFIG='+JSON.stringify({registryAddress:'0x'+'11'.repeat(20),registryCodeHash:CODE,expectedOrigin:base,chainId:1,entitlementMode:'registry',allowedEntitlements:[]})+';');}
  if(u.pathname==='/vendor/ethers.umd.min.js'){res.setHeader('Content-Type','text/javascript');return res.end(fixture);}
  const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',f.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(f)?'text/javascript':f.endsWith('.css')?'text/css':'text/plain');res.end(fs.readFileSync(f));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));base='https://127.0.0.1:'+server.address().port;
 const chrome=[process.env.CHROME_BIN,'/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(fs.existsSync);assert(chrome,'Chrome/Chromium executable required');
 child=spawn(chrome,['--headless=new','--no-sandbox','--ignore-certificate-errors','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+path.join(tmp,'browser'),'about:blank'],{stdio:'ignore'});
 const portFile=path.join(tmp,'browser','DevToolsActivePort'),start=Date.now();while(!fs.existsSync(portFile)){assert(Date.now()-start<20000,'Browser start timeout');await sleep(100);}
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let n=0;const pending=new Map(),exceptions=[],network=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Network.requestWillBeSent')network.push(m.params.request);});
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++n,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT:'+method));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 // Chrome may invalidate an evaluation while the tested page reloads. Keep the same bounded readiness check.
 const waitFor=async(expression,label)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){try{if(await evaluate(expression))return;}catch(e){if(!/context.*(destroyed|not found)|Cannot find context|^Inspected target navigated or closed$/i.test(e.message))throw e;}await sleep(50);}throw Error('Browser readiness timeout: '+label);};
 const click=async id=>{await evaluate('document.getElementById('+JSON.stringify(id)+').click()');await waitFor('document.getElementById('+JSON.stringify(id)+').getAttribute("aria-busy")!=="true"',id+' action');};
 const check=async(name,fn)=>{await fn();report.checks.push({name,language:currentLanguage,status:'PASS'});};
 await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.__privateSinks=[];window.__documentGeneration=crypto.randomUUID();
  const forbid=name=>()=>{window.__privateSinks.push(name);throw Error('FORBIDDEN_PRIVATE_SINK');};
  for(const name of ['localStorage','sessionStorage']){
   const target=window[name];
   Object.defineProperty(window,name,{value:new Proxy(target,{set:forbid(name),defineProperty:forbid(name),get(target,key){if(key==='setItem')return forbid(name);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}})});
  }
  const cookie=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
  Object.defineProperty(Document.prototype,'cookie',{...cookie,set:forbid('cookie')});
  indexedDB.open=forbid('IndexedDB');
  caches.open=forbid('Cache Storage');
  for(const name of ['put','add','addAll'])Cache.prototype[name]=forbid('Cache write');
  if(navigator.serviceWorker)navigator.serviceWorker.register=forbid('service worker');
  if(navigator.storage?.getDirectory)navigator.storage.getDirectory=forbid('origin-private filesystem');
  window.showSaveFilePicker=forbid('file save');
  URL.createObjectURL=forbid('object URL download');
  const click=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download'))return forbid('download')();return click.call(this);};
  for(const name of ['log','error','warn','info','debug','trace'])console[name]=forbid('console');
 `});
 const emptyStores=async()=>{
  assert(await evaluate(`(async()=>window.__privateSinks.length===0&&localStorage.length===0&&sessionStorage.length===0&&document.cookie===''&&(await indexedDB.databases()).length===0&&(await caches.keys()).length===0&&(await navigator.serviceWorker.getRegistrations()).length===0)()`),'Persistence or logging attempted');
 };
 for(const language of ['fr','en']){currentLanguage=language;
 const nav=await command('Page.navigate',{url:base+'/member.html?lang='+language});assert(!nav.errorText,'Hosted navigation failed: '+nav.errorText);
 await waitFor('location.href==='+JSON.stringify(base+'/member.html?lang='+language)+'&&document.readyState==="complete"','member page and modules');
 await check('Actual hosted member module loads',async()=>assert(await evaluate('!!document.getElementById("prepareRequest")'),'Hosted page unavailable: '+await evaluate('location.href+" | "+document.title')));
 const connectMember=async()=>{
 await click('connect');assert(await evaluate('document.getElementById("connection").textContent.includes('+JSON.stringify(A)+')'),await evaluate('document.getElementById("status").textContent'));
 await evaluate('document.getElementById("benefitSelect").value="'+E+'";document.getElementById("benefitSelect").dispatchEvent(new Event("input"));document.getElementById("memberLabel").value="alice"');await click('verify');assert(await evaluate('!document.getElementById("contactInputs").disabled'),await evaluate('document.getElementById("status").textContent'));
 };
 await connectMember();
 await check('Catalogue uses the administrator’s selected-language title',async()=>assert.equal(await evaluate('document.getElementById("benefitSelect").selectedOptions[0].textContent'),language==='fr'?'TEST FICTIF — AVANTAGE — Ouvert':'FICTITIOUS TEST — BENEFIT — Open'));
 const fill=`document.getElementById('usageConsent').checked=true;document.getElementById('usageConsent').dispatchEvent(new Event('change'));document.getElementById('ticketName').value='PRIVATE FICTIVE MEMBER';document.getElementById('ticketName').dispatchEvent(new Event('input'));document.getElementById('ticketEmail').value='private-fixture@example.org';document.getElementById('ticketEmail').dispatchEvent(new Event('input'));document.getElementById('consent').checked=true;`;
 await check('No signature prompt without the reading acknowledgement',async()=>{
  await evaluate(fill+"document.getElementById('usageConsent').checked=false;");await click('prepareRequest');
  assert.equal(await evaluate("window.__calls.filter(x=>x.method==='personal_sign').length"),0);
 });
 await evaluate(fill);await click('prepareRequest');
 await check('Actual sign and verify handlers prepare a bounded private receipt',async()=>assert(await evaluate('!document.getElementById("copyRequest").disabled'),await evaluate('document.getElementById("status").textContent')));
 await check('No contact text sent to wallet or Ethereum adapter',async()=>{const v=await evaluate('JSON.stringify(window.__calls)');assert(!v.includes('PRIVATE FICTIVE MEMBER'));assert(!v.includes('private-fixture@example.org'));});
 await check('Wallet message does not contain the private salt',async()=>assert(await evaluate(`(async()=>!JSON.stringify(window.__calls).includes((await import('./shared/request-email.mjs')).parseRequestEmail(document.getElementById('requestPreview').value).recipient.salt))()`)));
 await check('Zero writes to cookie/local/session stores',async()=>assert(await evaluate('localStorage.length===0&&sessionStorage.length===0&&document.cookie===""')));
 await check('No private request copied without explicit acknowledgement',async()=>{await click('copyRequest');assert.equal(await evaluate('window.__clipboard.length'),0);});
 await check('Withdrawing and renewing acknowledgement discards an outstanding private signature',async()=>{
  // Return immediately: CDP otherwise awaits the newly assigned pending promise.
  await evaluate(fill+"window.__signatureGate=new Promise(resolve=>{window.__completeSignature=resolve;});true;");
  const signatures=await evaluate("window.__calls.filter(x=>x.method==='personal_sign').length");
  await evaluate("document.getElementById('prepareRequest').click()");
  await waitFor("window.__calls.filter(x=>x.method==='personal_sign').length>"+signatures,'pending private signature');
  await evaluate("document.getElementById('usageConsent').checked=false;document.getElementById('usageConsent').dispatchEvent(new Event('change'));"+fill+"window.__completeSignature();window.__signatureGate=null;");
  await waitFor("document.getElementById('prepareRequest').getAttribute('aria-busy')!=='true'",'discarded signature');
  assert(await evaluate("document.getElementById('copyRequest').disabled&&document.getElementById('requestPreview').value===''") );
 });
 await evaluate(fill);await click('prepareRequest');
 await check('Editing contacts invalidates the existing signed packet',async()=>{await evaluate('document.getElementById("ticketEmail").dispatchEvent(new Event("input"))');assert(await evaluate('document.getElementById("copyRequest").disabled&&document.getElementById("requestPreview").value===""'));});
 await evaluate(fill);await click('prepareRequest');
 await check('Explicit clipboard handoff clears page references and fields',async()=>{await evaluate('document.getElementById("copyConsent").checked=true');await click('copyRequest');assert(await evaluate('window.__clipboard.length===1 && document.getElementById("ticketName").value==="" && document.getElementById("ticketEmail").value==="" && document.getElementById("requestPreview").value==="" && document.getElementById("copyRequest").disabled'));});
 const privateReceipt=await evaluate('window.__clipboard[0]'),privateSalt=parseRequestEmail(privateReceipt).recipient.salt;
 await check('Copied email visibly contains the full signed AGI Club subname',async()=>assert(privateReceipt.includes('Identité AGI Club: alice.club.agi.eth')));
 await check('Language change cancels a pending private signature and clears contact data without reloading',async()=>{
  await evaluate(fill+"window.__signatureGate=new Promise(resolve=>{window.__completeSignature=resolve;});true;");
  const generation=await evaluate('window.__documentGeneration'),count=await evaluate("window.__calls.filter(x=>x.method==='personal_sign').length");
  await evaluate("document.getElementById('prepareRequest').click()");
  await waitFor("window.__calls.filter(x=>x.method==='personal_sign').length>"+count,'language change during signature');
  await evaluate(`document.querySelector('[data-language="${language==='fr'?'en':'fr'}"]').click();window.__completeSignature();window.__signatureGate=null;`);
  await waitFor("document.getElementById('prepareRequest').getAttribute('aria-busy')!=='true'",'cancelled private signature');
  assert.equal(await evaluate('window.__documentGeneration'),generation);
  assert(await evaluate("document.getElementById('ticketName').value===''&&document.getElementById('ticketEmail').value===''&&document.getElementById('requestPreview').value===''&&document.getElementById('copyRequest').disabled&&!document.getElementById('usageConsent').checked"));
  assert.equal(await evaluate('window.__clipboard.length'),1);
  await evaluate(`document.querySelector('[data-language="${language}"]').click();`);await connectMember();
 });
 await check('Return from page cache clears private fields',async()=>{await evaluate(fill+'window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));');assert(await evaluate('document.getElementById("ticketEmail").value===""&&!document.getElementById("usageConsent").checked'));});
 await check('Pagehide clears fields',async()=>{await evaluate(fill+'window.dispatchEvent(new Event("pagehide"));');assert(await evaluate('document.getElementById("ticketName").value===""&&!document.getElementById("usageConsent").checked'));});
 await check('Mailto link has no private body or member address',async()=>{const h=await evaluate('document.querySelector("a[href^=mailto]").getAttribute("href")');assert(!h.includes('body='));assert(!h.includes('private-fixture'));});
 for(const width of [1280,390])await check('Member layout '+width+'px fits viewport',async()=>{await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));});
 await check('Member flow leaves all persistent stores empty and creates no file or log',emptyStores);
 const memberCalls=await evaluate('JSON.stringify(window.__calls)');
 await check('Reloading the member page never restores contact fields or the receipt',async()=>{
  await evaluate(fill);const generation=await evaluate('window.__documentGeneration');await command('Page.reload',{ignoreCache:true});
  await waitFor('window.__documentGeneration!=='+JSON.stringify(generation)+'&&document.readyState==="complete"&&!!window.__calls','member reload');
  assert(await evaluate(`document.getElementById('ticketName').value===''&&document.getElementById('ticketEmail').value===''&&document.getElementById('requestPreview').value===''&&!document.getElementById('usageConsent').checked`));
 });
 await command('Page.navigate',{url:base+'/verify.html?lang='+language});
 await waitFor('location.href==='+JSON.stringify(base+'/verify.html?lang='+language)+'&&document.readyState==="complete"','organizer page and modules');
 const paste=`document.getElementById('packetText').value=${JSON.stringify(privateReceipt)};document.getElementById('packetText').dispatchEvent(new Event('input'));`;
 const verify=async()=>{await evaluate(paste+`document.getElementById('verifyReceipt').click();`);await waitFor(`!document.getElementById('verifyReceipt').disabled`,'organizer verification');};
 await check('Actual organizer module verifies the copied receipt locally',async()=>{
  await verify();assert(await evaluate(`JSON.parse(document.getElementById('verifyResult').textContent).email==='private-fixture@example.org'&&JSON.parse(document.getElementById('verifyResult').textContent).membership==='alice.club.agi.eth'`));
 });
 await check('Organizer editing invalidates the previous recipient and success message',async()=>{
  await evaluate(paste);assert(await evaluate(`document.getElementById('verifyResult').textContent===''&&!document.getElementById('verifyStatus').textContent.includes('Signature et droit vérifiés')`));
 });
 await check('Organizer clear remains effective during a pending wallet prompt',async()=>{
  await evaluate(`window.__permissionGate=new Promise(resolve=>window.__releasePermission=resolve);`+paste+`document.getElementById('verifyReceipt').click();`);
  await waitFor(`document.getElementById('verifyReceipt').disabled`,'pending organizer permission');
  const reads=await evaluate(`window.__calls.filter(x=>x.method==='claimRecord').length`);
  await evaluate(`document.getElementById('clearReceipt').click();window.__releasePermission();window.__permissionGate=null;`);
  await waitFor(`!document.getElementById('verifyReceipt').disabled`,'cleared organizer operation');
  assert(await evaluate(`document.getElementById('packetText').value===''&&document.getElementById('verifyResult').textContent===''`));
  assert.equal(await evaluate(`window.__calls.filter(x=>x.method==='claimRecord').length`),reads);
 });
 for(const event of ['pagehide','pageshow','accountsChanged','chainChanged','disconnect'])await check('Organizer '+event+' clears receipt and displayed contacts',async()=>{
  await verify();await evaluate(['pagehide','pageshow'].includes(event)?`window.dispatchEvent(new PageTransitionEvent('${event}',{persisted:true}));`:`window.__walletEvents['${event}']([]);`);
  assert(await evaluate(`document.getElementById('packetText').value===''&&document.getElementById('verifyResult').textContent===''`));
 });
 await check('Language change cancels pending organizer verification and clears receipt/result',async()=>{
  await evaluate(`window.__permissionGate=new Promise(resolve=>window.__releasePermission=resolve);`+paste+`document.getElementById('verifyReceipt').click();`);
  await waitFor(`document.getElementById('verifyReceipt').disabled`,'pending verification before language change');
  const reads=await evaluate(`window.__calls.filter(x=>x.method==='claimRecord').length`);
  await evaluate(`document.querySelector('[data-language="${language==='fr'?'en':'fr'}"]').click();window.__releasePermission();window.__permissionGate=null;`);
  await waitFor(`!document.getElementById('verifyReceipt').disabled`,'language-invalidated verifier');
  assert(await evaluate(`document.getElementById('packetText').value===''&&document.getElementById('verifyResult').textContent===''`));
  assert.equal(await evaluate(`window.__calls.filter(x=>x.method==='claimRecord').length`),reads);
  await evaluate(`document.querySelector('[data-language="${language}"]').click();`);
 });
 await check('Organizer errors never echo arbitrary provider text',async()=>{
  await evaluate(`window.__permissionError='FICTITIOUS_MEMBER';`);await verify();
  assert(await evaluate(`!document.getElementById('verifyStatus').textContent.includes('FICTITIOUS_MEMBER')&&document.getElementById('verifyResult').textContent===''`));
  await evaluate(`window.__permissionError=null;`);
 });
 await check('Organizer flow leaves all persistent stores empty and creates no file or log',emptyStores);
 const organizerCalls=await evaluate('JSON.stringify(window.__calls)');
 await check('Both pages keep contact text and private salt out of wallet/RPC calls',async()=>{
  for(const secret of ['PRIVATE FICTIVE MEMBER','private-fixture@example.org',privateSalt])for(const value of [secret,encodeURIComponent(secret),Buffer.from(secret).toString('hex')])assert(!(memberCalls+organizerCalls).includes(value));
 });
 await check('Reloading the organizer page never restores receipt or recipient output',async()=>{
  await verify();const generation=await evaluate('window.__documentGeneration');await command('Page.reload',{ignoreCache:true});
  await waitFor('window.__documentGeneration!=='+JSON.stringify(generation)+'&&document.readyState==="complete"&&!!window.__calls','organizer reload');
  assert(await evaluate(`document.getElementById('packetText').value===''&&document.getElementById('verifyResult').textContent===''`));
 });
 for(const width of [1280,390])await check('Organizer layout '+width+'px fits viewport',async()=>{await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));});
 await check('Neither page sends contact-bearing network requests or form submissions',async()=>{const str=JSON.stringify(network);for(const secret of ['PRIVATE FICTIVE MEMBER','private-fixture@example.org',privateSalt])for(const value of [secret,encodeURIComponent(secret),Buffer.from(secret).toString('hex')])assert(!str.includes(value));assert(!requests.some(r=>r.method==='POST'));});
 await check('No uncaught JS errors',async()=>assert.equal(exceptions.length,0,exceptions.join(';')));
 }
 report.status='PASS';report.passed=report.checks.length;
}catch(e){report.status='FAIL_OR_BLOCKED';report.error=e.message;process.exitCode=1;}
finally{ws?.close();child?.kill();if(server)await new Promise(r=>server.close(r));if(tmp){await sleep(300);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3});}fs.mkdirSync('qualification',{recursive:true});fs.writeFileSync('qualification/browser-privacy.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
