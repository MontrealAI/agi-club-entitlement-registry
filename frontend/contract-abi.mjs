export const MEMBER_ABI = [
 'function VERSION() view returns(string)',
 'function CANONICAL_ENS() view returns(address)',
 'function CANONICAL_WRAPPER() view returns(address)',
 'function CLUB_AGI_ETH_NODE() view returns(bytes32)',
 'function admin() view returns(address)',
 'function entitlementCount() view returns(uint256)',
 'function entitlementIdsPage(uint256,uint256) view returns(bytes32[])',
 'function entitlement(bytes32) view returns(bytes32,bytes32,uint64,uint64,uint64,uint64,uint64,uint8,bool)',
 'function titleFR(bytes32) view returns(string)',
 'function titleEN(bytes32) view returns(string)',
 'function metadataURI(bytes32) view returns(string)',
 'function claimRecord(bytes32,bytes32) view returns(address,uint64,uint64,uint64,uint32,uint8)',
 'function claimability(bytes32,address,string) view returns(uint8,bytes32,address,address,uint8,bool,bool,uint64,uint64,uint64,uint8)',
 'function claim(bytes32,string) returns(bytes32)'
];
