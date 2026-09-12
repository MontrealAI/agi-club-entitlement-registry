/** Authenticate direct creation independently of the deployer's runtime/getter claims. */
import assert from 'node:assert/strict';
const hash=value=>typeof value==='string'&&/^0x[0-9a-f]{64}$/i.test(value)&&!/^0x0{64}$/.test(value);
const address=value=>typeof value==='string'&&/^0x[0-9a-f]{40}$/i.test(value)&&!/^0x0{40}$/.test(value);
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
export async function checkDeploymentOrigin(provider,expected,crypto,finalizedBlockNumber) {
 assert(hash(expected.transactionHash),'A reviewed deployment transaction hash is required');
 assert(hash(expected.creationCodeHash),'A reviewed creation-code hash is required');
 assert(address(expected.registryAddress)&&address(expected.deployer),'Reviewed registry and disposable deployer addresses are required');
 assert(Number.isSafeInteger(finalizedBlockNumber)&&finalizedBlockNumber>=0,'Finalized block number required');
 assert.equal((await provider.getNetwork()).chainId,1n,'Ethereum mainnet chainId required');
 const [tx,receipt]=await Promise.all([provider.getTransaction(expected.transactionHash),provider.getTransactionReceipt(expected.transactionHash)]);
 assert(tx&&receipt,'Reviewed creation transaction is missing, pending or replaced; inspect its nonce and checkpoint');
 assert(same(tx.hash,expected.transactionHash)&&same(receipt.hash,expected.transactionHash),'Creation transaction hash mismatch');
 assert.equal(tx.chainId,1n,'Creation transaction belongs to another chain');
 assert(tx.to===null&&receipt.to===null,'Only direct contract creation is accepted');
 assert.equal(tx.value,0n,'Registry creation must carry zero ETH');
 assert(same(tx.from,expected.deployer)&&same(receipt.from,expected.deployer),'Unexpected creation sender');
 assert(Number.isSafeInteger(tx.nonce)&&tx.nonce>=0,'Invalid creation nonce');
 assert(typeof tx.data==='string'&&/^0x(?:[0-9a-f]{2})+$/i.test(tx.data),'Missing creation bytecode');
 assert(same(crypto.keccak256(tx.data),expected.creationCodeHash),'Creation bytecode differs from the reviewed constructor; matching runtime alone is insufficient');
 assert.equal(receipt.status,1,'Creation transaction failed');
 assert(same(receipt.contractAddress,expected.registryAddress),'Creation receipt identifies another contract');
 assert(same(crypto.getCreateAddress({from:tx.from,nonce:tx.nonce}),expected.registryAddress),'Creation address does not match sender and nonce');
 if(expected.nonce!==undefined)assert.equal(BigInt(tx.nonce),BigInt(expected.nonce),'Creation nonce differs from the reviewed plan');
 if(expected.gasLimit!==undefined){
  assert.equal(tx.type,2,'Reviewed plan requires an EIP-1559 transaction');
  for(const field of ['gasLimit','maxFeePerGas','maxPriorityFeePerGas'])assert.equal(tx[field],BigInt(expected[field]),'Creation '+field+' differs from the reviewed plan');
 }
 assert(Number.isSafeInteger(receipt.blockNumber)&&receipt.blockNumber>=0&&receipt.blockNumber<=finalizedBlockNumber,'Creation is not finalized');
 assert.equal(tx.blockNumber,receipt.blockNumber,'Transaction/receipt block mismatch');
 assert(hash(receipt.blockHash)&&same(tx.blockHash,receipt.blockHash),'Transaction/receipt block hash mismatch');
 const block=await provider.getBlock(receipt.blockNumber);
 assert(block?.number===receipt.blockNumber&&same(block.hash,receipt.blockHash),'Creation block is not canonical');
 assert(Array.isArray(block.transactions)&&block.transactions.some(h=>same(h,expected.transactionHash)),'Canonical creation block does not contain the reviewed transaction');
 return {transactionHash:expected.transactionHash.toLowerCase(),deployer:expected.deployer.toLowerCase(),nonce:String(tx.nonce),creationCodeHash:expected.creationCodeHash.toLowerCase(),blockNumber:receipt.blockNumber,blockHash:receipt.blockHash.toLowerCase(),creationVerified:true};
}
