import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {siteServer} from '../scripts/serve.mjs';

async function fixture(t) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agi-preview-'));
 const root=path.join(dir,'site'),outside=path.join(dir,'site-private');
 fs.mkdirSync(path.join(root,'assets'),{recursive:true});
 fs.mkdirSync(outside);
 fs.writeFileSync(path.join(root,'ASSET_MANIFEST.json'),'{}');
 fs.writeFileSync(path.join(root,'index.html'),'<p>Public fixture</p>');
 fs.writeFileSync(path.join(root,'assets','app.mjs'),'export const fixture=true;');
 fs.writeFileSync(path.join(outside,'fixture.txt'),'FICTITIOUS OUTSIDE FILE');
 const server=siteServer(root);
 t.after(async()=>{
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  fs.rmSync(dir,{recursive:true,force:true});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const request=(pathname,method='GET')=>new Promise((resolve,reject)=>{
  http.request({host:'127.0.0.1',port:server.address().port,path:pathname,method,agent:false},response=>{
   let body='';
   response.setEncoding('utf8').on('data',chunk=>body+=chunk);
   response.on('error',reject).on('end',()=>resolve({status:response.statusCode,headers:response.headers,body}));
  }).on('error',reject).end();
 });
 return {root,outside,request};
}

test('Preview serves public assets and HEAD responses with browser security headers',async t=>{
 const {request}=await fixture(t);
 const page=await request('/?preview=1');
 assert.equal(page.status,200);
 assert.equal(page.body,'<p>Public fixture</p>');
 assert.equal(page.headers['content-type'],'text/html; charset=utf-8');
 assert.equal(page.headers['cache-control'],'no-store');
 assert.equal(page.headers['x-content-type-options'],'nosniff');
 assert.equal(page.headers['referrer-policy'],'no-referrer');
 const script=await request('/assets/app.mjs');
 assert.equal(script.status,200);
 assert.equal(script.body,'export const fixture=true;');
 assert.equal(script.headers['content-type'],'text/javascript; charset=utf-8');
 const head=await request('/assets/app.mjs','HEAD');
 assert.equal(head.status,200);
 assert.equal(head.body,'');
});

test('Preview rejects unsupported methods, directories, missing files and traversal',async t=>{
 const {request}=await fixture(t);
 const post=await request('/','POST');
 assert.equal(post.status,405);
 for(const pathname of ['/assets','/missing','/../site-private/fixture.txt','/..%2fsite-private%2ffixture.txt','/%2e%2e%5csite-private%5cfixture.txt']) {
  const result=await request(pathname);
  assert.equal(result.status,404,pathname);
  assert(!result.body.includes('FICTITIOUS OUTSIDE FILE'));
 }
 assert.equal((await request('/%ZZ')).status,400);
});

test('Preview rejects files reached through a symlinked directory outside the public root',async t=>{
 const {root,outside,request}=await fixture(t);
 // Directory junctions exercise the same escape on Windows without symlink privileges.
 fs.symlinkSync(outside,path.join(root,'linked'),process.platform==='win32'?'junction':'dir');
 for(const method of ['GET','HEAD']) {
  const result=await request('/linked/fixture.txt',method);
  assert.equal(result.status,404);
  assert(!result.body.includes('FICTITIOUS OUTSIDE FILE'));
 }
});

test('Preview rejects nested symlink escapes with encoded path components',async t=>{
 const {root,outside,request}=await fixture(t);
 fs.symlinkSync(outside,path.join(root,'assets','linked'),process.platform==='win32'?'junction':'dir');
 const result=await request('/assets/%6cinked/fixture.txt');
 assert.equal(result.status,404);
 assert(!result.body.includes('FICTITIOUS OUTSIDE FILE'));
 assert.equal((await request('/assets/app.mjs')).status,200);
});

for(const partial of [false,true]) {
 test('Preview survives an asset stream error '+(partial?'after':'before')+' response bytes',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agi-preview-stream-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.writeFileSync(path.join(dir,'ASSET_MANIFEST.json'),'{}');
  fs.writeFileSync(path.join(dir,'index.html'),'Public fixture');
  const source=`
   import assert from 'node:assert/strict';
   import fs from 'node:fs';
   import {Readable} from 'node:stream';
   import {siteServer} from ${JSON.stringify(new URL('../scripts/serve.mjs',import.meta.url).href)};
   const original=fs.createReadStream;
   let fail=true;
   fs.createReadStream=(...args)=>{
    if(!fail)return original(...args);
    fail=false;
    return new Readable({read(){
     this._read=()=>{};
     ${partial?"this.push('Partial public fixture');":''}
     setImmediate(()=>this.destroy(Error('Simulated private filesystem error detail')));
    }});
   };
   const server=siteServer(process.argv[1]);
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   try {
    const url='http://127.0.0.1:'+server.address().port;
    ${partial?"await assert.rejects(async()=>{const response=await fetch(url);await response.text();});":"const failed=await fetch(url);assert.equal(failed.status,500);assert(!(await failed.text()).includes('private filesystem'));"}
    const healthy=await fetch(url);
    assert.equal(healthy.status,200);
    assert.equal(await healthy.text(),'Public fixture');
   } finally {
    await new Promise(resolve=>server.close(resolve));
   }
  `;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',source,dir],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.error?.message);
 });
}
