/** Genuine built-site asset/demo smoke test via Chrome DevTools. No wallet qualification. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
import {siteServer} from './serve.mjs';import {sourceDigest} from './source-digest.mjs';
const expectedEthersVersion=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).dependencies.ethers;
const report={status:'NOT_EXECUTED',scope:'HTTP-hosted built site + real ethers; demo and layout only, NO wallet/network/production claims',checks:[]};let server,child,ws,tmp;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
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
 for(const page of ['index','member','admin','verify','privacy']){
  const url=base+'/'+page+'.html',nav=await command('Page.navigate',{url});assert(!nav.errorText,'Navigation failed: '+nav.errorText);
  await waitFor('location.href==='+JSON.stringify(url)+'&&document.readyState==="complete"',page+' page and modules');
  if(['member','admin','verify'].includes(page))assert.equal(await evaluate('window.ethers?.version'),expectedEthersVersion,'Genuine ethers asset did not load at the declared version');
  if(await evaluate('!!document.getElementById("demo")')){await evaluate('document.getElementById("demo").click()');await waitFor('document.getElementById("demo").getAttribute("aria-busy")!=="true"',page+' demo action');assert(await evaluate('document.body.innerText.toLowerCase().includes("démo") || document.body.innerText.toLowerCase().includes("fictif")'));}
  for(const width of [1280,390]){await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');assert(await evaluate('document.documentElement.scrollWidth <= innerWidth+2'),'Horizontal overflow: '+page+' '+width);report.checks.push({page,width,status:'PASS'});}
 }
 assert.equal(exceptions.length,0,exceptions.join('; '));report.status='PASS';report.sourceSha256=sourceDigest().sourceSha256;
}catch(e){report.status='FAIL_OR_BLOCKED';report.error=e.message;process.exitCode=1;}
finally{try{ws?.close();}catch{}child?.kill();if(server)await new Promise(r=>server.close(r));if(tmp){await sleep(300);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3});}fs.mkdirSync('qualification',{recursive:true});fs.writeFileSync('qualification/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
