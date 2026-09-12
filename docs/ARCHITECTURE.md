# Architecture and invariants

## On-chain, preserved from 2.1.1

`AGIClubEntitlementRegistryMainnet` fixes canonical mainnet ENS authority sources and rejects non-mainnet chain IDs. The deployer is not an administrator. The current effective `club.agi.eth` owner controls the existing management API. The core constructor is dependency-injected only for tests.

Claims are keyed by entitlement and ENS membership node. A transfer does not reset consumption. Administrative override/corrections have explicit events/revisions; history is not deleted. Capacity counts active claims, not external fulfillment records. The Solidity code is non-upgradeable and exposes no payment/transfer/approval flow for this application.

New benefits and categories reuse this registry. Public metadata does not itself provide an encrypted download, NFT distribution, or ticket. Such fulfilment must be supplied separately and qualified.

## Off-chain, replaced in this release

No Worker, database, automatic mail, telemetry or private download route is included. Browser and CLI use one canonical `/4` receipt protocol. Browser contacts remain in volatile fields/references until user-directed handoff.

The recipient commitment is `SHA256(UTF8(JSON.stringify([schema + '/recipient', random32ByteSalt, name, email])))`. The signed canonical message contains the commitment, official HTTPS origin, chain 1, approved registry, entitlement, membership node, claimant, claim revision, times and nonce. The private packet adds the recipient and salt. The wallet sees no plaintext name/email. The chain IO adapter never receives the recipient object.

Verification compares finalized and latest observed registry/code/claim state, verifies EOA or deployed ERC-1271 signatures against both states and rereads block hashes. It is a point-in-time read dependent on RPC truth/availability. Reverify immediately before issuance; a race with a later administrative revocation is not impossible.

## Trusted components

The root-name holder, verified contract/ENS implementations, approved static source/dependencies, wallet/device and organizer fulfilment process remain trust boundaries. A modified frontend cannot alter on-chain permissions, but CAN attempt to steal form data or request malicious signatures. Do not call the frontend “untrusted” in the sense that its integrity is irrelevant.

## Privacy vs automation

Removing the database removes that custody layer. It also removes a shared mail queue, delivery status and automatic fulfillment deduplication. Manual reconciliation is an intentional responsibility, not something the static page secretly solves.

## Versioning

Repository 2.4.0-rc.2; contract 2.1.1; request /4. Earlier /3 and /2.x requests are incompatible and must be regenerated from an existing valid claim. No new on-chain claim is required merely to update the receipt format.

Both contact fields are independently optional in `/4`; empty strings mean not supplied and remain commitment-bound. `VERIFIED_REQUEST_NOT_FULFILLED` and `fulfillmentConfirmed: false` never assert delivery, access or mailbox control. Deploy the new member and verifier assets together; no silent legacy ticket-receipt conversion is supported.
