# Test scopes

`npm run test:offline`: no package downloads required; uses test-only Ethereum crypto/chain fixtures and actual WebCrypto SHA-256. Tests binding and source/PII-storage boundaries, not physical wallets or EVM bytecode.

The admin regressions execute the actual `frontend/app.js` with a minimal DOM and simulated read-only wallet/registry. They cover category selection and transaction previews, multi-page refreshes, failed and overlapping reads, and wallet/demo changes during pending reads. They do not validate browser rendering, Ethereum cryptography or live transactions.

Wallet-session regressions execute the actual admin/member handler bodies with simulated DOM, provider and transaction boundaries. They reject actions after failed contract verification, reconnects, stale approvals and membership edits during pending reads; positive controls preserve verified actions and initial wallet permission/network-switch flows. These tests make no real wallet or transaction calls. Genuine browser loading and the private receipt flow remain covered by the browser qualification suite.

Receipt regressions mutate caller-owned inputs during simulated asynchronous verification and advance the clock to the expiry boundary. They check that recipient, signature, policy and verified payload stay consistent. CLI input tests split a signed UTF-8 receipt at every byte boundary, enforce the input byte limit, and reject invalid encoding/JSON using non-sensitive error codes. The receipt format is unchanged.

`npm run test:evm`: real Hardhat EVM, compiled contracts and local ENS/wrapper mocks.

`npm run test:journey`: isolated chain-ID-1 model, actual ethers adapter, real WebCrypto recipient binding. No real ENS ownership, finality, mail or Eventbrite.

The EVM, journey and local-fork providers disable ethers' short-lived read cache because the simulated chain mines synchronously. This follows the [ethers provider guidance](https://docs.ethers.org/v6/api/providers/abstract-provider/). Rejection checks decode explicit RPC revert bytes, including Hardhat 3's nested error data; transport failures and transaction inputs never count as successful rejection evidence.

`npm run test:fork`: local fork of a pinned finalized mainnet block, read-only upstream and local impersonation. Does not prove possession of a real wallet.

`npm run test:browser`: built-site genuine-library smoke test plus source UI privacy rehearsal with explicitly simulated wallet/crypto. Real-device wallet acceptance remains separate.

`npm run test:browser:source`: only the mocked privacy-UI scope, suitable before dependencies are available. A browser security/network block is a failed/unexecuted test, not a pass.

All contacts and keys in tests are fictitious/public fixtures. Never reuse them with real assets. No test tool belongs in the hosted site.
