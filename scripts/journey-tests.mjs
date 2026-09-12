/** Real local EVM + genuine ethers. Static-only recipient commitment; no email or Eventbrite. */
import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {network,artifacts} from 'hardhat';import {ethers} from 'ethers';
import {ENS,WRAPPER,ROOT,PROD,deploy,receipt,save,checkProduction} from './runtime.mjs';import {sourceDigest} from './source-digest.mjs';
import {SCHEMA,REGISTRY_VERSION,requestMessage,preparePacket,verifyTicketRequest} from '../shared/ticket-request.mjs';
import {createEthersIO} from '../shared/ethers-adapter.mjs';
import {revertData} from '../test/revert-data.mjs';
const r={status:'NOT_EXECUTED',scope:'ISOLATED EVM MODEL, genuine ethers signatures/adapter, WebCrypto salted recipient binding, no mail backend; NO real ENS, wallets, provider email or Eventbrite',results:[]};let connection,provider;
try {
 connection=await network.create();assert.equal(connection.networkName,'isolatedMainnetModel');
 const raw=connection.provider;await raw.request({method:'hardhat_metadata',params:[]});
 // Read each newly mined local block instead of reusing ethers' short-lived cache.
 provider=new ethers.BrowserProvider(raw,undefined,{cacheTimeout:-1});provider.pollingInterval=10;assert.equal((await provider.getNetwork()).chainId,1n);
 const[deployer,admin,member,attacker]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
 const ensMock=await deploy(artifacts,deployer,'QualificationENS'),wrapperMock=await deploy(artifacts,deployer,'QualificationWrapper');
 await raw.request({method:'hardhat_setCode',params:[ENS,await provider.getCode(await ensMock.getAddress())]});
 await raw.request({method:'hardhat_setCode',params:[WRAPPER,await provider.getCode(await wrapperMock.getAddress())]});
 const ens=new ethers.Contract(ENS,(await artifacts.readArtifact('QualificationENS')).abi,deployer);
 await receipt(ens.setOwner(ROOT,await admin.getAddress()));await receipt(ens.setOwner(ethers.namehash('demo.club.agi.eth'),await member.getAddress()));
 const c=await deploy(artifacts,deployer,PROD);const id=ethers.id('LOCAL_JOURNEY_ONLY');await receipt(c.connect(admin).createEntitlement(id,ethers.id('TEST'),50,0,0,2,ethers.ZeroHash));const claimTx=await c.connect(member).claim(id,'demo'),claimReceipt=await receipt(claimTx);
 const policy={origin:'https://claims.example.org',chainId:1,registry:(await c.getAddress()).toLowerCase(),registryCodeHash:ethers.keccak256(await provider.getCode(await c.getAddress())),version:REGISTRY_VERSION,entitlements:[id]},now=Math.floor(Date.now()/1000);
 const payload={schema:SCHEMA,origin:policy.origin,chainId:1,registry:policy.registry,entitlementId:id,membershipLabel:'demo',membershipNode:ethers.namehash('demo.club.agi.eth'),claimant:(await member.getAddress()).toLowerCase(),claimRevision:1,issuedAt:now,expiresAt:now+3600,nonce:'0x'+randomBytes(16).toString('hex')};
 const prepared=await preparePacket(payload,{name:'Membre Fictif',email:'member@example.org'}),message=prepared.message,packet={...prepared,signature:await member.signMessage(message)},io=createEthersIO(ethers,provider,policy.registry);
 async function check(name,fn){await fn();r.results.push({name,status:'PASS'});}
 await check('Full local claim and real ethers receipt verification without a new transaction',async()=>{const block=await provider.getBlockNumber();assert.equal((await verifyTicketRequest(packet,policy,io)).status,'VERIFIED_REQUEST_NOT_A_TICKET');assert.equal(await provider.getBlockNumber(),block);});
 await check('Actual claim calldata and logs contain public entitlement evidence, never recipient fields',async()=>{
  const tx=await provider.getTransaction(claimTx.hash),decoded=c.interface.parseTransaction(tx);
  assert.equal(decoded.signature,'claim(bytes32,string)');assert.deepEqual(Array.from(decoded.args),[id,'demo']);
  const encoded=JSON.stringify({data:tx.data,logs:claimReceipt.logs.map(log=>({data:log.data,topics:log.topics}))}).toLowerCase();
  for(const value of [packet.recipient.name,packet.recipient.email,packet.recipient.salt]){
   assert(!encoded.includes(value.toLowerCase()));assert(!encoded.includes(Buffer.from(value).toString('hex')));
  }
 });
 for(const [field,value]of [['email','intruder@example.org'],['name','Other'],['claimRevision',2],['registry','0x'+'12'.repeat(20)],['origin','https://evil.example.org']])await check('Unsigned '+field+' tampering rejected',async()=>{const p=structuredClone(packet);if(field==='name'||field==='email')p.recipient[field]=value;else p.payload[field]=value;await assert.rejects(()=>verifyTicketRequest(p,policy,io));});
 await check('Wrong EOA signature rejected even with intact payload',async()=>{const p={...packet,signature:await attacker.signMessage(message)};await assert.rejects(()=>verifyTicketRequest(p,policy,io),e=>e.code==='INVALID_SIGNATURE');});
 await check('Actual deployed ERC-1271 fixture accepts signer, then revocation rejects it',async()=>{
  const w=await deploy(artifacts,deployer,'QualificationWallet',[await member.getAddress()]),node=ethers.namehash('contractdemo.club.agi.eth');await receipt(ens.setOwner(node,await w.getAddress()));
  await receipt(w.connect(member).execute(await c.getAddress(),c.interface.encodeFunctionData('claim',[id,'contractdemo'])));
  const p={...payload,membershipLabel:'contractdemo',membershipNode:node,claimant:(await w.getAddress()).toLowerCase(),nonce:'0x'+randomBytes(16).toString('hex')},up=await preparePacket(p,{name:'Contract Wallet Test',email:'contract@example.org'}),m=up.message,pk={...up,signature:await member.signMessage(m)};
  assert.equal((await verifyTicketRequest(pk,policy,io)).status,'VERIFIED_REQUEST_NOT_A_TICKET');
  await receipt(w.connect(member).setSignaturesEnabled(false));await assert.rejects(()=>verifyTicketRequest(pk,policy,io),e=>e.code==='INVALID_SIGNATURE');
 });
 await check('Actual claim revocation blocks already signed packet',async()=>{await receipt(c.connect(admin).revokeClaim(id,'demo',ethers.id('LOCAL_TEST')));await assert.rejects(()=>verifyTicketRequest(packet,policy,io),e=>e.code==='CLAIM_NOT_CURRENT');});
 await check('Production constructor gives the designated ENS holder all administration and the disposable deployer none',async()=>{
  // This address is the operator's expected initial admin. Only the LOCAL ENS model is modified here.
  // This proves contract behavior, not live ENS ownership or real wallet control.
  const expected='0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201';
  await receipt(ens.setOwner(ROOT,expected));
  const registry=await deploy(artifacts,deployer,PROD),deployerAddress=await deployer.getAddress();
  assert.notEqual(deployerAddress,expected);assert.equal(await registry.admin(),expected);
  assert.equal(await registry.isAdmin(expected),true);assert.equal(await registry.isAdmin(deployerAddress),false);
  const observed=(await registry.deploymentTransaction().wait()).logs.map(log=>{try{return registry.interface.parseLog(log);}catch{return null;}}).find(log=>log?.name==='AdminAuthorityObserved');
  assert.equal(observed?.args[0],expected);
  await assert.rejects(()=>registry.connect(deployer).pause.staticCall(),error=>registry.interface.parseError(revertData(error))?.name==='NotClubAdmin');
  await raw.request({method:'hardhat_impersonateAccount',params:[expected]});
  try {
   await raw.request({method:'hardhat_setBalance',params:[expected,ethers.toQuantity(ethers.parseEther('1'))]});
   const holder=new ethers.JsonRpcSigner(provider,expected);await receipt(registry.connect(holder).pause());assert.equal(await registry.paused(),true);
   await receipt(ens.setOwner(ROOT,await admin.getAddress()));
   await assert.rejects(()=>registry.connect(holder).unpause.staticCall(),error=>registry.interface.parseError(revertData(error))?.name==='NotClubAdmin');
   await receipt(registry.connect(admin).unpause());assert.equal(await registry.paused(),false);
   assert.equal(await registry.isAdmin(deployerAddress),false);
  } finally {await raw.request({method:'hardhat_stopImpersonatingAccount',params:[expected]});}
 });
 await check('Locally signed creation has its recovery hash before submission and pins real ethers identity reads',async()=>{
  // Random test key and funds exist only in this asserted local EVM model.
  const disposable=new ethers.Wallet(ethers.hexlify(randomBytes(32))),from=await disposable.getAddress();
  await raw.request({method:'hardhat_setBalance',params:[from,ethers.toQuantity(ethers.parseEther('1'))]});
  const data=(await artifacts.readArtifact(PROD)).bytecode,request={type:2,chainId:1,nonce:0,data,value:0,gasLimit:6000000n,maxFeePerGas:10000000000n,maxPriorityFeePerGas:1000000000n};
  const signed=await disposable.signTransaction(request),hash=ethers.keccak256(signed),parsed=ethers.Transaction.from(signed);
  assert.equal(parsed.hash,hash);assert.equal(parsed.from,from);assert.equal(parsed.to,null);assert.equal(parsed.data,data);
  const sent=await provider.broadcastTransaction(signed);assert.equal(sent.hash,hash);
  const mined=await receipt(sent);assert.equal(mined.contractAddress,ethers.getCreateAddress({from,nonce:0}));
  await checkProduction(provider,mined.contractAddress,await admin.getAddress(),policy.registryCodeHash,mined.blockNumber);
 });
 r.status='PASS';r.passed=r.results.length;r.sourceSha256=sourceDigest().sourceSha256;r.ticketIssued=false;r.externalEmailSent=false;
} catch(e){r.status='FAIL_OR_BLOCKED';r.error=e.shortMessage||e.message;process.exitCode=1;}
finally{save('qualification/local-journey.json',r);console.log(JSON.stringify(r,null,2));provider?.destroy();if(connection)await connection.close();}
