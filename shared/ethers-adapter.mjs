/** The single production Ethereum adapter. Do not replace with test adapters in production. */
const ABI = [
 'function VERSION() view returns(string)',
 'function CANONICAL_ENS() view returns(address)',
 'function CANONICAL_WRAPPER() view returns(address)',
 'function CLUB_AGI_ETH_NODE() view returns(bytes32)',
 'function claimRecord(bytes32,bytes32) view returns(address,uint64,uint64,uint64,uint32,uint8)'
];
export function createEthersIO(ethers, provider, registryAddress) {
  const registry = new ethers.Contract(registryAddress,ABI,provider);
  return {
    crypto:{id:ethers.id,namehash:ethers.namehash},
    async chainId() { return (await provider.getNetwork()).chainId; },
    async block(tag) { const b=await provider.getBlock(tag); return b ? {number:b.number,hash:b.hash.toLowerCase()} : null; },
    async registry(blockTag) {
      const o={blockTag};
      const [version,ens,wrapper,root,code]=await Promise.all([registry.VERSION(o),registry.CANONICAL_ENS(o),registry.CANONICAL_WRAPPER(o),registry.CLUB_AGI_ETH_NODE(o),provider.getCode(registryAddress,blockTag)]);
      return {version,ens,wrapper,root,codeHash:ethers.keccak256(code)};
    },
    async claim(p,blockTag) { const r=await registry.claimRecord(p.entitlementId,p.membershipNode,{blockTag}); return {claimant:r[0],revision:Number(r[4]),status:Number(r[5])}; },
    async validSignature(claimant,message,signature,blockTag) {
      try {
        const code=await provider.getCode(claimant,blockTag);
        if(code==='0x') return ethers.verifyMessage(message,signature).toLowerCase()===claimant.toLowerCase();
        const wallet=new ethers.Contract(claimant,['function isValidSignature(bytes32,bytes) view returns(bytes4)'],provider);
        return await wallet.isValidSignature(ethers.hashMessage(message),signature,{blockTag})==='0x1626ba7e';
      } catch { return false; }
    }
  };
}
