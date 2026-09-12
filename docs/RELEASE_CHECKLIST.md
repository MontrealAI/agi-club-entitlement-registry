# Release decisions — three separate gates

## 1. Source publication

- [ ] Upload clean source with no secrets or member data.
- [ ] Inspect preserved contract provenance and this release's changes.
- [ ] Generate, review and commit a real dependency lock.
- [ ] Keep candidate status visible; no badge claiming mainnet readiness.

## 2. Limited mainnet canary (not broad member launch)

- [ ] Clean npm installation and advisory review pass.
- [ ] Solidity compiles with recorded compiler/profile/hashes and size limits.
- [ ] EVM tests and real ethers request journey pass.
- [ ] Hosted built assets and privacy instrumentation pass; test-device scope recorded.
- [ ] Canonical ENS mainnet fork passes on representative real memberships.
- [ ] Independent security review findings resolved against the exact bytes.
- [ ] Qualified deployment-specific [legal review](LEGAL_RELEASE_REVIEW.md) completed; actual operator, offer, French/English notices and privacy operations verified and published as required.
- [ ] Actual root/member wallets, intended mobile path and Safe if used are rehearsed.
- [ ] Static no-PII-persistence and commitment-only signing verified on those devices.
- [ ] Private copy/email/manual Eventbrite process staged using fictitious data.
- [ ] Current root holder explicitly approves exact deployment plan and fee ceiling.
- [ ] Broadcast once; inspect transaction, runtime, admin, finality and explorer verification.
- [ ] Preserve the recovery checkpoint; confirm finalized code and ENS authority through `inspect:mainnet` before retiring the disposable deployer.
- [ ] Publish exact source on Etherscan using the matching verification package; confirm all public Read/Write Contract functions and record a real root-wallet operation following the [Etherscan guide](ETHERSCAN_GUIDE.md). Keep private receipts and contacts off Etherscan.

## 3. Broad member launch

- [ ] One actual approved member completes claim and finality.
- [ ] Receipt signature and exact recipient verified; member confirms deliberate email handoff.
- [ ] Organizer confirms receipt, checks the private issuance ledger and creates one ticket.
- [ ] Participant confirms Eventbrite receipt and intended event access.
- [ ] Replayed or renewed requests do not get a second ticket.
- [ ] Any old claims/tickets reconciled; support and incident process owned by a named operator.
- [ ] Principal records a separate broad-launch decision.

Local tests cannot self-authorize real-world steps. Evidence presence/hash checks cannot prove an external assertion true. Never fill a NOT_EXECUTED field with PASS just to unblock a script.
