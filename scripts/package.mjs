/** Produce only deployable public assets. Never substitute a crypto stub. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url)),report={version:'2.3.0-rc.1',status:'NOT_EXECUTED',at:new Date().toISOString(),realDependencyRequired:'ethers@6.15.0'};
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(path.join(root,'qualification'),{recursive:true});
try{
 const require=createRequire(import.meta.url);let dir=path.dirname(require.resolve('ethers'));
 while(!fs.existsSync(path.join(dir,'package.json'))) {const up=path.dirname(dir);if(up===dir)throw Error('ETHERS_PACKAGE_NOT_FOUND');dir=up;}
 let pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
 while(pkg.name!=='ethers'){dir=path.dirname(dir);if(dir===path.dirname(dir))throw Error('ETHERS_PACKAGE_NOT_FOUND');if(fs.existsSync(path.join(dir,'package.json')))pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));}
 if(pkg.version!=='6.15.0')throw Error('UNEXPECTED_ETHERS_VERSION');
 const lib=path.join(dir,'dist','ethers.umd.min.js'),lic=path.join(dir,'LICENSE.md');
 if(!fs.existsSync(lib)||!fs.existsSync(lic))throw Error('ETHERS_DISTRIBUTION_INCOMPLETE');
 const target=path.join(root,'frontend','vendor');fs.mkdirSync(target,{recursive:true});
 fs.copyFileSync(lib,path.join(target,'ethers.umd.min.js'));fs.copyFileSync(lic,path.join(target,'ETHERS_LICENSE.md'));
 fs.mkdirSync(path.join(root,'frontend','shared'),{recursive:true});
 for(const f of ['ticket-request.mjs','ethers-adapter.mjs','deployment-policy.mjs'])fs.copyFileSync(path.join(root,'shared',f),path.join(root,'frontend','shared',f));
 const site=path.join(root,'dist','site');fs.rmSync(site,{recursive:true,force:true});fs.mkdirSync(site,{recursive:true});
 const allow=['index.html','admin.html','member.html','style.css','config.js','app.js','deployment.html','deployment.js','member.js','verify.html','verify.js','privacy.html','private-memory.mjs','contract-abi.mjs','_headers'];
 for(const f of allow){if(!fs.existsSync(path.join(root,'frontend',f)))throw Error('PUBLIC_ASSET_MISSING:'+f);fs.copyFileSync(path.join(root,'frontend',f),path.join(site,f));}
 for(const [d,names] of [['shared',['ticket-request.mjs','ethers-adapter.mjs','deployment-policy.mjs']],['vendor',['ethers.umd.min.js','ETHERS_LICENSE.md']]]){fs.mkdirSync(path.join(site,d),{recursive:true});for(const name of names){const src=path.join(root,'frontend',d,name);if(fs.lstatSync(src).isSymbolicLink())throw Error('SYMLINK_IN_PUBLIC_SOURCE');fs.copyFileSync(src,path.join(site,d,name));}}
 const files=[];function walk(d){for(const x of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,x.name);if(x.isSymbolicLink())throw Error('SYMLINK_IN_PUBLIC_SITE');if(x.isDirectory())walk(p);else files.push(p);}}walk(site);
 for(const f of files.filter(x=>x.endsWith('.html'))){const text=fs.readFileSync(f,'utf8');if(text.includes('src="app.js"')&&!/<script[^>]*type="module"[^>]*src="app.js"/.test(text))throw Error('APP_MODULE_TYPE_MISSING');for(const m of text.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)){const url=m[1];if(/^(https?:|mailto:|data:)/.test(url))continue;const local=path.resolve(path.dirname(f),url.split('?')[0]);if(!local.startsWith(site+path.sep)||!fs.existsSync(local))throw Error('BROKEN_PUBLIC_LINK:'+path.relative(site,f)+':'+url);}}
 report.status='PASS';report.scope='Real ethers copied from reviewed npm installation; public asset references checked; NOT a wallet/browser execution test';report.assets=files.map(f=>({path:path.relative(site,f).split(path.sep).join('/'),sha256:sha(fs.readFileSync(f))}));
 fs.writeFileSync(path.join(site,'ASSET_MANIFEST.json'),JSON.stringify(report,null,2));console.log('Public site built at dist/site. Live configuration/qualification still required.');
}catch(e){report.status=e.code==='MODULE_NOT_FOUND'?'BLOCKED_DEPENDENCY_UNAVAILABLE':'FAIL';report.error=e.code==='MODULE_NOT_FOUND'?'ethers@6.15.0 not installed':e.message;process.exitCode=1;console.error(report.error);}
finally{fs.writeFileSync(path.join(root,'qualification','asset-build.json'),JSON.stringify(report,null,2));}
