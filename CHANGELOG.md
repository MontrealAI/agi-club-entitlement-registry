# Changelog

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
