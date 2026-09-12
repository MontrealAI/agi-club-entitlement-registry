/** Persistent local rehearsal only. Requires `npm run node` in another terminal. */
import { network, artifacts } from 'hardhat';
import { ethers } from 'ethers';
import assert from 'node:assert/strict';
import { ROOT, CORE, deploy, receipt, save } from './runtime.mjs';
const connection=await network.create();const provider=new ethers.BrowserProvider(connection.provider);provider.pollingInterval=100;
try {
 assert.equal(connection.networkName,'localhost','Use --network localhost only');
 assert.equal((await provider.getNetwork()).chainId,31337n,'Refuse a public network');
 const [deployer,admin,member]=await Promise.all([0,1,2].map(i=>provider.getSigner(i)));
 const ens=await deploy(artifacts,deployer,'QualificationENS'),wrapper=await deploy(artifacts,deployer,'QualificationWrapper');
 await receipt(ens.setOwner(ROOT,await admin.getAddress()));
 await receipt(ens.setOwner(ethers.namehash('demo.club.agi.eth'),await member.getAddress()));
 const registry=await deploy(artifacts,deployer,CORE,[await ens.getAddress(),[await wrapper.getAddress()]]);
 const id=ethers.id('LOCAL_DEMO_ONLY');await receipt(registry.connect(admin).createEntitlement(id,ethers.id('EVENT'),50,0,0,2,ethers.ZeroHash));
 await receipt(registry.connect(member).claim(id,'demo'));
 const out={scope:'LOCAL_TEST_ONLY_NOT_A_MEMBERSHIP_OR_TICKET',chainId:31337,registry:await registry.getAddress(),admin:await registry.admin(),member:await member.getAddress(),entitlementId:id,claimed:await registry.hasClaimed(id,ethers.namehash('demo.club.agi.eth'))};
 save('.local/local-rehearsal.json',out);console.log(out);
 console.log('Core deployment and claim are local only. The production member page intentionally rejects this network.');
} finally {provider.destroy();await connection.close();}
