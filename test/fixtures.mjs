import {id,namehash,signMessage,verifyMessage,walletAddress} from './crypto-reference.mjs';
import {REGISTRY_VERSION,ENS,WRAPPER,ROOT,preparePacket} from '../shared/ticket-request.mjs';
export const NOW=1789156800;
export async function fixture(){
 const policy={origin:'https://claims.example.org',chainId:1,registry:'0x'+'11'.repeat(20),registryCodeHash:'0x'+'22'.repeat(32),version:REGISTRY_VERSION,entitlements:[id('FICTITIOUS_TEST_BENEFIT')]};
 const scope={origin:policy.origin,chainId:1,registry:policy.registry,entitlementId:policy.entitlements[0],membershipLabel:'alice',membershipNode:namehash('alice.club.agi.eth'),claimant:walletAddress(1n),claimRevision:1,issuedAt:NOW-10,expiresAt:NOW+3600,nonce:'0x'+'ab'.repeat(16)};
 const u=await preparePacket(scope,{name:'Alice Exemple',email:'alice@example.org'}),p=u.payload;
 const state={finalized:{number:100,hash:'0x'+'aa'.repeat(32)},latest:{number:104,hash:'0x'+'bb'.repeat(32)},claimF:{claimant:p.claimant,revision:1,status:1},claimL:{claimant:p.claimant,revision:1,status:1},chain:1n,identity:{version:REGISTRY_VERSION,ens:ENS,wrapper:WRAPPER,root:ROOT,codeHash:policy.registryCodeHash},signaturePolicy:null};
 const calls=[];
 const io={crypto:{id,namehash},chainId:async()=>state.chain,block:async tag=>tag==='finalized'||tag===100?{...state.finalized}:{...state.latest},registry:async()=>({...state.identity}),claim:async(q,n)=>{calls.push({method:'claim',q,n});return {...state[n===100?'claimF':'claimL']};},validSignature:async(w,m,s,n)=>{calls.push({method:'signature',w,m,s,n});if(state.signaturePolicy)return state.signaturePolicy(w,m,s,n);try{return verifyMessage(m,s)===w;}catch{return false;}}};
 return {policy,packet:{...u,signature:signMessage(u.message)},state,io,calls};
}
