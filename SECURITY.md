# Security

This repository is a release candidate. No audit or mainnet deployment is implied by publication or CI.

Report vulnerabilities privately to **president@montreal.ai**. Provide version/hash, affected function and a minimal reproducer using fictitious contacts/test wallets. Do not open a public issue with a real member receipt, email address, wallet seed, keystore, RPC credential or exploit against a live member.

Only the current effective holder of `club.agi.eth` controls the contract's management operations. GitHub ownership does not grant chain privileges. See [security model](docs/SECURITY_MODEL.md), [privacy boundary](PRIVACY.md) and [release checklist](docs/RELEASE_CHECKLIST.md).

No automated production deployment runs in CI. Keep `.env`, `.local`, private receipts and Eventbrite exports outside Git. Avoid shared-origin apps, injected analytics and unreviewed dependencies in the hosted static application.
