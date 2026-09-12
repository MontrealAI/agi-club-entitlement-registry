// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {Pausable} from "../vendor/openzeppelin/utils/Pausable.sol";

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

/// @title AGI Club Entitlement Registry
/// @notice Reusable, auditable entitlement infrastructure for direct *.club.agi.eth memberships.
/// @dev
///  - The administrator is NOT stored in this contract.
///  - Administrative authority always follows the current effective owner of club.agi.eth.
///  - No custody, token transfer, payment, approvals, or personally identifiable information (PII).
///  - One membership identity can activate at most one claim record per entitlement at a time.
contract AGIClubEntitlementRegistry is Pausable {
    string public constant VERSION = "2.1.1";

    /// @notice namehash("club.agi.eth"). This name is the institutional admin authority.
    bytes32 public constant CLUB_AGI_ETH_NODE =
        0x39eb848f88bdfb0a6371096249dd451f56859dfe2cd3ddeab1e26d5bb68ede16;

    uint256 public constant MAX_CANONICAL_NAME_BYTES = 128;

    enum EntitlementState {
        Unset,
        Draft,
        Open,
        Closed,
        Archived
    }

    enum ClaimStatus {
        None,
        Active,
        Revoked
    }

    enum Claimability {
        Claimable,
        RegistryPaused,
        InvalidLabel,
        EntitlementUnknown,
        EntitlementDraft,
        EntitlementClosed,
        EntitlementArchived,
        NotStarted,
        Ended,
        AlreadyClaimed,
        ClaimRevoked,
        MembershipNotFound,
        NotDirectOwner,
        MembershipExpired,
        CapacityFull
    }

    struct Entitlement {
        bytes32 category;
        bytes32 metadataHash;
        uint64 capacity; // 0 = uncapped
        uint64 activeClaims;
        uint64 uniqueClaims;
        uint64 opensAt; // 0 = no lower time bound
        uint64 closesAt; // 0 = no upper time bound
        EntitlementState state;
        bool exists;
    }

    struct ClaimRecord {
        address claimant;
        uint64 firstClaimedAt;
        uint64 lastActivatedAt;
        uint64 revokedAt;
        uint32 revision;
        ClaimStatus status;
    }

    /// @notice Current ENS Registry used for authority and membership resolution.
    address public immutable ensRegistry;
    address public immutable adminNameWrapper;

    /// @notice Explicit wrapper allowlist. Unknown contracts are never treated as wrappers.
    mapping(address wrapper => bool supported) public supportedNameWrapper;
    mapping(address wrapper => bool everConfigured) private _knownWrapper;
    address[] private _wrapperHistory;

    mapping(bytes32 entitlementId => Entitlement) private _entitlements;
    mapping(bytes32 entitlementId => mapping(bytes32 membershipNode => ClaimRecord)) private _claims;
    mapping(bytes32 entitlementId => bytes32[] membershipNodes) private _claimNodes;
    bytes32[] private _entitlementIds;

    error ZeroAddress();
    error InvalidInfrastructure();
    error InvalidBatchSize();
    error InvalidReason();
    event AdministrativeOverrideGranted(bytes32 indexed entitlementId, bytes32 indexed membershipNode, address indexed claimant, bytes32 reasonHash, address admin);
    error InvalidDescriptor();
    error InvalidPageSize();
    mapping(bytes32 => string) public titleFR;
    mapping(bytes32 => string) public titleEN;
    mapping(bytes32 => string) public metadataURI;
    event EntitlementDescriptorSet(bytes32 indexed entitlementId, string titleFR, string titleEN, string metadataURI, bytes32 metadataHash, address indexed admin);
    error AdminUnavailable();
    error NotClubAdmin(address caller, address currentAdmin);
    error InvalidCanonicalName();
    error ZeroEntitlementId();
    error EntitlementAlreadyExists(bytes32 entitlementId);
    error EntitlementDoesNotExist(bytes32 entitlementId);
    error InvalidEntitlementState();
    error InvalidTimeWindow(uint64 opensAt, uint64 closesAt);
    error CapacityBelowActiveClaims(uint64 requested, uint64 activeClaims);
    error ClaimRejected(Claimability reason);
    error ClaimRecordAlreadyExists(bytes32 entitlementId, bytes32 membershipNode);
    error ClaimRecordDoesNotExist(bytes32 entitlementId, bytes32 membershipNode);
    error ClaimNotActive(bytes32 entitlementId, bytes32 membershipNode);
    error ClaimNotRevoked(bytes32 entitlementId, bytes32 membershipNode);
    error CapacityFull(bytes32 entitlementId);
    error MembershipNotFound(bytes32 membershipNode);
    error MembershipExpired(bytes32 membershipNode, uint64 expiry);
    error CannotDisableCurrentAdminWrapper(address wrapper);
    error RegistryChangeRequiresPause();
    error AdminContinuityCheckFailed(address expectedAdmin, address resolvedAdmin);
    error PaymentsNotAccepted();

    event AdminAuthorityObserved(address indexed admin, bool wrapped, bool expiryKnown, uint64 expiry);
    event ENSRegistryChanged(address indexed previousRegistry, address indexed newRegistry, address indexed admin);
    event NameWrapperSupportSet(address indexed wrapper, bool supported, address indexed admin);

    event EntitlementCreated(
        bytes32 indexed entitlementId,
        bytes32 indexed category,
        uint64 capacity,
        uint64 opensAt,
        uint64 closesAt,
        EntitlementState state,
        bytes32 metadataHash,
        address indexed admin
    );
    event EntitlementStateSet(bytes32 indexed entitlementId, EntitlementState previousState, EntitlementState newState, address indexed admin);
    event EntitlementCapacitySet(bytes32 indexed entitlementId, uint64 previousCapacity, uint64 newCapacity, address indexed admin);
    event EntitlementWindowSet(bytes32 indexed entitlementId, uint64 opensAt, uint64 closesAt, address indexed admin);
    event EntitlementCategorySet(bytes32 indexed entitlementId, bytes32 previousCategory, bytes32 newCategory, address indexed admin);
    event EntitlementMetadataHashSet(bytes32 indexed entitlementId, bytes32 previousHash, bytes32 newHash, address indexed admin);

    event EntitlementClaimed(
        bytes32 indexed entitlementId,
        bytes32 indexed membershipNode,
        address indexed claimant,
        bool adminGranted,
        uint32 revision
    );
    event ClaimRevoked(
        bytes32 indexed entitlementId,
        bytes32 indexed membershipNode,
        address indexed claimant,
        bytes32 reasonHash,
        uint32 revision,
        address admin
    );
    event ClaimReinstated(
        bytes32 indexed entitlementId,
        bytes32 indexed membershipNode,
        address indexed claimant,
        uint32 revision,
        address admin
    );
    event ClaimReassigned(
        bytes32 indexed entitlementId,
        bytes32 indexed membershipNode,
        address indexed previousClaimant,
        address newClaimant,
        uint32 revision,
        address admin
    );

    constructor(address ensRegistry_, address[] memory initialNameWrappers) {
        if (ensRegistry_ == address(0) || ensRegistry_.code.length == 0) revert InvalidInfrastructure();
        if (initialNameWrappers.length != 1 || initialNameWrappers[0].code.length == 0) revert InvalidInfrastructure();
        ensRegistry = ensRegistry_;
        adminNameWrapper = initialNameWrappers[0];

        for (uint256 i = 0; i < initialNameWrappers.length; ++i) {
            address wrapper = initialNameWrappers[i];
            if (wrapper == address(0)) revert ZeroAddress();
            _setWrapper(wrapper, true);
        }

        (
            address currentAdmin,
            ,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry
        ) = _adminInfo();
        if (currentAdmin == address(0)) revert AdminUnavailable();
        emit AdminAuthorityObserved(currentAdmin, wrapped, expiryKnown, expiry);
    }

    modifier onlyAdmin() {
        address currentAdmin = admin();
        if (currentAdmin == address(0)) revert AdminUnavailable();
        if (_msgSender() != currentAdmin) revert NotClubAdmin(_msgSender(), currentAdmin);
        _;
    }

    // ---------------------------------------------------------------------
    // Institutional authority: current effective owner of club.agi.eth
    // ---------------------------------------------------------------------

    /// @notice Returns the current effective owner of club.agi.eth.
    /// @dev Authority automatically follows a legitimate ENS transfer/wrapped-owner change.
    function admin() public view returns (address currentAdmin) {
        (address resolvedAdmin, , , , ) = _rootOwner();
        return resolvedAdmin;
    }

    function adminInfo()
        external
        view
        returns (
            address currentAdmin,
            address registryOwner,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry
        )
    {
        return _adminInfo();
    }

    function isAdmin(address account) external view returns (bool) {
        return account != address(0) && account == admin();
    }

    function _adminInfo()
        internal
        view
        returns (
            address currentAdmin,
            address registryOwner,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry
        )
    {
        (currentAdmin, registryOwner, wrapped, expiryKnown, expiry) = _rootOwner();
    }

    // ---------------------------------------------------------------------
    // Admin: entitlement lifecycle
    // ---------------------------------------------------------------------

    /// @notice Creates a future-proof entitlement for an event, briefing, download, NFT benefit, perk, etc.
    /// @param entitlementId keccak256(bytes(canonicalName)).
    /// @param category Arbitrary category identifier, e.g. keccak256("EVENT") or keccak256("DOWNLOAD").
    /// @param capacity Maximum simultaneous active claims; 0 means uncapped.
    /// @param opensAt Earliest self-claim time; 0 means immediately.
    /// @param closesAt Latest self-claim time; 0 means no automatic close.
    /// @param initialState Draft/Open/Closed/Archived. Unset is rejected.
    /// @param metadataHash Optional integrity anchor for off-chain metadata; zero means unspecified.
    function createEntitlement(
        bytes32 entitlementId,
        bytes32 category,
        uint64 capacity,
        uint64 opensAt,
        uint64 closesAt,
        EntitlementState initialState,
        bytes32 metadataHash
    ) public onlyAdmin {
        if (entitlementId == bytes32(0)) revert ZeroEntitlementId();
        if (_entitlements[entitlementId].exists) revert EntitlementAlreadyExists(entitlementId);
        _validateState(initialState);
        _validateWindow(opensAt, closesAt);

        _entitlements[entitlementId] = Entitlement({
            category: category,
            metadataHash: metadataHash,
            capacity: capacity,
            activeClaims: 0,
            uniqueClaims: 0,
            opensAt: opensAt,
            closesAt: closesAt,
            state: initialState,
            exists: true
        });
        _entitlementIds.push(entitlementId);

        emit EntitlementCreated(
            entitlementId,
            category,
            capacity,
            opensAt,
            closesAt,
            initialState,
            metadataHash,
            _msgSender()
        );
    }

    function setEntitlementState(bytes32 entitlementId, EntitlementState newState) external onlyAdmin {
        _validateState(newState);
        Entitlement storage item = _requireEntitlement(entitlementId);
        EntitlementState previous = item.state;
        item.state = newState;
        emit EntitlementStateSet(entitlementId, previous, newState, _msgSender());
    }

    function setCapacity(bytes32 entitlementId, uint64 newCapacity) external onlyAdmin {
        Entitlement storage item = _requireEntitlement(entitlementId);
        if (newCapacity != 0 && newCapacity < item.activeClaims) {
            revert CapacityBelowActiveClaims(newCapacity, item.activeClaims);
        }
        uint64 previous = item.capacity;
        item.capacity = newCapacity;
        emit EntitlementCapacitySet(entitlementId, previous, newCapacity, _msgSender());
    }

    function setWindow(bytes32 entitlementId, uint64 opensAt, uint64 closesAt) external onlyAdmin {
        _validateWindow(opensAt, closesAt);
        Entitlement storage item = _requireEntitlement(entitlementId);
        item.opensAt = opensAt;
        item.closesAt = closesAt;
        emit EntitlementWindowSet(entitlementId, opensAt, closesAt, _msgSender());
    }

    function setCategory(bytes32 entitlementId, bytes32 newCategory) external onlyAdmin {
        Entitlement storage item = _requireEntitlement(entitlementId);
        bytes32 previous = item.category;
        item.category = newCategory;
        emit EntitlementCategorySet(entitlementId, previous, newCategory, _msgSender());
    }

    function setMetadataHash(bytes32 entitlementId, bytes32 newMetadataHash) external onlyAdmin {
        Entitlement storage item = _requireEntitlement(entitlementId);
        bytes32 previous = item.metadataHash;
        item.metadataHash = newMetadataHash;
        emit EntitlementMetadataHashSet(entitlementId, previous, newMetadataHash, _msgSender());
    }

    // ---------------------------------------------------------------------
    // Admin: claim correction / institutional operations
    // ---------------------------------------------------------------------

    /// @notice Administrative grant to the CURRENT valid membership owner.
    /// @dev Intentionally bypasses entitlement Open/time state, but never bypasses capacity.
    function adminGrantClaimToCurrentOwner(bytes32 entitlementId, string calldata label)
        public
        onlyAdmin
        returns (bytes32 node, address claimant)
    {
        _requireEntitlement(entitlementId);
        node = membershipNode(label);
        (address resolvedClaimant, , , , ) = _effectiveOwner(node);
        if (resolvedClaimant == address(0)) revert MembershipNotFound(node);
        claimant = resolvedClaimant;
        _activateFirstClaim(entitlementId, node, claimant, true);
    }

    /// @notice Explicit full-admin override for migrations/corrections.
    /// @dev Does not assert that claimant currently owns the membership. This is intentionally privileged and auditable.
    function adminGrantClaimOverride(bytes32 entitlementId, string calldata label, address claimant, bytes32 reasonHash)
        external
        onlyAdmin
        returns (bytes32 node)
    {
        if (claimant == address(0)) revert ZeroAddress();
        _requireEntitlement(entitlementId);
        node = membershipNode(label);
        if (reasonHash == bytes32(0)) revert InvalidReason();
        _activateFirstClaim(entitlementId, node, claimant, true);
        emit AdministrativeOverrideGranted(entitlementId, node, claimant, reasonHash, _msgSender());
    }

    function revokeClaim(bytes32 entitlementId, string calldata label, bytes32 reasonHash) public onlyAdmin {
        Entitlement storage item = _requireEntitlement(entitlementId);
        bytes32 node = membershipNode(label);
        ClaimRecord storage record = _claims[entitlementId][node];
        if (record.status == ClaimStatus.None) revert ClaimRecordDoesNotExist(entitlementId, node);
        if (record.status != ClaimStatus.Active) revert ClaimNotActive(entitlementId, node);

        record.status = ClaimStatus.Revoked;
        record.revokedAt = uint64(block.timestamp);
        record.revision += 1;
        item.activeClaims -= 1;

        emit ClaimRevoked(
            entitlementId,
            node,
            record.claimant,
            reasonHash,
            record.revision,
            _msgSender()
        );
    }

    function reinstateClaim(bytes32 entitlementId, string calldata label) external onlyAdmin {
        Entitlement storage item = _requireEntitlement(entitlementId);
        bytes32 node = membershipNode(label);
        ClaimRecord storage record = _claims[entitlementId][node];
        if (record.status == ClaimStatus.None) revert ClaimRecordDoesNotExist(entitlementId, node);
        if (record.status != ClaimStatus.Revoked) revert ClaimNotRevoked(entitlementId, node);
        _requireCapacity(entitlementId, item);

        record.status = ClaimStatus.Active;
        record.revokedAt = 0;
        record.lastActivatedAt = uint64(block.timestamp);
        record.revision += 1;
        item.activeClaims += 1;

        emit ClaimReinstated(entitlementId, node, record.claimant, record.revision, _msgSender());
    }

    /// @notice Reassigns a revoked claim record without erasing its public history.
    function reassignRevokedClaim(bytes32 entitlementId, string calldata label, address newClaimant) external onlyAdmin {
        if (newClaimant == address(0)) revert ZeroAddress();
        Entitlement storage item = _requireEntitlement(entitlementId);
        bytes32 node = membershipNode(label);
        ClaimRecord storage record = _claims[entitlementId][node];
        if (record.status == ClaimStatus.None) revert ClaimRecordDoesNotExist(entitlementId, node);
        if (record.status != ClaimStatus.Revoked) revert ClaimNotRevoked(entitlementId, node);
        _requireCapacity(entitlementId, item);

        address previousClaimant = record.claimant;
        record.claimant = newClaimant;
        record.status = ClaimStatus.Active;
        record.revokedAt = 0;
        record.lastActivatedAt = uint64(block.timestamp);
        record.revision += 1;
        item.activeClaims += 1;

        emit ClaimReassigned(
            entitlementId,
            node,
            previousClaimant,
            newClaimant,
            record.revision,
            _msgSender()
        );
    }

    // ---------------------------------------------------------------------
    // Admin: infrastructure / emergency controls
    // ---------------------------------------------------------------------

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    /// @notice Adds/removes a NameWrapper implementation used to resolve effective owners.
    /// @dev The wrapper currently holding club.agi.eth cannot be disabled, preventing accidental admin lockout.
    function setSupportedNameWrapper(address wrapper, bool supported) external onlyAdmin {
        if (wrapper == address(0) || (supported && wrapper.code.length == 0)) revert InvalidInfrastructure();

        address registryOwner = IENSRegistry(ensRegistry).owner(CLUB_AGI_ETH_NODE);
        if (!supported && wrapper == registryOwner) revert CannotDisableCurrentAdminWrapper(wrapper);

        _setWrapper(wrapper, supported);
        emit NameWrapperSupportSet(wrapper, supported, _msgSender());
    }

    // ---------------------------------------------------------------------
    // Member self-claims
    // ---------------------------------------------------------------------

    /// @notice Claims one entitlement for one current direct AGI Club membership.
    function claim(bytes32 entitlementId, string calldata label)
        external
        whenNotPaused
        returns (bytes32 node)
    {
        (
            Claimability status,
            bytes32 membershipNode_,
            address ignoredEffectiveOwner,
            address ignoredExistingClaimant,
            ClaimStatus ignoredClaimStatus,
            bool ignoredWrapped,
            bool ignoredExpiryKnown,
            uint64 ignoredExpiry,
            uint64 ignoredActiveClaims,
            uint64 ignoredCapacity,
            EntitlementState ignoredState
        ) = _claimability(entitlementId, _msgSender(), label);

        ignoredEffectiveOwner; ignoredExistingClaimant; ignoredClaimStatus; ignoredWrapped;
        ignoredExpiryKnown; ignoredExpiry; ignoredActiveClaims; ignoredCapacity; ignoredState;

        if (status != Claimability.Claimable) revert ClaimRejected(status);
        _activateFirstClaim(entitlementId, membershipNode_, _msgSender(), false);
        return membershipNode_;
    }

    /// @notice Full preflight for wallet UX. Ordinary failures return a status rather than reverting.
    function claimability(bytes32 entitlementId, address claimant, string calldata label)
        external
        view
        returns (
            Claimability status,
            bytes32 membershipNode_,
            address effectiveOwner,
            address existingClaimant,
            ClaimStatus existingClaimStatus,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry,
            uint64 activeClaims,
            uint64 capacity,
            EntitlementState state
        )
    {
        return _claimability(entitlementId, claimant, label);
    }

    /// @notice Creates a new DRAFT from policy, without copying claims, dates, titles or metadata.
    function duplicateEntitlement(bytes32 sourceId, bytes32 newId) external onlyAdmin {
        Entitlement memory source = _entitlements[sourceId];
        if (!source.exists) revert EntitlementDoesNotExist(sourceId);
        createEntitlement(newId, source.category, source.capacity, 0, 0, EntitlementState.Draft, bytes32(0));
    }

    /// @notice Public descriptive metadata only. Never store email, ticket numbers, secrets or member identity here.
    function setDescriptor(bytes32 id, string calldata fr, string calldata en, string calldata uri, bytes32 digest) external onlyAdmin {
        Entitlement storage item = _requireEntitlement(id);
        if (bytes(fr).length == 0 || bytes(fr).length > 160 || bytes(en).length > 160 || bytes(uri).length > 512) revert InvalidDescriptor();
        bytes memory u = bytes(uri);
        if (u.length != 0) {
            bool https = u.length >= 8 && u[0]=='h' && u[1]=='t' && u[2]=='t' && u[3]=='p' && u[4]=='s' && u[5]==':' && u[6]=='/' && u[7]=='/';
            bool ipfs = u.length >= 7 && u[0]=='i' && u[1]=='p' && u[2]=='f' && u[3]=='s' && u[4]==':' && u[5]=='/' && u[6]=='/';
            if (!https && !ipfs) revert InvalidDescriptor();
        }
        titleFR[id] = fr;
        titleEN[id] = en;
        metadataURI[id] = uri;
        bytes32 oldHash = item.metadataHash;
        item.metadataHash = digest;
        emit EntitlementMetadataHashSet(id, oldHash, digest, _msgSender());
        emit EntitlementDescriptorSet(id, fr, en, uri, digest, _msgSender());
    }

    /// @notice Atomic batch: any failure reverts the entire batch. Maximum 50 entries.
    function adminGrantBatchToCurrentOwners(bytes32 id, string[] calldata labels) external onlyAdmin {
        if (labels.length == 0 || labels.length > 50) revert InvalidBatchSize();
        for (uint256 i; i < labels.length; ++i) adminGrantClaimToCurrentOwner(id, labels[i]);
    }

    function revokeBatch(bytes32 id, string[] calldata labels, bytes32 reasonHash) external onlyAdmin {
        if (labels.length == 0 || labels.length > 50) revert InvalidBatchSize();
        for (uint256 i; i < labels.length; ++i) revokeClaim(id, labels[i], reasonHash);
    }

    function entitlementIdsPage(uint256 offset, uint256 limit) external view returns (bytes32[] memory out) {
        if (limit == 0 || limit > 100) revert InvalidPageSize();
        uint256 n = _entitlementIds.length;
        if (offset >= n) return new bytes32[](0);
        uint256 count = n - offset < limit ? n - offset : limit;
        out = new bytes32[](count);
        for (uint256 i; i < count; ++i) out[i] = _entitlementIds[offset + i];
    }

    function claimNodesPage(bytes32 id, uint256 offset, uint256 limit) external view returns (bytes32[] memory out) {
        _requireEntitlement(id);
        if (limit == 0 || limit > 100) revert InvalidPageSize();
        uint256 n = _claimNodes[id].length;
        if (offset >= n) return new bytes32[](0);
        uint256 count = n - offset < limit ? n - offset : limit;
        out = new bytes32[](count);
        for (uint256 i; i < count; ++i) out[i] = _claimNodes[id][offset + i];
    }

    // ---------------------------------------------------------------------
    // Read / proof API
    // ---------------------------------------------------------------------

    function entitlement(bytes32 entitlementId)
        external
        view
        returns (
            bytes32 category,
            bytes32 metadataHash,
            uint64 capacity,
            uint64 activeClaims,
            uint64 uniqueClaims,
            uint64 opensAt,
            uint64 closesAt,
            EntitlementState state,
            bool exists
        )
    {
        Entitlement memory item = _entitlements[entitlementId];
        return (
            item.category,
            item.metadataHash,
            item.capacity,
            item.activeClaims,
            item.uniqueClaims,
            item.opensAt,
            item.closesAt,
            item.state,
            item.exists
        );
    }

    function claimRecord(bytes32 entitlementId, bytes32 node)
        external
        view
        returns (
            address claimant,
            uint64 firstClaimedAt,
            uint64 lastActivatedAt,
            uint64 revokedAt,
            uint32 revision,
            ClaimStatus status
        )
    {
        ClaimRecord memory record = _claims[entitlementId][node];
        return (
            record.claimant,
            record.firstClaimedAt,
            record.lastActivatedAt,
            record.revokedAt,
            record.revision,
            record.status
        );
    }

    function hasClaimed(bytes32 entitlementId, bytes32 node) external view returns (bool) {
        return _claims[entitlementId][node].status == ClaimStatus.Active;
    }

    function claimantOf(bytes32 entitlementId, bytes32 node) external view returns (address) {
        ClaimRecord memory record = _claims[entitlementId][node];
        return record.status == ClaimStatus.Active ? record.claimant : address(0);
    }

    function wasEverClaimed(bytes32 entitlementId, bytes32 node) external view returns (bool) {
        return _claims[entitlementId][node].status != ClaimStatus.None;
    }

    function remainingCapacity(bytes32 entitlementId) external view returns (bool capped, uint64 remaining) {
        Entitlement memory item = _entitlements[entitlementId];
        if (!item.exists) revert EntitlementDoesNotExist(entitlementId);
        if (item.capacity == 0) return (false, 0);
        return (true, item.capacity - item.activeClaims);
    }

    function entitlementCount() external view returns (uint256) {
        return _entitlementIds.length;
    }

    function entitlementIdAt(uint256 index) external view returns (bytes32) {
        return _entitlementIds[index];
    }

    function claimNodeCount(bytes32 entitlementId) external view returns (uint256) {
        if (!_entitlements[entitlementId].exists) revert EntitlementDoesNotExist(entitlementId);
        return _claimNodes[entitlementId].length;
    }

    function claimNodeAt(bytes32 entitlementId, uint256 index) external view returns (bytes32) {
        if (!_entitlements[entitlementId].exists) revert EntitlementDoesNotExist(entitlementId);
        return _claimNodes[entitlementId][index];
    }

    function nameWrapperCount() external view returns (uint256) {
        return _wrapperHistory.length;
    }

    function nameWrapperAt(uint256 index) external view returns (address wrapper, bool supported) {
        wrapper = _wrapperHistory[index];
        supported = supportedNameWrapper[wrapper];
    }

    function entitlementId(string calldata canonicalName) external pure returns (bytes32) {
        bytes memory raw = bytes(canonicalName);
        if (raw.length == 0 || raw.length > MAX_CANONICAL_NAME_BYTES) revert InvalidCanonicalName();
        return keccak256(raw);
    }

    function membershipNode(string calldata label) public pure returns (bytes32) {
        _validateLabel(label);
        return keccak256(abi.encodePacked(CLUB_AGI_ETH_NODE, keccak256(bytes(label))));
    }

    function membershipInfo(string calldata label)
        external
        view
        returns (
            bytes32 node,
            address effectiveOwner,
            address registryOwner,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry
        )
    {
        node = membershipNode(label);
        (effectiveOwner, registryOwner, wrapped, expiryKnown, expiry) = _effectiveOwner(node);
    }

    // ---------------------------------------------------------------------
    // Internal claim logic
    // ---------------------------------------------------------------------

    function _claimability(bytes32 entitlementId, address claimant, string calldata label)
        internal
        view
        returns (
            Claimability status,
            bytes32 membershipNode_,
            address effectiveOwner,
            address existingClaimant,
            ClaimStatus existingClaimStatus,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry,
            uint64 activeClaims,
            uint64 capacity,
            EntitlementState state
        )
    {
        Entitlement memory item = _entitlements[entitlementId];
        activeClaims = item.activeClaims;
        capacity = item.capacity;
        state = item.state;

        if (paused()) {
            return (Claimability.RegistryPaused, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (!_isValidLabel(label)) {
            return (Claimability.InvalidLabel, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (!item.exists) {
            return (Claimability.EntitlementUnknown, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (state == EntitlementState.Draft) {
            return (Claimability.EntitlementDraft, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (state == EntitlementState.Closed) {
            return (Claimability.EntitlementClosed, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (state == EntitlementState.Archived) {
            return (Claimability.EntitlementArchived, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (item.opensAt != 0 && block.timestamp < item.opensAt) {
            return (Claimability.NotStarted, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }
        if (item.closesAt != 0 && block.timestamp > item.closesAt) {
            return (Claimability.Ended, bytes32(0), address(0), address(0), ClaimStatus.None, false, false, 0, activeClaims, capacity, state);
        }

        membershipNode_ = keccak256(abi.encodePacked(CLUB_AGI_ETH_NODE, keccak256(bytes(label))));
        ClaimRecord memory record = _claims[entitlementId][membershipNode_];
        existingClaimant = record.claimant;
        existingClaimStatus = record.status;

        if (record.status == ClaimStatus.Active) {
            return (Claimability.AlreadyClaimed, membershipNode_, address(0), existingClaimant, existingClaimStatus, false, false, 0, activeClaims, capacity, state);
        }
        if (record.status == ClaimStatus.Revoked) {
            return (Claimability.ClaimRevoked, membershipNode_, address(0), existingClaimant, existingClaimStatus, false, false, 0, activeClaims, capacity, state);
        }

        (effectiveOwner, , wrapped, expiryKnown, expiry) = _effectiveOwner(membershipNode_);
        if (effectiveOwner == address(0)) {
            return (Claimability.MembershipNotFound, membershipNode_, address(0), address(0), ClaimStatus.None, wrapped, expiryKnown, expiry, activeClaims, capacity, state);
        }
        if (effectiveOwner != claimant) {
            return (Claimability.NotDirectOwner, membershipNode_, effectiveOwner, address(0), ClaimStatus.None, wrapped, expiryKnown, expiry, activeClaims, capacity, state);
        }
        if (capacity != 0 && activeClaims >= capacity) {
            return (Claimability.CapacityFull, membershipNode_, effectiveOwner, address(0), ClaimStatus.None, wrapped, expiryKnown, expiry, activeClaims, capacity, state);
        }

        return (Claimability.Claimable, membershipNode_, effectiveOwner, address(0), ClaimStatus.None, wrapped, expiryKnown, expiry, activeClaims, capacity, state);
    }

    function _activateFirstClaim(bytes32 entitlementId, bytes32 node, address claimant, bool adminGranted) internal {
        Entitlement storage item = _requireEntitlement(entitlementId);
        ClaimRecord storage record = _claims[entitlementId][node];
        if (record.status != ClaimStatus.None) revert ClaimRecordAlreadyExists(entitlementId, node);
        _requireCapacity(entitlementId, item);

        uint64 now_ = uint64(block.timestamp);
        record.claimant = claimant;
        record.firstClaimedAt = now_;
        record.lastActivatedAt = now_;
        record.revokedAt = 0;
        record.revision = 1;
        record.status = ClaimStatus.Active;

        item.activeClaims += 1;
        item.uniqueClaims += 1;
        _claimNodes[entitlementId].push(node);

        emit EntitlementClaimed(entitlementId, node, claimant, adminGranted, 1);
    }

    function _requireCapacity(bytes32 entitlementId, Entitlement storage item) internal view {
        if (item.capacity != 0 && item.activeClaims >= item.capacity) revert CapacityFull(entitlementId);
    }

    // ---------------------------------------------------------------------
    // ENS ownership resolution
    // ---------------------------------------------------------------------

    function _rootOwner() internal view returns (address effectiveOwner, address registryOwner, bool wrapped, bool expiryKnown, uint64 expiry) {
        try IENSRegistry(ensRegistry).owner(CLUB_AGI_ETH_NODE) returns (address value) { registryOwner = value; }
        catch { return (address(0), address(0), false, false, 0); }
        if (registryOwner == address(0)) return (address(0), address(0), false, false, 0);
        if (registryOwner != adminNameWrapper) return (registryOwner, registryOwner, false, false, 0);
        (effectiveOwner, expiryKnown, expiry) = _readWrapper(adminNameWrapper, CLUB_AGI_ETH_NODE);
        if (!expiryKnown) effectiveOwner = address(0);
        return (effectiveOwner, registryOwner, true, expiryKnown, expiry);
    }

    function _effectiveOwner(bytes32 node)
        internal
        view
        returns (
            address effectiveOwner,
            address registryOwner,
            bool wrapped,
            bool expiryKnown,
            uint64 expiry
        )
    {
        try IENSRegistry(ensRegistry).owner(node) returns (address value) { registryOwner = value; }
        catch { return (address(0), address(0), false, false, 0); }
        if (registryOwner == address(0)) return (address(0), address(0), false, false, 0);

        if (!supportedNameWrapper[registryOwner]) {
            if (_knownWrapper[registryOwner]) return (address(0), registryOwner, true, false, 0);
            return (registryOwner, registryOwner, false, false, 0);
        }

        wrapped = true;
        (effectiveOwner, expiryKnown, expiry) = _readWrapper(registryOwner, node);
    }

    function _readWrapper(address wrapper, bytes32 node)
        internal
        view
        returns (address effectiveOwner, bool expiryKnown, uint64 expiry)
    {
        // ENS NameWrapper.getData(uint256) => (address owner, uint32 fuses, uint64 expiry)
        (bool ok, bytes memory data) = wrapper.staticcall(
            abi.encodeWithSignature("getData(uint256)", uint256(node))
        );
        if (ok && data.length == 96) {
            // Do not let a malformed ABI response turn a fail-closed lookup into an ABI revert.
            uint256 ownerWord;
            uint256 fuseWord;
            uint256 expiryWord;
            assembly ("memory-safe") {
                ownerWord := mload(add(data, 32))
                fuseWord := mload(add(data, 64))
                expiryWord := mload(add(data, 96))
            }
            if (ownerWord > type(uint160).max || fuseWord > type(uint32).max || expiryWord > type(uint64).max) {
                return (address(0), false, 0);
            }
            address owner_ = address(uint160(ownerWord));
            uint64 expiry_ = uint64(expiryWord);
            // ENS v1 NameWrapper.getData already filters owner/fuses. Expiry alone is
            // NOT loss of ownership. Non-emancipated names retain their owner even
            // with expiry zero or elapsed. At equality ENS uses '<', not '<='.
            // Applying the same filter also supports explicit raw-data test adapters.
            uint32 parentCannotControl = 1 << 16;
            if (expiry_ < block.timestamp && (uint32(fuseWord) & parentCannotControl) != 0) {
                owner_ = address(0);
            }
            return (owner_, true, expiry_);
        }

        return (address(0), false, 0);
    }

    function _setWrapper(address wrapper, bool supported) internal {
        if (!_knownWrapper[wrapper]) {
            _knownWrapper[wrapper] = true;
            _wrapperHistory.push(wrapper);
        }
        supportedNameWrapper[wrapper] = supported;
    }

    // ---------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------

    function _requireEntitlement(bytes32 entitlementId) internal view returns (Entitlement storage item) {
        item = _entitlements[entitlementId];
        if (!item.exists) revert EntitlementDoesNotExist(entitlementId);
    }

    function _validateState(EntitlementState state) internal pure {
        if (state == EntitlementState.Unset) revert InvalidEntitlementState();
    }

    function _validateWindow(uint64 opensAt, uint64 closesAt) internal pure {
        if (opensAt != 0 && closesAt != 0 && closesAt <= opensAt) {
            revert InvalidTimeWindow(opensAt, closesAt);
        }
    }

    function _validateLabel(string calldata label) internal pure {
        if (!_isValidLabel(label)) revert ClaimRejected(Claimability.InvalidLabel);
    }

    function _isValidLabel(string calldata label) internal pure returns (bool) {
        bytes memory raw = bytes(label);
        uint256 length = raw.length;
        if (length == 0 || length > 63) return false;

        for (uint256 i = 0; i < length; ++i) {
            bytes1 c = raw[i];
            bool alpha = c >= 0x61 && c <= 0x7a; // a-z
            bool digit = c >= 0x30 && c <= 0x39; // 0-9
            bool hyphen = c == 0x2d; // -
            if (!(alpha || digit || hyphen)) return false;
            if ((i == 0 || i == length - 1) && hyphen) return false;
        }
        return true;
    }

    receive() external payable {
        revert PaymentsNotAccepted();
    }
}
