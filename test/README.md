# Test scopes

`npm run test:offline`: no installed npm packages or package downloads required; uses test-only Ethereum crypto/chain fixtures and actual WebCrypto SHA-256. Tests binding and source/PII-storage boundaries, not physical wallets or EVM bytecode.

The admin regressions execute the actual `frontend/app.js` with a minimal DOM and simulated read-only wallet/registry. They cover category selection and transaction previews, multi-page refreshes, failed and overlapping reads, and wallet/demo changes during pending reads. They do not validate browser rendering, Ethereum cryptography or live transactions.

Wallet-session regressions execute the actual admin/member handler bodies with simulated DOM, provider and transaction boundaries. They reject actions after failed contract verification, reconnects, stale approvals and membership edits during pending reads; positive controls preserve verified actions and initial wallet permission/network-switch flows. These tests make no real wallet or transaction calls. Genuine browser loading and the private receipt flow remain covered by the browser qualification suite.

Receipt regressions mutate caller-owned inputs during simulated asynchronous verification and advance the clock to the expiry boundary. They check that recipient, signature, policy and verified payload stay consistent. CLI input tests split a signed UTF-8 receipt at every byte boundary, enforce the input byte limit, and reject invalid encoding/JSON using non-sensitive error codes. The signed v3 packet is unchanged; the optional email envelope adds a visible full subname, which must match the signed label.

Public-tooling regressions run the Python configurator from outside the repository and validate its output against the receipt policy. They cover canonical HTTPS origins, hexadecimal entitlement IDs and preservation of an existing configuration after invalid input. Preview-server tests use actual loopback HTTP requests and temporary directory symlinks (junctions on Windows) to check public-root containment. Isolated child processes inject file-stream errors before and after response bytes to check error handling and continued server availability. Fixtures contain no private data.

Organizer-verifier regressions execute the actual handler body with simulated DOM, clock and wallet boundaries. They check retention deadlines during delayed operations, input invalidation, lifecycle clearing, provider cleanup and fixed error messages. Browser privacy qualification now executes both member and organizer flows, traps persistent-storage/file/logging APIs, inspects stores and network/wallet calls, and checks clear and real reload behavior. The EVM journey decodes a real claim transaction and checks its logs for contact bytes; receipt verification must not mine another transaction. These tests use fictitious contacts only.

`npm run test:etherscan`: installed, pinned ethers/solc are required for ABI encoding and compiler-export regression tests. This suite is deliberately excluded from the dependency-free offline command.

`npm run test:evm`: runs `test:etherscan`, then real Hardhat EVM checks with compiled contracts and local ENS/wrapper mocks, followed by the stateful campaign.

Security boundary regressions inject malformed wrapper ABI words and lengths into the guarded local EVM, exercise forwarded calls whose originating EOA is the root/member owner, and submit ETH-bearing calls and unknown selectors. Rejected transactions are mined with explicit gas; the suite checks failed receipts, absent logs and unchanged claims/counters. Positive controls confirm valid wrapper data, actual contract-wallet ownership and zero-value claims still work. These are local adversarial tests, not an independent audit or a deployed ENS check.

`npm run test:journey`: isolated chain-ID-1 model, actual ethers adapter, real WebCrypto recipient binding. No real ENS ownership, finality, mail or Eventbrite.

The EVM, journey and local-fork providers disable ethers' short-lived read cache because the simulated chain mines synchronously. This follows the [ethers provider guidance](https://docs.ethers.org/v6/api/providers/abstract-provider/). Rejection checks decode explicit RPC revert bytes, including Hardhat 3's nested error data; transport failures and transaction inputs never count as successful rejection evidence.

`npm run test:fork`: local fork of a pinned finalized mainnet block, read-only upstream and local impersonation. Does not prove possession of a real wallet.

Fork-runner regressions use synthetic reports in temporary directories and injected child outcomes. They verify old-report invalidation before configuration loading, private history preservation, missing/invalid input handling, error redaction, timeouts and late child writes, concurrent/interrupted locks, and binding to the current source/block/root/members. One check launches a real Node child through a temporary package entry to exercise cross-platform process invocation; another executes the actual fork script with a failing simulated provider. These checks make no upstream RPC calls and cannot replace the real fork evidence. The release gate rejects an active/interrupted lock and reports without a completed attempt identity.

`npm run test:browser`: built-site genuine-library smoke test plus source UI privacy rehearsal with explicitly simulated wallet/crypto. Real-device wallet acceptance remains separate.

`npm run test:browser:source`: only the mocked privacy-UI scope, suitable before dependencies are available. A browser security/network block is a failed/unexecuted test, not a pass.

All contacts and keys in tests are fictitious/public fixtures. Never reuse them with real assets. No test tool belongs in the hosted site.
