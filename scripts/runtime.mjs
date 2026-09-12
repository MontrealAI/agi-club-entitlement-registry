/** Shared Hardhat helpers. No signing key or funded test wallet is provided. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
export const ENS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
export const WRAPPER = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
export const ROOT = ethers.namehash('club.agi.eth');
export const PROD = 'contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet';
export const CORE = 'contracts/AGIClubEntitlementRegistry.sol:AGIClubEntitlementRegistry';
export const abi = [
 'function admin() view returns(address)', 'function ensRegistry() view returns(address)',
 'function adminNameWrapper() view returns(address)', 'function VERSION() view returns(string)',
 'function CLUB_AGI_ETH_NODE() view returns(bytes32)', 'function paused() view returns(bool)',
 'function entitlementCount() view returns(uint256)'
];
export const save = (file,object) => {fs.mkdirSync(file.slice(0,file.lastIndexOf('/')) || '.',{recursive:true});fs.writeFileSync(file,JSON.stringify(object,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');};
export async function receipt(transaction) {const r=await(await transaction).wait();assert.equal(r?.status,1,'Transaction failed');return r;}
export async function deploy(artifacts,signer,name,args=[]) {
 const a=await artifacts.readArtifact(name); assert(/^0x[0-9a-fA-F]+$/.test(a.bytecode),'Missing compiled artifact');
 const c=await new ethers.ContractFactory(a.abi,a.bytecode,signer).deploy(...args);await c.waitForDeployment();return c;
}
export async function canonicalAdmin(provider,blockTag='latest') {
 const e=new ethers.Contract(ENS,['function owner(bytes32) view returns(address)'],provider);
 const ro=await e.owner(ROOT,{blockTag}); if(ro===ethers.ZeroAddress)throw Error('club.agi.eth has no owner');
 if(ro.toLowerCase()!==WRAPPER.toLowerCase())return ro;
 const w=new ethers.Contract(WRAPPER,['function getData(uint256) view returns(address,uint32,uint64)'],provider);
 const [owner,fuses,expiry]=await w.getData(BigInt(ROOT),{blockTag}); const block=await provider.getBlock(blockTag);
 assert(block,'Block unavailable');
 if(owner===ethers.ZeroAddress || (expiry<BigInt(block.timestamp) && (fuses&65536n)!==0n))throw Error('Root wrapped ownership unavailable');
 return owner;
}
export async function checkProduction(provider,address,expectedAdmin,expectedHash,blockTag='latest') {
 assert.equal((await provider.getNetwork()).chainId,1n,'Ethereum mainnet chainId required');
 const code=await provider.getCode(address,blockTag); assert(code!=='0x','No deployed code'); const runtimeCodeHash=ethers.keccak256(code);
 if(expectedHash)assert.equal(runtimeCodeHash.toLowerCase(),expectedHash.toLowerCase(),'Runtime bytecode mismatch');
 const c=new ethers.Contract(address,abi,provider);
 const at={blockTag};
 assert.equal(await c.VERSION(at),'2.1.1'); assert.equal(await c.CLUB_AGI_ETH_NODE(at),ROOT);
 assert.equal((await c.ensRegistry(at)).toLowerCase(),ENS.toLowerCase());
 assert.equal((await c.adminNameWrapper(at)).toLowerCase(),WRAPPER.toLowerCase());
 const admin=await c.admin(at);assert.equal(admin.toLowerCase(),(await canonicalAdmin(provider,blockTag)).toLowerCase());
 if(expectedAdmin)assert.equal(admin.toLowerCase(),ethers.getAddress(expectedAdmin).toLowerCase(),'Unexpected root administrator');
 return {address:ethers.getAddress(address),chainId:1,runtimeCodeHash,admin,contractVersion:'2.1.1',root:ROOT,ens:ENS,wrapper:WRAPPER};
}
