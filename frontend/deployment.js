import { deploymentMessage, validatePlan } from './shared/deployment-policy.mjs';
const $=id=>document.getElementById(id);let plan=null;
$('plan').addEventListener('change',async()=>{plan=null;$('sign').disabled=true;$('consent').checked=false;try{const f=$('plan').files[0];if(!f||f.size>20000)throw Error('Invalid plan file');plan=validatePlan(JSON.parse(await f.text()));$('details').textContent=JSON.stringify(plan,null,2);$('status').textContent='Review every field before signing.';}catch(e){$('details').textContent='';$('status').textContent=e.message;}});
$('consent').addEventListener('change',()=>{$('sign').disabled=!plan||!$('consent').checked;});
$('sign').addEventListener('click',async()=>{
 $('sign').disabled=true;try{
 if(location.protocol!=='https:' && location.hostname!=='localhost' && location.hostname!=='127.0.0.1')throw Error('Use the official HTTPS origin, or a trusted local server.');
 if(!globalThis.ethers||!window.ethereum)throw Error('Open the built site using a compatible wallet-enabled browser');
 const e=globalThis.ethers,p=new e.BrowserProvider(window.ethereum);await p.send('eth_requestAccounts',[]);if((await p.getNetwork()).chainId!==1n)throw Error('Ethereum mainnet required');
 validatePlan(plan);const account=await(await p.getSigner()).getAddress();if(account.toLowerCase()!==plan.admin)throw Error('Connect the exact current root-holder account, not an individual Safe signer');
 const ens=new e.Contract('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',['function owner(bytes32) view returns(address)'],p);let owner=await ens.owner(e.namehash('club.agi.eth'));
 if(owner.toLowerCase()==='0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401'){
 const w=new e.Contract(owner,['function getData(uint256) view returns(address,uint32,uint64)'],p),r=await w.getData(BigInt(e.namehash('club.agi.eth'))),b=await p.getBlock('latest');
 owner=r[0];if(r[2]<BigInt(b.timestamp)&&(r[1]&65536n)!==0n)throw Error('Root ownership expired');}
 if(owner.toLowerCase()!==plan.admin)throw Error('Root holder changed; prepare a new plan');
 const message=deploymentMessage(plan),signature=await(await p.getSigner()).signMessage(message);validatePlan(plan);
 const code=await p.getCode(account);if(code==='0x'){if(e.verifyMessage(message,signature).toLowerCase()!==plan.admin)throw Error('Invalid approval signature');}
 else{const w=new e.Contract(account,['function isValidSignature(bytes32,bytes) view returns(bytes4)'],p);if(await w.isValidSignature(e.hashMessage(message),signature)!=='0x1626ba7e')throw Error('Contract-wallet approval not valid yet');}
 const url=URL.createObjectURL(new Blob([JSON.stringify({plan,message,signature},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='deployment-approval.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 $('status').textContent='Signed approval downloaded. No deployment transaction was sent. This approval expires at '+new Date(plan.expiresAt*1000).toLocaleString();
 }catch(e){$('status').textContent=e.shortMessage||e.message;}finally{$('sign').disabled=!plan||!$('consent').checked;}
});
