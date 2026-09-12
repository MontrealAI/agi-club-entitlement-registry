/** Public repository boundaries and preserved on-chain source. Not an audit. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {sha256} from './source-digest.mjs';
const required=['README.md','START_HERE.html','LICENSE','SECURITY.md','PRIVACY.md','CONTRIBUTING.md','package.json','hardhat.config.ts','.github/workflows/bootstrap-lock.yml','.github/workflows/ci.yml','.gitignore','.env.example','contracts/AGIClubEntitlementRegistryMainnet.sol','docs/GITHUB_WEB_UPLOAD.md','docs/HARDHAT_DEPLOYMENT.md','shared/ticket-request.mjs','evidence/PROVENANCE.json'];
for(const f of required)assert(fs.existsSync(f),'Missing '+f);
for(const f of ['worker','frontend/worker','docs/CLOUD_RELAY.md'])assert(!fs.existsSync(f),'Removed backend must not return: '+f);
const exclude=new Set(['.git','node_modules','dist','artifacts','cache','qualification','.local','operations','__pycache__']);const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name),rel=p.replaceAll('\\','/').replace(/^\.\//,'');if(exclude.has(e.name)||rel==='frontend/vendor')continue;assert(!e.isSymbolicLink(),'No release symlinks');if(e.isDirectory())walk(p);else if(!e.name.endsWith('.pyc'))files.push(rel);}}walk('.');
for(const f of files){assert(fs.statSync(f).size<25*1024*1024,'Exceeds GitHub web file size: '+f);assert(!/(^|\/)(\.env|\.dev\.vars)$|\.(pem|key|keystore|eml|mbox|har)$/i.test(f),'Private file in public repository: '+f);}
const prov=JSON.parse(fs.readFileSync('evidence/PROVENANCE.json'));for(const [p,h] of Object.entries(prov.preservedContracts))assert.equal(sha256(fs.readFileSync(p)),h,'Unexpected contract change: '+p);
if(process.argv.includes('--upload')){for(const p of ['node_modules','.env','.local','operations','qualification','private-receipts'])assert(!fs.existsSync(p),'Use a FRESH release extraction for browser upload; exclude '+p);}
console.log(JSON.stringify({status:'PASS',publicSourceFiles:files.length,webUploadBatches:Math.ceil(files.length/100),contractsPreserved:true,backendIncluded:false,scope:'File boundaries, not full semantic security.'}));
