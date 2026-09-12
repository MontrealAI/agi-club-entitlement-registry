// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @dev TEST ONLY. Anyone can alter records. Never deploy as authority infrastructure.
contract QualificationENS {
    mapping(bytes32 => address) private owners;
    bool public unavailable;
    function owner(bytes32 node) external view returns (address) { require(!unavailable, "MOCK_RPC_FAILURE"); return owners[node]; }
    function setOwner(bytes32 node, address who) external { owners[node] = who; }
    function setUnavailable(bool value) external { unavailable = value; }
}
/// @dev Raw-data fixture deliberately leaves expiry filtering to the consumer.
contract QualificationWrapper {
    struct Data { address who; uint32 fuses; uint64 expiry; }
    mapping(uint256 => Data) private records;
    uint8 public responseMode;
    function setData(uint256 id, address who, uint64 expiry) external { records[id] = Data(who, 0, expiry); }
    function setDataFull(uint256 id, address who, uint32 fuses, uint64 expiry) external { records[id] = Data(who, fuses, expiry); }
    function setResponseMode(uint8 value) external { responseMode = value; }
    function getData(uint256 id) external view returns (address, uint32, uint64) {
        require(responseMode != 1, "MOCK_WRAPPER_FAILURE");
        if (responseMode == 2) { assembly ("memory-safe") { mstore(0, 1) return(0, 32) } }
        if (responseMode == 3) { assembly ("memory-safe") { mstore(0, not(0)) mstore(32, 0) mstore(64, 0) return(0, 96) } }
        Data memory d = records[id]; return (d.who, d.fuses, d.expiry);
    }
}
/// @dev Filtered-data fixture mirroring the ENS v1 owner/fuse expiry distinction.
contract QualificationFilteredWrapper {
    struct Data { address who; uint32 fuses; uint64 expiry; }
    mapping(uint256 => Data) private records;
    function setDataFull(uint256 id, address who, uint32 fuses, uint64 expiry) external { records[id] = Data(who,fuses,expiry); }
    function getData(uint256 id) external view returns (address who, uint32 fuses, uint64 expiry) {
        Data memory d=records[id];who=d.who;fuses=d.fuses;expiry=d.expiry;
        if(expiry<block.timestamp){if((fuses & (1<<16))!=0)who=address(0);fuses=0;}
    }
}
/// @dev TEST ONLY minimal contract-wallet caller and ERC1271 fixture. Not Safe.
contract QualificationWallet {
    address public signer;
    bool public signaturesEnabled=true;
    constructor(address signer_) { signer=signer_; }
    function setSignaturesEnabled(bool value) external { require(msg.sender==signer);signaturesEnabled=value; }
    function execute(address target,bytes calldata data) external returns(bytes memory) {
        require(msg.sender==signer);
        (bool ok,bytes memory out)=target.call(data);
        if(!ok){assembly ("memory-safe") { revert(add(out,32),mload(out)) }}
        return out;
    }
    function isValidSignature(bytes32 digest,bytes calldata signature) external view returns(bytes4) {
        if(!signaturesEnabled||signature.length!=65)return 0xffffffff;
        bytes32 r;bytes32 s;uint8 v;
        assembly ("memory-safe") {r:=calldataload(signature.offset) s:=calldataload(add(signature.offset,32)) v:=byte(0,calldataload(add(signature.offset,64)))}
        return ecrecover(digest,v,r,s)==signer ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}
