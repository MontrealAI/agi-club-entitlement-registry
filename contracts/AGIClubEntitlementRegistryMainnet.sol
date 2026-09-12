// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;
import {AGIClubEntitlementRegistry} from "./AGIClubEntitlementRegistry.sol";

/// @notice Production deployment. Canonical Ethereum Mainnet ENS sources are fixed, not admin-selectable.
contract AGIClubEntitlementRegistryMainnet is AGIClubEntitlementRegistry {
    address public constant CANONICAL_ENS = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    address public constant CANONICAL_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
    error EthereumMainnetRequired();
    constructor() AGIClubEntitlementRegistry(CANONICAL_ENS, _wrappers()) {
        if (block.chainid != 1) revert EthereumMainnetRequired();
    }
    function _wrappers() private pure returns (address[] memory out) {
        out = new address[](1);
        out[0] = CANONICAL_WRAPPER;
    }
}
