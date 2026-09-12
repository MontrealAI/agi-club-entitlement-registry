import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {spawnSync} from 'node:child_process';
import {validOrigin,validatePolicy,REGISTRY_VERSION} from '../shared/ticket-request.mjs';
import {id} from './crypto-reference.mjs';
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
test('Each interactive HTML entrypoint loads its owned code as a module',()=>{for(const [f,js]of [['admin','app'],['member','member'],['verify','verify'],['deployment','deployment']])assert.match(fs.readFileSync(`frontend/${f}.html`,'utf8'),new RegExp('<script[^>]*type="module"[^>]*src="'+js+'.js"'));});
test('Browser verifier source byte-identical to canonical source',()=>{for(const f of ['ticket-request.mjs','ethers-adapter.mjs','request-email.mjs'])assert.equal(fs.readFileSync('shared/'+f,'utf8'),fs.readFileSync('frontend/shared/'+f,'utf8'));});
test('Member, operator and CLI use the same canonical protocol and production adapter',()=>{for(const f of ['frontend/member.js','frontend/verify.js','tools/verify_ticket_request.mjs']){const src=fs.readFileSync(f,'utf8');assert.match(src,/import[^\n]*verifyTicketRequest[^\n]*ticket-request\.mjs/);assert.match(src,/import[^\n]*createEthersIO[^\n]*ethers-adapter\.mjs/);}});
test('Configurator writes only trusted public settings, no request endpoint',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agi-config-'));try{const out=path.join(dir,'config.js');const r=spawnSync(python,['scripts/configure.py','--contract','0x'+'11'.repeat(20),'--runtime-code-hash','0x'+'22'.repeat(32),'--origin','https://claims.example.org','--entitlement','IA101_2026_09_22','--output',out],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const ctx={window:{}};vm.runInNewContext(fs.readFileSync(out,'utf8'),ctx);const c=ctx.window.AGI_CONFIG;assert.equal(c.registryCodeHash,'0x'+'22'.repeat(32));assert.equal(c.chainId,1);assert.equal(c.expectedOrigin,'https://claims.example.org');assert(!Object.hasOwn(c,'requestEndpoint'));}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('Configurator rejects incomplete, insecure or backend-enabled configuration',()=>{const args=['scripts/configure.py','--contract','0x'+'11'.repeat(20),'--entitlement','IA101_2026_09_22'];for(const more of [['--origin','https://claims.example.org'],['--runtime-code-hash','0x'+'22'.repeat(32),'--origin','http://claims.example.org'],['--runtime-code-hash','0x'+'22'.repeat(32),'--origin','https://claims.example.org/path'],['--runtime-code-hash','0x'+'22'.repeat(32),'--origin','https://claims.example.org','--request-endpoint','https://relay.example.org/request']])assert.notEqual(spawnSync(python,[...args,...more],{encoding:'utf8'}).status,0);});

test('Public build copies only named shared/vendor assets, never whole directories',()=>{const s=fs.readFileSync('scripts/package.mjs','utf8');assert(!s.includes('cpSync'));assert(s.includes("['ticket-request.mjs','ethers-adapter.mjs','deployment-policy.mjs','request-email.mjs']"));assert(s.includes("['ethers.umd.min.js','ETHERS_LICENSE.md']"));});

function configure(t,origin,entitlements=['IA101_2026_09_22']) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agi-config-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const output=path.join(dir,'config.js'),previous='// Existing reviewed configuration.\n';
 fs.writeFileSync(output,previous);
 // Invoke from outside the repository to exercise path-independent validation.
 const result=spawnSync(python,[path.resolve('scripts/configure.py'),'--contract','0x'+'aB'.repeat(20),'--runtime-code-hash','0x'+'cD'.repeat(32),'--origin',origin,...entitlements.flatMap(x=>['--entitlement',x]),'--output',output],{cwd:dir,encoding:'utf8'});
 return {...result,source:fs.readFileSync(output,'utf8'),previous};
}
function configuredPolicy(source) {
 const context={window:{}};
 vm.runInNewContext(source,context);
 const config=JSON.parse(JSON.stringify(context.window.AGI_CONFIG));
 validatePolicy({origin:config.expectedOrigin,chainId:config.chainId,registry:config.registryAddress,registryCodeHash:config.registryCodeHash,version:REGISTRY_VERSION,entitlementMode:config.entitlementMode,entitlements:config.allowedEntitlements.map(x=>x.startsWith('0x')?x:id(x))});
 return config;
}
test('Configurator without event arguments follows the empty admin-managed registry',t=>{
 const result=configure(t,'https://claims.example.org',[]);assert.equal(result.status,0,result.stderr);
 const config=configuredPolicy(result.source);assert.equal(config.entitlementMode,'registry');assert.deepEqual(config.allowedEntitlements,[]);assert(!Object.hasOwn(config,'defaultEntitlement'));
});
for(const origin of ['https://claims.example.org','https://claims.example.org:8443','https://127.0.0.1:8443','https://[2001:db8::1]:8443','https://xn--bcher-kva.example']) {
 test('Configurator emits a usable receipt policy for '+origin,t=>{
  const result=configure(t,origin);
  assert.equal(result.status,0,result.stderr);
  const config=configuredPolicy(result.source);
  assert.equal(config.expectedOrigin,origin);
  assert.equal(config.registryAddress,'0x'+'ab'.repeat(20));
  assert.equal(config.registryCodeHash,'0x'+'cd'.repeat(32));
 });
}
test('Configurator normalizes hexadecimal entitlement IDs without changing canonical keys',t=>{
 const ids=['0x'+'aB'.repeat(32),'IA101_2026_09_22','0x'+'CD'.repeat(32)];
 const result=configure(t,'https://claims.example.org',ids);
 assert.equal(result.status,0,result.stderr);
 const config=configuredPolicy(result.source);
 assert.deepEqual(config.allowedEntitlements,[ids[0].toLowerCase(),ids[1],ids[2].toLowerCase()]);
 assert(!Object.hasOwn(config,'defaultEntitlement'));assert.equal(config.entitlementMode,'allowlist');
});
for(const origin of ['https://CLAIMS.example.org','HTTPS://claims.example.org','https://claims.example.org:443','https://claims.example.org:','https://claims.example.org:99999','https://claims.example.org?','https://claims.example.org#','https://claims.example.org\\','https://claims.example.org\n','https://claims.\texample.org','https://claims example.org','https://bücher.example','https://[2001:0db8::1]','https://127.1','https://0x7f000001','https://@claims.example.org']) {
 test('Configurator rejects a noncanonical origin without overwriting config: '+JSON.stringify(origin),t=>{
  assert.equal(validOrigin(origin),false);
  const result=configure(t,origin);
  assert.notEqual(result.status,0,'Accepted an origin rejected by the receipt protocol');
  assert.match(result.stderr,/Exact HTTPS origin required/);
  assert.equal(result.source,result.previous);
 });
}
