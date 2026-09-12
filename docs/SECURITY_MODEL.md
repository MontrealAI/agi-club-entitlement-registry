# Security review scope

This is a candidate, not an independent audit. Start with immutable source hashes in `evidence/PROVENANCE.json` and the actual delivery status.

## Assets and boundaries

- Root authority: current effective `club.agi.eth` holder and its parent/wrapper dependencies.
- Claim integrity: entitlement+membership uniqueness, capacity, windows, administrative history.
- Recipient binding: private /4 receipt, salted commitment, scope, expiry and revision.
- Contact privacy: volatile page state, no automatic transport, explicit clipboard handoff.
- Fulfilment: private organizer register and chosen external fulfillment process.

## Compromised disposable deployer

Assume the deployment private key is known to an attacker. The genuine production constructor accepts no owner argument, creates no benefit and assigns no deployer role. All 18 privileged functions resolve the current effective `club.agi.eth` holder on each call. Root transfer removes the former holder's authority; unavailable root resolution fails closed. There is no deployer recovery, upgrade, withdrawal or handover path. A deployer that independently owns a valid membership has only the same member claim rights as any other holder.

Keep the deployer outside the entire authority chain: no ENS operator/token approvals, parent-name control, Safe ownership/modules or access to a root signing key. `isAdmin(deployer) = false` proves no direct registry administration at the observed state; it does not audit indirect ENS or smart-wallet permissions. Never make the compromised address the root holder. The contract follows ENS if the real authority holder later makes that transfer. Review these external permissions independently.

A leaked deployment key can spend its ETH, consume its nonce, cancel/replace a pending transaction or deploy arbitrary code. The root-signed deployment plan constrains this repository's broadcaster, not an attacker bypassing that software. Limit funding to the approved gas budget and treat those funds as exposed. No deployment-helper signature can protect a compromised account's balance.

Before accepting the address, run `inspect:mainnet` from a trusted independent checkout/device and provider, using the reviewed plan and preserved broadcast checkpoint (or independently reviewed recovery records). It checks the actual creation transaction, sender, nonce, zero value, exact creation-code hash, successful receipt, derived address and canonical finalized inclusion. With a plan, transaction type and gas/fee bounds must also match. It then checks runtime, immutable getters and ENS authority at finalized and latest blocks and rechecks all block hashes. Identical runtime alone is insufficient: a different constructor can seed unauthorized initial storage while returning the genuine runtime. Etherscan source verification and `admin()` alone do not establish reviewed initialization.

`npm run test:deployer` uses the real production constructor and fictitious ENS infrastructure in an isolated local EVM. It sends a mined unauthorized transaction to every privileged ABI function, checks unchanged state and empty reverted logs, exercises root rotation/failure, and deploys a counterfeit constructor to prove the creation check rejects matching runtime with different initialization. This is local adversarial evidence, not a live permission audit or mainnet clearance.

## Required adversarial checks

Unauthorized admin; root transfer; owner versus resolver; wrapping/unwrapping/fuses and exact expiry boundary; unavailable/malformed wrapper; duplicate/transfer-based claim; batch failure atomicity; quota accounting; pause behavior; override events; stale/revoked/reassigned receipt; substituted email/name/salt/message; wrong registry/domain/network; replay; EOA and actual Safe signing; configuration/runtime-code mismatch; page account changes while signing; contact edits; copied stale request; no PII network/cookie/storage writes; fail-closed invalid receipt; accidental public logs/metadata; mismatch between claim and already-fulfilled allocation.

## Explicit non-guarantees

No protection against a compromised authorized root, malicious host/dependency/device, holder deliberately forwarding a delivered benefit, or operator issuing duplicate allocations without reconciliation. No implicit fallback administrator. No guarantee of future ENS architecture compatibility. No current claim of production clearance.

## Privacy code restrictions

No backend/Worker, contact-bearing fetch/XHR/beacon, form submission, PII-containing URL, browser storage, file download, console logs or analytics in the member/request verifier. Only an explicitly acknowledged clipboard handoff is allowed. The email compose link has no body. Signed message contains no contact text/salt.

Browser cache/OS/extension behavior is outside the application; no secure RAM-erasure claim. Sensitive fields must never be entered into public entitlement metadata, audits or deployment-plan descriptions.
