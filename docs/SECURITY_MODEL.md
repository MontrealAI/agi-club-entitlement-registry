# Security review scope

This is a candidate, not an independent audit. Start with immutable source hashes in `evidence/PROVENANCE.json` and the actual delivery status.

## Assets and boundaries

- Root authority: current effective `club.agi.eth` holder and its parent/wrapper dependencies.
- Claim integrity: entitlement+membership uniqueness, capacity, windows, administrative history.
- Recipient binding: private /4 receipt, salted commitment, scope, expiry and revision.
- Contact privacy: volatile page state, no automatic transport, explicit clipboard handoff.
- Fulfilment: private organizer register and chosen external fulfillment process.

## Required adversarial checks

Unauthorized admin; root transfer; owner versus resolver; wrapping/unwrapping/fuses and exact expiry boundary; unavailable/malformed wrapper; duplicate/transfer-based claim; batch failure atomicity; quota accounting; pause behavior; override events; stale/revoked/reassigned receipt; substituted email/name/salt/message; wrong registry/domain/network; replay; EOA and actual Safe signing; configuration/runtime-code mismatch; page account changes while signing; contact edits; copied stale request; no PII network/cookie/storage writes; fail-closed invalid receipt; accidental public logs/metadata; mismatch between claim and already-fulfilled allocation.

## Explicit non-guarantees

No protection against a compromised authorized root, malicious host/dependency/device, holder deliberately forwarding a delivered benefit, or operator issuing duplicate allocations without reconciliation. No implicit fallback administrator. No guarantee of future ENS architecture compatibility. No current claim of production clearance.

## Privacy code restrictions

No backend/Worker, contact-bearing fetch/XHR/beacon, form submission, PII-containing URL, browser storage, file download, console logs or analytics in the member/request verifier. Only an explicitly acknowledged clipboard handoff is allowed. The email compose link has no body. Signed message contains no contact text/salt.

Browser cache/OS/extension behavior is outside the application; no secure RAM-erasure claim. Sensitive fields must never be entered into public entitlement metadata, audits or deployment-plan descriptions.
