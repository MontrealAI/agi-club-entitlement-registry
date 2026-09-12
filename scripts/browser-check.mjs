/** Genuine built-site asset/demo smoke test via Chrome DevTools. No wallet qualification. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {siteServer} from './serve.mjs';import {sourceDigest} from './source-digest.mjs';
const expectedEthersVersion=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).dependencies.ethers;
const report={status:'NOT_EXECUTED',scope:'HTTP-hosted built site + real ethers; demo, keyboard, responsive layout and automated accessibility checks. NO wallet/mainnet qualification or complete accessibility certification.',checks:[]};let server,child,ws,tmp;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const require=createRequire(import.meta.url),axePackage=require('axe-core/package.json');
 assert.equal(axePackage.version,JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).devDependencies['axe-core']);
 const axeSource=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');report.axeVersion=axePackage.version;
 const candidates=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',`${process.env.PROGRAMFILES||'C:/Program Files'}/Google/Chrome/Application/chrome.exe`].filter(Boolean);
 const chrome=candidates.find(x=>fs.existsSync(x));assert(chrome,'Set CHROME_BIN to a local Chrome/Chromium executable');
 server=siteServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 tmp=fs.mkdtempSync(path.join(os.tmpdir(),'agi-chrome-'));
 child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--remote-allow-origins=http://localhost','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 let start=Date.now();while(!fs.existsSync(path.join(tmp,'DevToolsActivePort'))){assert(Date.now()-start<20000,'Browser did not start');await sleep(100);}
 const port=fs.readFileSync(path.join(tmp,'DevToolsActivePort'),'utf8').split('\n')[0];const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let next=0;const pending=new Map(),exceptions=[];ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const {resolve,reject,timer}=pending.get(m.id);clearTimeout(timer);pending.delete(m.id);m.error?reject(Error(m.error.message)):resolve(m.result);}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 await command('Runtime.enable');await command('Page.enable');
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 const waitFor=async(expression,label)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){try{if(await evaluate(expression))return;}catch(e){if(!/context.*(destroyed|not found)|Cannot find context/i.test(e.message))throw e;}await sleep(50);}throw Error('Browser readiness timeout: '+label);};
 for(const language of ['fr','en'])for(const page of ['index','member','admin','verify','privacy','legal','deployment','etherscan']){
  const url=base+'/'+page+'.html?lang='+language,nav=await command('Page.navigate',{url});assert(!nav.errorText,'Navigation failed: '+nav.errorText);
  await waitFor('location.href==='+JSON.stringify(url)+'&&document.readyState==="complete"',page+' page and modules');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await evaluate('document.activeElement.matches(".skip-link")&&document.activeElement.getBoundingClientRect().top>=0&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2'),'Keyboard skip link must be first and visibly focused: '+page);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert(await evaluate('document.activeElement.id==="main"'),'Skip link must move keyboard focus into content: '+page);
  assert(await evaluate('document.querySelectorAll("main").length===1&&document.querySelectorAll("h1").length===1'),'One main landmark and primary heading: '+page);
  assert(await evaluate('[...document.querySelectorAll("input,select,textarea")].every(el=>el.type==="hidden"||el.labels?.length||el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))'),'Every form control needs an accessible label: '+page);
  report.checks.push({page,language,scope:'Keyboard entry, main landmark and control labels',status:'PASS'});
  if(['member','admin','verify','deployment','etherscan'].includes(page))assert.equal(await evaluate('window.ethers?.version'),expectedEthersVersion,'Genuine ethers asset did not load at the declared version');
  if(page==='etherscan'){
   await waitFor('document.querySelectorAll("#operation option").length===52','all explorer functions');
   await evaluate(`document.getElementById('registry').value='0x'+'11'.repeat(20);document.getElementById('parameter-0').value='FICTITIOUS_BENEFIT';document.getElementById('parameter-1').value='PERK';document.getElementById('parameter-2').value='3';document.getElementById('prepare').click();`);
   assert(await evaluate(`!document.getElementById('result').hidden&&document.querySelector('#values output').textContent===ethers.id('FICTITIOUS_BENEFIT')`),'Explorer prepares genuine Keccak values');
   assert.equal(await evaluate(`document.getElementById('openExplorer').href`),'https://etherscan.io/address/0x'+'11'.repeat(20)+'#writeContract');
   await evaluate(`document.getElementById('parameter-2').dispatchEvent(new Event('input'));`);
   assert(await evaluate(`document.getElementById('result').hidden&&!document.getElementById('openExplorer').hasAttribute('href')`),'Editing invalidates prepared explorer values');
   await evaluate(`document.querySelector('[data-language="en"]').click();`);
   assert(await evaluate(`document.documentElement.lang==='en'&&document.getElementById('prepare').textContent==='Prepare values'&&document.querySelectorAll('#operation option').length===52`),'English explorer parity');
   await evaluate(`document.getElementById('operation').value='claim';document.getElementById('operation').dispatchEvent(new Event('change'));document.getElementById('parameter-0').value='FICTITIOUS_BENEFIT';document.getElementById('parameter-1').value='alice';document.getElementById('prepare').click();`);
   assert(await evaluate(`!document.getElementById('result').hidden&&document.querySelectorAll('#values output')[1].textContent==='alice'`),'Member claim parameters prepared');
   await evaluate(`document.querySelector('[data-language="${language}"]').click();window.dispatchEvent(new Event('pagehide'));`);
   assert(await evaluate(`document.getElementById('registry').value===''&&document.getElementById('result').hidden&&localStorage.length===0&&sessionStorage.length===0`),'Explorer session cleared without persistence');
  }
  assert.equal(await evaluate('document.documentElement.lang'),language,'Document language');
  assert(await evaluate(`[...document.querySelectorAll('a[href]')].filter(el=>/^(?:\\/|[a-z]+\\.html)/.test(el.getAttribute('href'))).every(el=>new URL(el.href).searchParams.get('lang')==='${language}')`),'Internal navigation preserves only the selected language');
  if(page==='legal')assert(await evaluate(`document.querySelector('[data-language-content="${language}"]').hidden===false&&document.querySelector('[data-language-content="${language==='fr'?'en':'fr'}"]').hidden===true`),'Complete legal version follows language');
  if(page==='deployment')assert(await evaluate('document.getElementById("sign").disabled && !document.getElementById("consent").checked'),'Deployment approval must require a reviewed plan and fresh consent');
  if(await evaluate('!!document.getElementById("demo")')){await evaluate('document.getElementById("demo").click()');await waitFor('document.getElementById("demo").getAttribute("aria-busy")!=="true"',page+' demo action');assert(await evaluate('document.body.innerText.toLowerCase().includes("démo") || document.body.innerText.toLowerCase().includes("fictif") || document.body.innerText.toLowerCase().includes("demonstration")'));}
  await evaluate(axeSource);
  for(const width of [1440,768,390,320]){
   await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
   assert(await evaluate('document.documentElement.scrollWidth <= innerWidth+2'),'Horizontal overflow: '+page+' '+width);report.checks.push({page,language,width,scope:'Responsive reflow',status:'PASS'});
   if(width===1440||width===390){
    const a11y=await evaluate('axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","best-practice"]}})');
    const violations=a11y.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));
    report.checks.push({page,language,width,scope:'Automated axe checks',status:violations.length?'FAIL':'PASS',violations,manualReview:a11y.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});
    assert.equal(violations.length,0,'Accessibility violations: '+page+' '+width+' '+JSON.stringify(violations));
   }
  }
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert(await evaluate('getComputedStyle(document.documentElement).scrollBehavior==="auto"&&getComputedStyle(document.querySelector("a")).transitionDuration==="0s"'),'Reduced motion must be honored: '+page);
  await command('Emulation.setEmulatedMedia',{features:[]});
 }
 assert.equal(exceptions.length,0,exceptions.join('; '));report.status='PASS';report.sourceSha256=sourceDigest().sourceSha256;
}catch(e){report.status='FAIL_OR_BLOCKED';report.error=e.message;process.exitCode=1;}
finally{try{ws?.close();}catch{}child?.kill();if(server)await new Promise(r=>server.close(r));if(tmp){await sleep(300);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3});}fs.mkdirSync('qualification',{recursive:true});fs.writeFileSync('qualification/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
