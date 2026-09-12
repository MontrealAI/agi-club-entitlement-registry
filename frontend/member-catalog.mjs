const fail=()=>{throw Error('CATALOG_UNAVAILABLE');};
const validId=id=>typeof id==='string'&&/^0x[0-9a-fA-F]{64}$/.test(id)&&!/^0x0{64}$/.test(id);
export function requestPolicy(cfg,ethers,version) {
  return {origin:cfg.expectedOrigin,chainId:1,registry:String(cfg.registryAddress).toLowerCase(),registryCodeHash:cfg.registryCodeHash,version,
    entitlementMode:cfg.entitlementMode??'allowlist',entitlements:(cfg.allowedEntitlements||[]).map(x=>x.startsWith('0x')?x.toLowerCase():ethers.id(x))};
}
// The caller verifies the exact registry identity first. Pages are bounded;
// only a complete page is returned, so a failed request cannot skip entries.
export async function readCatalogPage(registry,cfg,ethers,offset=0,limit=25) {
  try {
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>25)fail();
  const mode=cfg.entitlementMode??'allowlist';
  let ids,total;
  if(mode==='registry') {
    if((cfg.allowedEntitlements||[]).length)fail();
    const count=BigInt(await registry.entitlementCount());
    if(count<0n||count>BigInt(Number.MAX_SAFE_INTEGER))fail();
    total=Number(count);
    ids=offset<total?await registry.entitlementIdsPage(offset,Math.min(limit,total-offset)):[];
  }else if(mode==='allowlist') {
    if(!Array.isArray(cfg.allowedEntitlements))fail();
    const allowed=cfg.allowedEntitlements.map(x=>x.startsWith('0x')?x.toLowerCase():ethers.id(x));
    if(new Set(allowed).size!==allowed.length)fail();
    total=allowed.length;ids=allowed.slice(offset,offset+limit);
  }else fail();
  if(!Array.isArray(ids)||ids.length!==Math.min(limit,Math.max(0,total-offset))||ids.some(id=>!validId(id))||new Set(ids).size!==ids.length)fail();
  const rows=await Promise.all(ids.map(async id=>{
    const [e,title]=await Promise.all([registry.entitlement(id),registry.titleFR(id)]);
    if(e[8]!==true||![1,2,3,4].includes(Number(e[7]))||typeof title!=='string')fail();
    return {id:id.toLowerCase(),title,state:Number(e[7])};
  }));
  return {rows,total,next:offset+rows.length};
  }catch{fail();}
}
