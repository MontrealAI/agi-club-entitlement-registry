# Changelog

## 2.4.0-rc.3 — Compromised deployer

- Preserve the production constructor and ENS authority model: deployment grants no role, recovery path or initial benefit. Exercise every privileged function against a hostile deployer, including root rotation and ENS failure.
- Authenticate the exact finalized creation transaction in post-deployment inspection. Runtime identity alone could accept a different constructor with unauthorized initial storage. Bind sender, nonce, creation bytes, receipt/address and canonical inclusion to independent reviewed records; enforce transaction type and fee bounds when the reviewed plan is present.
- Preserve prior inspection reports and mark new attempts incomplete before checking. Document independent recovery, compromised-key funding exposure and indirect ENS/Safe permission exclusions in English and French.
- Contract 2.1.1, private request /4, empty-deployment plan /2 and the blank initial catalogue remain unchanged. This candidate supplies no live mainnet permission audit or deployment authorization.

## 2.4.0-rc.2 — Immutable scope and empty deployment

- Qualify practical allocation models against the unchanged production constructor: capacity reuse, curated grants, recurring IDs, bundles, reservations, access semantics, descriptor edits, transfers, migration and mined atomic batch rollback. Document native rules and permanent limits in English and French before deployment.
- Require explicit EMPTY_REGISTRY_ONLY deployment evidence and plan /2. Keep security/legal, wallet/privacy and real-fork requirements. Move chosen-benefit legal/fulfillment evidence to a separately scoped launch:gate, with no automatic launch authority. An undecided first benefit no longer prevents reviewed empty deployment.
- Let members read public benefit instructions, capacity and claim windows at one observed block before supplying a membership label or contacts. External documents are never fetched automatically; stale wallet/selection/language responses are discarded.
- Regenerate old /1 deployment plans and approvals; use I_APPROVE_THIS_EMPTY_REGISTRY for the one-time broadcaster. Contract 2.1.1 and entitlement-request /4 are unchanged.

## 2.4.0-rc.1 — General entitlements

- Keep the preserved 2.1.1 contract, canonical ENS authority and empty initial catalogue.
- Replace ticket-specific requests with `AGIClubEntitlementRequest/4`, including independently optional name/email fields and a generic fulfillment result. Old ticket signatures require a fresh request for the same claim.
- Rename the shared request module and CLI to `entitlement-request.mjs` and `verify_entitlement_request.mjs`; `npm run verify:request` remains the operator command.
- Generalize English/French member, administrator, verifier, legal/privacy and deployment copy. Document resources, access, services, reservations, priority, perks, periodic allocations and bundles.
- Require provider-neutral `fulfillmentStaging` evidence without weakening security, legal, wallet, privacy or fork gates.
- Add optional-contact, legacy-signature, non-event EVM journey and bilingual browser privacy regressions.

## 2.3.0-rc.1 — Static Privacy Edition

- Preserve contract 2.1.1 and ENS-rooted administrative architecture byte-for-byte.
- Remove Worker, D1 database, automatic sending and private receipt-download UI.
- Replace raw-contact signed payload with /3 salted recipient commitment.
- Keep name/email/salt in volatile page state; explicit acknowledgement for clipboard handoff.
- Keep mailto body empty and free of member contacts.
- Separate private operator verifier, default-redacted CLI and manual issuance responsibilities.
- Invalidate prepared requests on edits/account changes and clear contacts on lifecycle/idle events.
- Add static-privacy regressions and explicitly scoped browser rehearsal; update Hardhat journey.
- Rewrite upload/deployment guides and prevent stale relay qualification from satisfying new gates.

This is not a deployment, external audit, guaranteed anonymity or retroactive change to deployed contracts. See actual evidence for executed versus blocked checks.
