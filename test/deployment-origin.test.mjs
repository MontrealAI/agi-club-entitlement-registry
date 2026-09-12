import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeploymentOrigin} from '../scripts/deployment-origin.mjs';
import {keccak} from './crypto-reference.mjs';
const hash=n=>'0x'+n.repeat(64),address=n=>'0x'+n.repeat(40);
function fixture(){
 const expected={transactionHash:hash('1'),creationCodeHash:keccak(Buffer.from('6000','hex')),registryAddress:address('2'),deployer:address('3'),nonce:'0',gasLimit:'100000',maxFeePerGas:'5',maxPriorityFeePerGas:'1'};
 const tx={hash:expected.transactionHash,chainId:1n,from:expected.deployer,to:null,value:0n,nonce:0,data:'0x6000',type:2,gasLimit:100000n,maxFeePerGas:5n,maxPriorityFeePerGas:1n,blockNumber:100,blockHash:hash('4')};
 const receipt={hash:tx.hash,from:tx.from,to:null,status:1,contractAddress:expected.registryAddress,blockNumber:100,blockHash:hash('4')};
 const block={number:100,hash:hash('4'),transactions:[tx.hash]};
 const provider={getNetwork:async()=>({chainId:1n}),getTransaction:async()=>tx,getTransactionReceipt:async()=>receipt,getBlock:async()=>block};
 // Address derivation is a test boundary here; the EVM journey uses genuine ethers.
 const crypto={keccak256:bytes=>keccak(Buffer.from(bytes.slice(2),'hex')),getCreateAddress:({from,nonce})=>from===address('3')&&nonce===0?address('2'):address('9')};
 return {expected,tx,receipt,block,provider,crypto,run:()=>checkDeploymentOrigin(provider,expected,crypto,104)};
}
test('A finalized exact creation is verified independently of runtime getters',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.creationVerified,true);assert.equal(r.transactionHash,f.expected.transactionHash);assert.equal(r.blockHash,f.block.hash);
});
for(const [name,change] of [
 ['missing reviewed hash',f=>{delete f.expected.transactionHash;}],
 ['zero reviewed hash',f=>{f.expected.transactionHash=hash('0');}],
 ['missing creation hash',f=>{delete f.expected.creationCodeHash;}],
 ['missing deployer',f=>{delete f.expected.deployer;}],
 ['pending transaction',f=>{f.provider.getTransactionReceipt=async()=>null;}],
 ['replacement transaction',f=>{f.tx.hash=hash('5');}],
 ['wrong receipt hash',f=>{f.receipt.hash=hash('5');}],
 ['wrong chain',f=>{f.tx.chainId=31337n;}],
 ['factory call',f=>{f.tx.to=address('5');}],
 ['receipt recipient',f=>{f.receipt.to=address('5');}],
 ['unexpected ETH value',f=>{f.tx.value=1n;}],
 ['wrong sender',f=>{f.tx.from=address('5');}],
 ['wrong receipt sender',f=>{f.receipt.from=address('5');}],
 ['unsafe nonce',f=>{f.tx.nonce=Number.MAX_SAFE_INTEGER+1;}],
 ['different constructor',f=>{f.tx.data='0x6001600055';}],
 ['constructor arguments appended',f=>{f.tx.data+='00';}],
 ['missing creation data',f=>{f.tx.data='0x';}],
 ['failed transaction',f=>{f.receipt.status=0;}],
 ['wrong contract address',f=>{f.receipt.contractAddress=address('5');}],
 ['wrong predicted address',f=>{f.crypto.getCreateAddress=()=>address('5');}],
 ['wrong reviewed nonce',f=>{f.expected.nonce='1';}],
 ['wrong transaction type',f=>{f.tx.type=0;}],
 ['wrong gas limit',f=>{f.tx.gasLimit++;}],
 ['wrong fee ceiling',f=>{f.tx.maxFeePerGas++;}],
 ['wrong priority fee',f=>{f.tx.maxPriorityFeePerGas++;}],
 ['unfinalized creation',f=>{f.receipt.blockNumber=105;}],
 ['inconsistent transaction block',f=>{f.tx.blockNumber=101;}],
 ['inconsistent transaction block hash',f=>{f.tx.blockHash=hash('5');}],
 ['missing canonical block',f=>{f.provider.getBlock=async()=>null;}],
 ['reorganized creation block',f=>{f.block.hash=hash('5');}],
 ['creation omitted from block',f=>{f.block.transactions=[];}],
])test('Creation inspection refuses '+name,async()=>{const f=fixture();change(f);await assert.rejects(f.run);});
