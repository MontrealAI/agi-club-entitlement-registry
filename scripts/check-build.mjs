import fs from 'node:fs';import assert from 'node:assert/strict';import {artifacts} from 'hardhat';import solc from 'solc';import {ethers} from 'ethers';
import {PROD,save} from './runtime.mjs';import {sourceDigest} from './source-digest.mjs';
const r={status:'NOT_EXECUTED',scope:'Compiled production artifact identity and Ethereum size limits; not EVM execution or audit'};
try{
 assert(solc.version().startsWith('0.8.37+'),'Unexpected compiler');
 assert.equal(JSON.parse(fs.readFileSync('node_modules/hardhat/package.json')).version,'3.16.0');
 const a=await artifacts.readArtifact(PROD);assert(/^0x[0-9a-fA-F]+$/.test(a.bytecode));assert(/^0x[0-9a-fA-F]+$/.test(a.deployedBytecode));
 assert((a.abi.find(x=>x.type==='constructor')?.inputs||[]).length===0,'Production constructor must not accept substitute authority inputs');
 const creationBytes=(a.bytecode.length-2)/2,runtimeBytes=(a.deployedBytecode.length-2)/2;
 assert(runtimeBytes<=24576,'Production runtime exceeds EIP-170');assert(creationBytes<=49152,'Creation code exceeds EIP-3860');
 r.status='PASS';r.sourceSha256=sourceDigest().sourceSha256;r.compiler=solc.version();r.hardhat='3.16.0';r.profile='production';r.productionContract=PROD;r.creationBytes=creationBytes;r.runtimeBytes=runtimeBytes;r.creationCodeHash=ethers.keccak256(a.bytecode);r.templateRuntimeCodeHash=ethers.keccak256(a.deployedBytecode);
 r.note='Template runtime includes immutable placeholders. The actual expected production runtime hash comes from the qualified canonical-ENS local fork and is checked after real deployment.';
}catch(e){r.status='FAIL';r.error=e.message;process.exitCode=1;}
finally{save('qualification/compiler-status.json',r);console.log(JSON.stringify(r,null,2));}
