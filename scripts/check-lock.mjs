import fs from 'node:fs';
import assert from 'node:assert/strict';
try{
 const pkg=JSON.parse(fs.readFileSync('package.json')),lock=JSON.parse(fs.readFileSync('package-lock.json'));
 assert(lock.lockfileVersion>=2);assert(lock.packages&&lock.packages['']);
 for(const group of ['dependencies','devDependencies'])for(const[n,v]of Object.entries(pkg[group]||{})){assert.equal(lock.packages[''][group]?.[n],v);assert.equal(lock.packages['node_modules/'+n]?.version,v);}
 for(const[n,p]of Object.entries(lock.packages)){if(!n||p.link||p.inBundle)continue;assert(p.integrity&&/^sha(256|384|512)-/.test(p.integrity),'Missing cryptographic integrity: '+n);assert(p.resolved?.startsWith('https://registry.npmjs.org/'),'Unexpected dependency source: '+n);}
 console.log('Lock structure and top-level versions verified. A clean npm ci and dependency review remain required.');
}catch(e){console.error('LOCK_GATE_BLOCKED: '+e.message+'\nFor a missing lock only: npm run bootstrap:lock, review/commit the generated lock, then run npm ci.');process.exitCode=1;}
