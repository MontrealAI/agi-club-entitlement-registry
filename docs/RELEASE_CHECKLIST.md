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
- [ ] Production constructor and local deployment start with zero benefits; no benefit is created by deployment or prefilled in creation forms.
- [ ] Hosted built assets and privacy instrumentation pass; test-device scope recorded.
- [ ] Canonical ENS mainnet fork passes on representative real memberships.
- [ ] Independent security review findings resolved against the exact bytes.
- [ ] Qualified deployment-specific [legal review](LEGAL_RELEASE_REVIEW.md) completed; actual operator, offer, French/English notices and privacy operations verified and published as required.
- [ ] Actual root/member wallets, intended mobile path and Safe if used are rehearsed.
- [ ] Static no-PII-persistence and commitment-only signing verified on those devices.
- [ ] Private copy/email/chosen fulfillment process staged using fictitious data.
- [ ] Copied email visibly includes the full AGI Club subname; the organizer result shows the same verified identity. Both the current raw JSON and formatted email path are tested, including a misleading heading.
- [ ] Create and update an explicitly approved canary through the actual admin wallet; confirm member catalogue refresh shows the changes without per-benefit website edits in registry mode. No event or quota is assumed for launch.
- [ ] Current root holder explicitly approves exact deployment plan and fee ceiling.
- [ ] Broadcast once; inspect transaction, runtime, admin, finality and explorer verification.
- [ ] Preserve the recovery checkpoint; confirm finalized code and ENS authority through `inspect:mainnet` before retiring the disposable deployer.
- [ ] Publish exact source on Etherscan using the matching verification package; confirm all public Read/Write Contract functions and record a real root-wallet operation following the [Etherscan guide](ETHERSCAN_GUIDE.md). Keep private receipts and contacts off Etherscan.

## 3. Broad member launch

- [ ] One actual approved member completes claim and finality.
- [ ] Receipt signature and exact recipient verified; member confirms deliberate email handoff.
- [ ] Organizer confirms receipt, checks the private fulfillment ledger and fulfills the chosen benefit once.
- [ ] Participant confirms receipt or use of the chosen benefit.
- [ ] Replayed or renewed requests do not get a duplicate allocation.
- [ ] Any old claims/fulfillment records reconciled; support and incident process owned by a named operator.
- [ ] Principal records a separate broad-launch decision.

Local tests cannot self-authorize real-world steps. Evidence presence/hash checks cannot prove an external assertion true. Never fill a NOT_EXECUTED field with PASS just to unblock a script.

## Bilingual interface acceptance

- Check all eight public pages in French and English, including keyboard use, mobile reflow, errors and notices. Automated browser qualification covers both languages.
- Test language changes during actual wallet approval: temporary private data clears and stale requests cannot complete. Reject wallet prompts separately; submitted transactions cannot be cancelled by changing language.
- Publish and verify both benefit titles through the approved administrator. An absent English title falls back to the published French title. No benefit is preconfigured.
- Confirm the copied private email includes the full signed subname and that the fixed bilingual subject/link carries no member data. Preserve the exact signed protocol across languages.
- Independent security and deployment-specific legal review, a pinned real mainnet fork, actual wallet/private-request/fulfillment acceptance and root-holder authorization remain release gates. Translation and passing CI do not clear those gates.

The `fulfillmentStaging` report must cover the selected non-event or event process, including repeated requests, concurrent operators, corrections and revocation. This is a required review, not a renamed historical Eventbrite approval. A benefit may omit the private request in normal use; the shipped private-request code and privacy controls still need acceptance.
