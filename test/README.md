# Test scopes

`npm run test:offline`: no package downloads required; uses test-only Ethereum crypto/chain fixtures and actual WebCrypto SHA-256. Tests binding and source/PII-storage boundaries, not physical wallets or EVM bytecode.

`npm run test:evm`: real Hardhat EVM, compiled contracts and local ENS/wrapper mocks.

`npm run test:journey`: isolated chain-ID-1 model, actual ethers adapter, real WebCrypto recipient binding. No real ENS ownership, finality, mail or Eventbrite.

`npm run test:fork`: local fork of a pinned finalized mainnet block, read-only upstream and local impersonation. Does not prove possession of a real wallet.

`npm run test:browser`: built-site genuine-library smoke test plus source UI privacy rehearsal with explicitly simulated wallet/crypto. Real-device wallet acceptance remains separate.

`npm run test:browser:source`: only the mocked privacy-UI scope, suitable before dependencies are available. A browser security/network block is a failed/unexecuted test, not a pass.

All contacts and keys in tests are fictitious/public fixtures. Never reuse them with real assets. No test tool belongs in the hosted site.
