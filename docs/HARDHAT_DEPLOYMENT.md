# Hardhat — from source to an explicitly approved deployment

**Read `evidence/RELEASE_STATUS.json` first.** No deployed registry or private key is included. The contract intended for Ethereum mainnet is **`AGIClubEntitlementRegistryMainnet`**, not the dependency-injected core or qualification mocks.

## A. Prepare your computer

Install Node.js **22.16.0 or a compatible later Node 22**, with npm 10, and check:

```bash
node --version
npm --version
```

Open a terminal in the extracted repository folder. You do not need a global Hardhat installation. All tool versions are in `package.json`: Hardhat 3.16.0, ethers 6.17.0 and solc 0.8.37, with the explorer-verification plugin pinned too. Do not run `npm update` as part of a deployment.

On Windows, use PowerShell; on macOS/Linux, use Terminal. Commands below run from the repository root. Paths containing spaces should be quoted.

## B. Resolve and lock dependencies once

The repository includes a genuine npm-generated `package-lock.json`. For a normal checkout, skip bootstrap and proceed to the clean installation below. Only if starting a new source extraction without a reviewed lockfile:

```bash
npm run bootstrap:lock
npm run check:lock
```

Review and commit the **genuine** generated lock. The same operation can be run with workflow 01 in GitHub's website. A lock generated from an unreachable registry cannot be invented.

For every clean build thereafter:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
npm run qualify
```

`--ignore-scripts` prevents dependency lifecycle scripts. Platform-specific packages must still be present; inspect installation errors rather than manually running unknown scripts. A security advisory gate failure blocks release pending review.

The qualification command runs structure/lock checks, offline regressions, compilation, EVM tests, the local request journey, public-asset build and browser checks. It stops on the first unmet prerequisite and records evidence under `qualification/`.

The compiler path is the exact installed `solc/soljson.js`. Production settings: optimizer 200 runs, viaIR, Shanghai EVM. The build checks Ethereum size limits and produces compiler identity/hash evidence. Do not select a different profile for explorer verification.

## C. Local contract rehearsal — no real membership or gas

Terminal 1:

```bash
npm run node
```

Terminal 2:

```bash
npm run deploy:local
```

This deploys mocks and the test core to chain 31337, assigns a fictitious root/member and exercises a claim. Output is `.local/local-rehearsal.json`.

**Never fund or reuse Hardhat's public test keys.** The production portal intentionally refuses this local network. For a local model of the production subclass and actual ethers request verification, run `npm run test:journey`. That model is still not real Ethereum finality, a physical wallet or Eventbrite.

## D. Build and view static assets

```bash
npm run build:site
npm run serve
```

Open `http://127.0.0.1:8080`. Demo/layout only until a reviewed production contract and exact HTTPS origin are configured. The builder copies the genuine installed ethers distribution/licence and a strict public-file allowlist to `dist/site`. It never substitutes the test crypto facade.

`npm run test:browser` needs Chrome/Chromium and OpenSSL; set `CHROME_BIN` if discovery fails. The privacy browser fixture simulates Ethereum to test leakage/clearing; it is not a real-wallet acceptance.

## E. Read-only upstream mainnet fork

Create `.env` locally from `.env.example`. Keep it outside all uploads. Set:

```text
MAINNET_FORK_RPC_URL=YOUR_PRIVATE_READ_ONLY_MAINNET_RPC
MAINNET_FORK_BLOCK=A_PINNED_FINALIZED_BLOCK_NUMBER
EXPECTED_ADMIN=THE_ACTUAL_CLUB_AGI_ETH_HOLDER
MEMBER_LABELS=REAL_ASCII_LABEL_1,REAL_ASCII_LABEL_2
```

The labels must be actual representative memberships—not the fictitious test fixtures. Confirm the true `club.agi.eth` holder and relevant wrapping/fuse states independently. Do not change ENS registrations or burn fuses just to make a test pass.

macOS/Linux:

```bash
ALLOW_READ_ONLY_FORK=yes npm run test:fork
```

PowerShell:

```powershell
$env:ALLOW_READ_ONLY_FORK="yes"
npm run test:fork
```

The script reads a pinned real block, then deploys and impersonates accounts **only inside a local fork**. It does not broadcast upstream. A successful impersonation is not evidence of controlling a real Ledger or Safe.

## F. Independent review and real-device rehearsal

Resolve all findings against the exact source/compiler/dependency lock. Test root authority transitions, member wrapping/expiry semantics, unauthorized calls, duplicate claims, batch bounds, quotas, revocation/reassignment, Ethereum finality and signature failures.

Rehearse the actual Ledger/Safe/member wallet, mobile browser, official-origin CSP, request signature, explicit copy/paste, organizer verification and manual Eventbrite workflow. Stage with test-only harnesses without calling them real memberships. Contact test data must be fictitious. Confirm that the wallet sees only a salted recipient commitment.

Record private review reports, not customer receipts, under `.local/`. Use `releases/external-evidence.example.json` as the structure for `.local/external-evidence.json`; each report must bind the current source hash. The static edition requires **privateRequestStaging**, not a relay test.

```bash
npm run fingerprint
npm run release:gate
```

This gate checks report presence and hashes. It does not independently determine whether someone else's statement is true. It never itself authorizes deployment.

## G. Prepare an unsigned limited-canary plan

Only after the preceding gates pass, configure local `.env` with a private `MAINNET_RPC_URL`, `EXPECTED_ADMIN`, `DEPLOYER_ADDRESS` and **`DEPLOY_MAX_COST_ETH`**, your explicit maximum deployment cost in ETH. Leaving the budget blank blocks plan creation. This is your ceiling, not a promised fee estimate.

```bash
npm run prepare:mainnet
```

Review `.local/deployment-plan.json`: chain 1, production contract name, source/creation/runtime hashes, deployer, current root admin, nonce, predicted address, gas limit, fee ceiling and short expiry. **No transaction is sent by this command.**

The deployer can be a separate account with only the reviewed deployment budget. Do not export the root Ledger/Safe seed or private key. The deployer gains no special registry privileges.

## H. Root-holder approval and explicit broadcast

Open the built `deployment.html` from a trusted local server or approved HTTPS origin. Load the plan and review every field before signing with the actual holder of `club.agi.eth`. Save the approval as `.local/deployment-approval.json`; it must remain private. Contract-wallet signing requires its real signing workflow and acceptance tests.

The supplied broadcaster uses a locally encrypted **deployer** JSON keystore. Configure `DEPLOYER_KEYSTORE`. Provide its password locally for this one execution—never in GitHub, a command committed to source or shared logs. The environment-variable method is visible to processes with sufficient local privileges; use an isolated machine and clear it afterward.

macOS/Linux (Bash terminal):

```bash
printf "Deployer keystore password: "
read -r -s DEPLOYER_KEYSTORE_PASSWORD; printf "\n"
export DEPLOYER_KEYSTORE_PASSWORD
AGI_MAINNET_SEND=I_APPROVE_THIS_LIMITED_CANARY npm run deploy:mainnet
unset DEPLOYER_KEYSTORE_PASSWORD
```

PowerShell (not in a recorded/shared session):

```powershell
$secret = Read-Host "Deployer keystore password" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:DEPLOYER_KEYSTORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $env:AGI_MAINNET_SEND = "I_APPROVE_THIS_LIMITED_CANARY"
  npm run deploy:mainnet
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Item Env:DEPLOYER_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:AGI_MAINNET_SEND -ErrorAction SilentlyContinue
}
```

The process environment is not a hardware vault, and these cleanup commands do not guarantee RAM erasure. Use your trusted wallet tooling to create/export an **encrypted Ethereum JSON keystore for the separate deployer**. An unencrypted raw private-key export is not the expected input. Never use the root Ledger/Safe key for this step.

The broadcaster refuses CI, requires the exact acknowledgement and signed plan, rechecks hashes/admin/nonce/fee bounds and records the transaction hash. **If interrupted after broadcast, inspect that transaction—do not rerun blindly.** A local plan or two confirmations are not proof of finality.

## I. Verify before member access

Set `REGISTRY_ADDRESS` locally and run:

```bash
npm run inspect:mainnet
npm run verify:mainnet -- 0xYOUR_DEPLOYED_CONTRACT
```

Explorer verification requires a configured Etherscan API key and the same production build profile. Check actual runtime/admin independently, wait for finality, then configure the static app:

```bash
python3 scripts/configure.py --contract 0xYOUR_DEPLOYED_CONTRACT --runtime-code-hash 0xAPPROVED_RUNTIME_HASH --origin https://claims.example.org --entitlement IA101_2026_09_22
npm run build:site
```

On Windows replace `python3` with your installed `python` command. The origin is an example: replace it with the **exact real dedicated HTTPS origin**, no path/trailing slash. Only allowlisted entitlements can produce a request; repeat `--entitlement` when adding future benefits.

The new public contract/origin configuration changes the source/configuration fingerprint. Review the configuration diff and the new asset manifest; rerun build/privacy checks and bind real canary evidence to that exact published configuration. Do not reuse a pre-configuration browser approval as proof of the final site.

Upload **only `dist/site`** to a suitable static host. Apply `_headers` or equivalent response headers; the file is not automatically interpreted by all hosts. Test your actual wallet transport under `connect-src 'none'` rather than weakening the policy blindly. Do not serve the source repository, private directories, test fixtures or environment files. For IPFS-backed hosting, use a reviewed stable dedicated HTTPS origin; a changing raw gateway/CID origin is not automatically accepted by the pinned-origin policy.

## J. One real canary, then a separate launch decision

From the root admin console, create IA 101 in **Draft**, set its 50 reserved places, UTC window and public descriptors, then open for an explicitly approved limited test. No Eventbrite account is integrated into the contract.

Run one genuine member through claim → finality → private request → explicit clipboard/email handoff → receipt verification → duplicate check → one manually issued ticket → participant confirms receipt/access. A new signature or email must never produce a second ticket for the same claim key.

Keep broad access closed until findings and private acceptance evidence are reviewed. The app cannot attest that a member sent an email, prove inbox delivery or issue tickets. Do not promise those events from a browser success indicator.

If any older registry was deployed, reconcile all claims and tickets before migration. This source does not upgrade immutable deployed contracts or migrate records automatically.

## Primary documentation

- https://hardhat.org/docs/reference/nodejs-support
- https://hardhat.org/docs/cookbook/custom-solidity-compiler
- https://hardhat.org/docs/reference/network-manager
- https://hardhat.org/docs/guides/deployment/using-scripts
- https://docs.npmjs.com/cli/commands/npm-ci/
- https://docs.ens.domains/wrapper/expiry/
