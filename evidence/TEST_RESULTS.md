# Static Privacy Edition — actual checks

Repository **2.3.0-rc.1** · preserved contract **2.1.1** · request protocol **/3**.

**Source candidate. Mainnet deployment is NOT authorized.**

| Check | Observed result | Limit |
|---|---|---|
| Offline regressions | 109 passed, 0 failed, 0 skipped | Chain/crypto fixtures; actual WebCrypto SHA-256. |
| Syntax | 41 passed, 0 failed | Not Solidity compilation, Hardhat resolution or TypeScript type checking. |
| Solidity provenance | 3 files preserved byte-for-byte | Source comparison only. |
| In-memory UI layouts | 8 viewport/page combinations; no horizontal overflow | No hosted app or wallet. |
| In-memory demo/clear | One handler rehearsal passed | Imports flattened only in inspection harness. |
| Hosted browser privacy test | BLOCKED before its first check | Browser returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. |
| npm lookup | BLOCKED, EAI_AGAIN | No dependency graph or lock fabricated. |
| Clean install | BLOCKED | No genuine lock. |
| Hardhat compile | BLOCKED / not executed | Tool unavailable. |
| Public site build | BLOCKED | Genuine ethers unavailable. |
| Exact local qualification | BLOCKED at lock gate | Source stayed unchanged during the run. |
| Deployment gate | BLOCKED | Real/fork/audit/acceptance evidence absent. |

Source fingerprint: `38e65eb3bb7ebc803d609a116da184962953ba696cdbd933aed0ace0a911baa9`.

The independent Node SHA-256/WebCrypto comparison, contact/commitment tampering cases, public-only chain adapter arguments, epoch invalidation, clipboard consent, storage/API source restrictions and strict public-build file list are included in the offline regressions. A high test count does not remove the scope limitations.

`BLOCKED_CHECKS.json` preserves observed failures. `OFFLINE_TESTS.txt` holds test output. `SYNTAX_CHECKS.json` and `IN_MEMORY_UI.json` describe their scope. No actual contact, email or ticket is present in these fixtures. Tests do not authorize deployment.

## Clean handoff

Use the manual GitHub dependency-lock workflow on a network-enabled runner; review/commit the real lock, then inspect the full CI. Do not publish `frontend/` as a live service before its genuine dependencies are built. Only `dist/site` after review/configuration is public-site output.
