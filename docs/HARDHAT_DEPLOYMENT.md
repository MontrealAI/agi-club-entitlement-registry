# Hardhat — from source to an explicitly approved deployment

Start with a local preview. You need no funded wallet, RPC account, deployment key or member contact data for it. The contract intended for Ethereum mainnet is **`AGIClubEntitlementRegistryMainnet`**; the local rehearsal deliberately uses test contracts.

| Your goal | Follow | Expected result |
|---|---|---|
| See the interface on your computer | A → B installation → D | Local demonstration at `http://127.0.0.1:8080` |
| Test the contracts with free local test ETH | A → B → C | `.local/local-rehearsal.json`; chain 31337 only |
| Qualify a production candidate | A → B qualification → E → F | Evidence for the exact source; no broadcast |
| Deploy an approved limited canary | G → H → I → J | Root-approved deployment, verified identity, then a real member rehearsal |

**Run commands one at a time, from the repository folder. Continue only when the current command succeeds.** Keep a long-running local server in its own terminal; stop it with **Ctrl+C**.

Current automated results are attached to the [GitHub Actions runs](https://github.com/MontrealAI/agi-club-entitlement-registry/actions). Download the matching `local-qualification-linux` artifact to inspect `LOCAL_RELEASE.json` and its logs. `evidence/RELEASE_STATUS.json` describes the original source delivery; it is not a live CI dashboard. Automated qualification does not grant mainnet or public-launch authorization.

## A. Prepare your computer

Install Node.js **22.16.0 or a compatible later Node 22**, with npm 10, and check:

```bash
node --version
npm --version
```

Open a terminal in the extracted repository folder. You do not need a global Hardhat installation. All tool versions are in `package.json`: Hardhat 3.16.0, ethers 6.17.0 and solc 0.8.37, with the explorer-verification plugin pinned too. Do not run `npm update` as part of a deployment.

On Windows, use PowerShell; on macOS/Linux, use Terminal. Commands below run from the repository root. Paths containing spaces should be quoted.

If you use Git, obtain the existing project with:

```bash
git clone https://github.com/MontrealAI/agi-club-entitlement-registry.git
cd agi-club-entitlement-registry
```

Alternatively, use GitHub **Code → Download ZIP**, extract it, and open a terminal inside the extracted folder containing `package.json`. Hardhat configuration is already supplied; use that project directly.

| Prerequisite | Check | Used for |
|---|---|---|
| Node **22.16.0 or newer within 22.x** | `node --version` | All project commands; Node 24 is outside this repository's declared engine range |
| npm **10.x** | `npm --version` | Reproducible installation from the committed lock |
| Python 3 | macOS/Linux: `python3 --version`; Windows: `python --version` | Configurator and offline configuration tests |
| Chrome or Chromium | Open the installed browser | Full browser qualification |
| OpenSSL | `openssl version` | Temporary HTTPS certificates for browser tests |

Install the Node **22** distribution from the [official Node downloads](https://nodejs.org/en/download), then reopen your terminal and check the versions. Python, Chrome and OpenSSL must be available before full qualification; they are not installed by `npm ci`. A local preview needs only the Node/npm toolchain and installed project packages.

## B. Resolve and lock dependencies once

The repository includes a genuine npm-generated `package-lock.json`. For a normal checkout, skip bootstrap and proceed to the clean installation below. Only if starting a new source extraction without a reviewed lockfile:

```bash
npm run bootstrap:lock
npm run check:lock
```

Review and commit the **genuine** generated lock. The same operation can be run with workflow 01 in GitHub's website. A lock generated from an unreachable registry cannot be invented.

Install the reviewed dependencies:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
```

`--ignore-scripts` prevents dependency lifecycle scripts. Platform-specific packages must still be present; inspect installation errors rather than manually running unknown scripts. A security advisory gate failure blocks release pending review.

For your first visual preview, continue to D. For qualification, run:

```bash
npm run qualify
```

The qualification command runs structure/lock checks, offline regressions, compilation, EVM tests, the local request journey, public-asset build and browser checks. It stops on the first unmet prerequisite and records evidence under `qualification/`.

**Success:** all eight stages report `PASS`; `qualification/LOCAL_RELEASE.json` reports `status: PASS` and `sourceUnchanged: true`. If browser prerequisites are missing, `npm test` and `npm run build:site` can still help diagnose the remaining code, but they do not replace full qualification. GitHub's Linux job runs the browser suite; its macOS/Windows jobs check installation, tests and the site build.

The compiler path is the exact installed `solc/soljson.js`. Production settings: optimizer 200 runs, viaIR, Shanghai EVM. The build checks Ethereum size limits and produces compiler identity/hash evidence. Do not select a different profile for explorer verification.

## C. Local contract rehearsal — no real membership or gas

Terminal 1:

```bash
npm run node
```

Terminal 2, opened in the same repository folder:

```bash
npm run deploy:local
```

This deploys mocks and the test core to chain 31337, assigns a fictitious root/member and exercises a claim. Output is `.local/local-rehearsal.json`.

**Success:** the report contains `chainId: 31337`, `claimed: true` and `scope: LOCAL_TEST_ONLY_NOT_A_MEMBERSHIP_OR_TICKET`. Keep Terminal 1 open until the rehearsal finishes. Restarting the node creates fresh local state; its addresses are not production configuration.

**Never fund or reuse Hardhat's public test keys.** The production portal intentionally refuses this local network. For a local model of the production subclass and actual ethers request verification, run `npm run test:journey`. That model is still not real Ethereum finality, a physical wallet or Eventbrite.

To run repeatable sequences of contract operations without an RPC account or funded wallet:

```bash
npm run test:stateful
```

This runs four fixed seeds, each with an adversarial prefix and 128 generated steps against the compiled contract on local chain 31337. After every step, a separate state model checks every claim record, claimant, timestamp, revision, capacity counter and claim index. The sequences include ENS transfers and failures, pause changes, competing last-seat claims and mined transactions that must revert without leaving partial batch changes. The disposable test deployer is checked for absence of privileges throughout.

**Success:** `qualification/stateful-tests.json` reports `PASS` for every seed. A failure records the seed, step and command; rerun the same command with the same source and dependencies to reproduce it. The default `npm test` and full qualification also run these simulations. CI includes the report in its qualification artifacts on Linux, macOS and Windows.

These are bounded local simulations with fictitious ENS records. Existing EVM tests cover expiry/window boundaries and all privileged entry points; browser tests cover the static app's contact-data handling. None of these substitutes for a pinned real-mainnet fork, real-wallet acceptance or independent security/legal review.

## D. Build and view static assets

```bash
npm run build:site
npm run serve
```

Open `http://127.0.0.1:8080`. Demo/layout only until a reviewed production contract and exact HTTPS origin are configured. The builder copies the genuine installed ethers distribution/licence and a strict public-file allowlist to `dist/site`. It never substitutes the test crypto facade.

Choose **Membres → Explorer sans wallet → Vérifier** to explore the member demonstration. Use fictitious contacts only. The demonstration creates no signed receipt, claim, email or ticket. **Administration → Explorer la démonstration** opens the admin rehearsal. Open the HTTP address above; double-clicking source HTML is not the supported app launch method.

`npm run test:browser` needs Chrome/Chromium and OpenSSL; set `CHROME_BIN` if discovery fails. The privacy browser fixture simulates Ethereum to test leakage/clearing; it is not a real-wallet acceptance.

If automatic browser discovery fails, point to your installed executable, then rerun `npm run qualify`:

```bash
# macOS Terminal; use your actual Chromium path on Linux if different.
export CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

```powershell
# Windows PowerShell; adjust this path to your installation.
$env:CHROME_BIN = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

This browser suite uses OpenSSL only to create a temporary localhost test certificate. It does not provision a production HTTPS certificate.

## E. Read-only upstream mainnet fork

Create `.env` locally from `.env.example`. Preserve an existing file and edit only the values needed for your current stage. These commands create it only when absent:

```bash
# macOS/Linux
test -e .env || cp .env.example .env
```

```powershell
# Windows PowerShell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Use a local text editor and verify the filename is exactly `.env`, not `.env.txt`. Keep it outside all uploads. Set:

```text
MAINNET_FORK_RPC_URL=YOUR_PRIVATE_READ_ONLY_MAINNET_RPC
MAINNET_FORK_BLOCK=A_PINNED_FINALIZED_BLOCK_NUMBER
EXPECTED_ADMIN=0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201
MEMBER_LABELS=REAL_ASCII_LABEL_1,REAL_ASCII_LABEL_2
```

The labels must be actual representative memberships—not the fictitious test fixtures. Confirm the true `club.agi.eth` holder and relevant wrapping/fuse states independently. Do not change ENS registrations or burn fuses just to make a test pass.

**Which wallet counts as the member?** The registry checks the current effective owner of a direct `<label>.club.agi.eth` name through `membershipInfo(label)`. Unwrapped names use the ENS registry owner; supported wrapped names use wrapper ownership and fuse/expiry rules. A resolver address, token approval or operator approval alone does not grant an entitlement. Connect the owning wallet itself, including the Safe account when the Safe owns the name.

The [preliminary AGIJobManager example](https://montrealai.github.io/agijobmanagerv0.html) is useful for the connect → enter label → verify interaction. Its `verifySubdomain` function also accepts delegated token/operator and resolver-address authorization. Those permissions are broader than this registry's direct-owner policy. Its separate alpha-name paths and saved browser sessions are not part of the entitlement registry. Keep the member's name/email only in the current page's memory and out of ENS records, transactions, local storage and reports.

`EXPECTED_ADMIN` is the **effective owning wallet** of the ENS name, including the canonical wrapper's ownership rules. It is not the name's address-resolution record. If the holder is a Safe, use the Safe address, not one of its individual signers. RPC credentials stay in `.env`; never copy them into `frontend/config.js` or the public site.

The address above is the operator-supplied expected initial administrator. It must match independently checked canonical ENS ownership at the pinned fork block and at deployment. It is a deployment check, not an alternative authority source. The production constructor takes no owner argument: it observes the existing `club.agi.eth` holder immediately. There is no temporary deployer administration or ownership-handover transaction. Every privileged call continues to follow the effective ENS owner after legitimate transfers.

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

Run the documented `npm run test:fork` entry point. Its runner checks the environment before loading Hardhat and lists missing/invalid field names without printing their values. It archives an existing fork report privately under `.local/fork-attempts/` and marks the current report blocked before starting a new rehearsal. A configuration error, failed child process, timeout or incomplete result cannot leave the old report looking like the result of the new attempt. Only a successful current attempt bound to the unchanged source, requested block, expected root and membership labels can publish `PASS`.

The final `qualification/mainnet-fork.json` includes an attempt identifier and completion time. Child reports stay under `.local/fork-attempts/`; they are not release-gate evidence and must not be copied into the qualification directory. Raw provider exceptions and captured child output are omitted because they can contain RPC credentials. Failure reports identify the phase: configuration, connection, upstream block, root ownership, deployment or member claims. Check the corresponding inputs; for a connection/build failure, also run `npm run compile` locally and check your installed dependencies. Preserve the failed report when seeking help; share only redacted details.

While the runner owns `.local/mainnet-fork.lock`, the release gate blocks fork evidence. Normal completion/failure releases the lock after saving its report. A process killed before cleanup or an unsuccessful evidence write can leave it in place. If a later run reports a lock, first confirm in your operating-system process monitor that the original runner and its Hardhat child processes have stopped. Preserve the lock and reports privately, then remove only the stale lock and rerun the rehearsal. Do not remove a live lock, promote an attempt file to `PASS`, or delete the deployment broadcast checkpoint as part of fork recovery. A late child report cannot overwrite the final qualification report.

After reading the private review reports, the gate rechecks the fork-report hash and checks the lock before and after that final read. A new lock or changed report blocks the result and removes the stale fork's bytecode and approval-evidence entry. If this check fails, let the rehearsal finish, inspect its result and rerun `npm run release:gate`. The gate observes evidence at check time; its result does not reserve the files or prevent another rehearsal from starting later.

## F. Independent review and real-device rehearsal

Complete the [legal release review](LEGAL_RELEASE_REVIEW.md) with qualified counsel and the actual operator. Review the real offering, membership arrangements, French/English notices, provider information and email/Eventbrite privacy operations. Publish any required operational facts before the final source fingerprint. The member acknowledgement is temporary and is not a retained contractual acceptance record.

Resolve all findings against the exact source/compiler/dependency lock. Test root authority transitions, member wrapping/expiry semantics, unauthorized calls, duplicate claims, batch bounds, quotas, revocation/reassignment, Ethereum finality and signature failures.

Rehearse the actual Ledger/Safe/member wallet, mobile browser, official-origin CSP, request signature, explicit copy/paste, organizer verification and manual Eventbrite workflow. Stage with test-only harnesses without calling them real memberships. Contact test data must be fictitious. Confirm that the wallet sees only a salted recipient commitment.

Record private review reports, not customer receipts, under `.local/`. Use `releases/external-evidence.example.json` as the structure for `.local/external-evidence.json`; each report must bind the current source hash. The static edition requires **privateRequestStaging**, not a relay test.

The required report entries are `independentSecurityReview`, `legalReview`, `realWalletStaging`, `privateRequestStaging` and `eventbriteStaging`. Each identifies the actual reviewer, a private `.local/` report file and that file's SHA-256. Record `PASS` only for an executed, reviewed result. `npm run fingerprint` prints the source hash to bind; changing code, tests, configuration, public legal/privacy notices, the legal-review guide or the license requires matching new evidence. Keep participant contacts and legal advice out of public qualification artifacts.

```bash
npm run fingerprint
npm run release:gate
```

The gate requires all eight successful qualification stages and their nonempty logs, the matching production compiler report, and a pinned mainnet-fork report with successful distinct member checks. The fork's creation-code hash must match the qualified build. It binds the reports and every qualification log into the evidence fingerprint; editing a log after signing invalidates that approval. Evidence must be regular files in their expected directories; symlinked evidence is rejected. Keep the complete `qualification/` bundle when moving evidence from CI to the deployment checkout, including `compiler-status.json` and the logs. Older fork reports without a creation-code hash must be regenerated.

The gate checks completeness and hashes. It does not independently determine whether someone else's statement is true. It never itself authorizes deployment. Do not edit a failed report to say `PASS`: complete the missing check and regenerate its evidence.

## G. Prepare an unsigned limited-canary plan

Only after the preceding gates pass, configure local `.env` with a private `MAINNET_RPC_URL`, `EXPECTED_ADMIN`, `DEPLOYER_ADDRESS` and **`DEPLOY_MAX_COST_ETH`**, your explicit maximum deployment cost in ETH. Leaving the budget blank blocks plan creation. This is your ceiling, not a promised fee estimate.

```bash
npm run prepare:mainnet
```

Review `.local/deployment-plan.json`: chain 1, production contract name, source/creation/runtime hashes, deployer, current root admin, nonce, predicted address, gas limit, fee ceiling and short expiry. **No transaction is sent by this command.**

**Success:** the command prints `UNSIGNED CANARY PLAN — no transaction sent`. The plan lasts 30 minutes. If it expires or the deployer's nonce changes, prepare and review a new plan, then obtain a new signature. Never edit the JSON to extend its expiry or change its fee ceiling.

The planner also compares the actual build artifact with the qualified creation code and compares the live root holder with the fork evidence. If either differs, repeat the affected qualification and review before preparing a fresh plan. A previously generated report does not qualify replacement build artifacts.

Use a **separate disposable deployer** with only the reviewed deployment budget. The plan rejects using the root administrator as the deployer. Do not export the root Ledger/Safe seed or private key. The disposable wallet pays deployment gas and gains no registry administration, ownership or recovery privileges. Keep its transaction record until deployment is finalized and independently verified before retiring the wallet.

## H. Root-holder approval and explicit broadcast

Open the built `deployment.html` from a trusted local server or approved HTTPS origin. Load the plan and review every field before signing with the actual holder of `club.agi.eth`. Save the approval as `.local/deployment-approval.json`; it must remain private. Contract-wallet signing requires its real signing workflow and acceptance tests.

For the local approval page, keep `npm run serve` running and open **`http://127.0.0.1:8080/deployment.html`**. Choose `.local/deployment-plan.json`, review the displayed fields, acknowledge them and sign. Move the downloaded `deployment-approval.json` from your browser's Downloads folder to `.local/deployment-approval.json` in this checkout. This is a deployment approval, not a member receipt. Its download is separate from the member/organizer pages, which provide no receipt-file export.

The page signs the exact reviewed plan. Changing the file, wallet or network, leaving/restoring the page, or withdrawing consent cancels that attempt in the page. Reject any open wallet prompt, then review again. Only one signing attempt can run at a time; the account and current root holder are checked again before download. Unchecking the box cannot revoke a signed approval you have already shared: treat that file as active until its signed expiry or another deployment gate invalidates it.

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

The broadcaster refuses CI, requires the exact acknowledgement and signed plan, and rechecks hashes/admin/nonce/fee bounds. It signs locally, calculates the transaction hash and writes and flushes a private recovery checkpoint **before** RPC submission. The checkpoint contains public transaction metadata, not a private key or signed transaction bytes. A second invocation cannot overwrite the checkpoint or submit again from that checkout. The planner also refuses to replace a plan when a checkpoint exists. A failed checkpoint write prevents submission.

**If submission or confirmation is interrupted, keep `.local/deployment-broadcast.json` and inspect its transaction hash.** Its `SIGNED_SUBMISSION_OUTCOME_UNCONFIRMED` status deliberately does not claim that the node accepted or rejected the transaction. The file is not rewritten to imply success. An RPC timeout can occur after acceptance; a missing receipt can mean a pending transaction. Neither is permission to retry. Two confirmations are not proof of finality.

Recovery, without another transaction:

1. Open the checkpoint in your local editor. Keep its `transactionHash`, `deployer`, `nonce` and `predictedAddress`; never publish private approvals or keystores.
2. Check that hash and deployer nonce through your approved Ethereum provider/explorer. Reconcile pending, mined, failed or replaced transactions. If no receipt is found, preserve the uncertainty; do not delete the checkpoint to bypass the guard.
3. Set `REGISTRY_ADDRESS` to the reviewed `predictedAddress` and run `npm run inspect:mainnet` once code is present. It needs no deployer password and sends no transaction. If finality is pending, rerun only this read-only check later.
4. If the original deployment cannot be completed, document the outcome and have the root holder approve any replacement plan and budget explicitly. Use a separate reviewed checkout and preserve the original evidence. Do not infer permission for a replacement from an RPC error or regenerate approvals automatically.

The broadcaster's `.local/mainnet-deployment.json` records a latest-state identity check with `finalityVerified: false`. Only successful finalized inspection produces a separate `.local/post-deployment.json` with `finalityVerified: true`. The approval deadline controls when this helper may submit; it does not make an Ethereum transaction expire or cancel it once pending.

For a contract wallet, ERC-1271 approval is checked at finalized and latest state both before unlocking the deployer keystore and again after the deployment preflight. Plan expiry and evidence are checked after those final reads. These are checks at the observed chain state; they cannot guarantee that ownership or contract-wallet policy will remain unchanged before the transaction is mined. See [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) for state-dependent signature validity.

## I. Verify before member access

Set `REGISTRY_ADDRESS` locally and run:

```bash
npm run inspect:mainnet
npm run verify:mainnet -- 0xYOUR_DEPLOYED_CONTRACT
```

Explorer verification requires a configured Etherscan API key and the same production build profile. Check actual runtime/admin independently, wait for finality, then configure the static app:

`npm run inspect:mainnet` uses the approved `runtimeCodeHash` from `.local/deployment-plan.json`. If recovering an existing reviewed deployment without that plan, set `EXPECTED_RUNTIME_HASH` in `.env` from your independent approved record. A hash copied from an unknown contract is not approval. Inspection pins finalized and latest blocks, checks runtime, registry getters and canonical ENS authority at both, then checks the block hashes again. It rejects an unfinalized owner change, missing finalized code or an inconsistent/reorganized block view. A successful inspection writes `.local/post-deployment.json`, including both block anchors, the checked `address` and `runtimeCodeHash` to use below. Replace both example placeholders with those reviewed values.

```bash
python3 scripts/configure.py --contract 0xYOUR_DEPLOYED_CONTRACT --runtime-code-hash 0xAPPROVED_RUNTIME_HASH --origin https://claims.example.org --entitlement IA101_2026_09_22
npm run build:site
```

On Windows replace `python3` with your installed `python` command. Keep the required Node.js 22 toolchain on `PATH`; the configurator uses the canonical receipt protocol to validate the origin offline. The origin is an example: replace it with the **exact real dedicated HTTPS origin**, no path/trailing slash. Use the browser's canonical form: lowercase hostname, an ASCII punycode hostname for an internationalized domain, and no explicit default `:443` port. Non-default HTTPS ports are supported. Invalid settings leave the existing configuration untouched. Only allowlisted entitlements can produce a request; repeat `--entitlement` when adding future benefits. Hexadecimal entitlement IDs are normalized to lowercase; canonical entitlement names keep their uppercase spelling.

The new public contract/origin configuration changes the source/configuration fingerprint. Review the configuration diff and the new asset manifest; rerun build/privacy checks and bind real canary evidence to that exact published configuration. Do not reuse a pre-configuration browser approval as proof of the final site.

Upload **only `dist/site`** to a suitable static host. Apply `_headers` or equivalent response headers; the file is not automatically interpreted by all hosts. Test your actual wallet transport under `connect-src 'none'` rather than weakening the policy blindly. Do not serve the source repository, private directories, test fixtures or environment files. For IPFS-backed hosting, use a reviewed stable dedicated HTTPS origin; a changing raw gateway/CID origin is not automatically accepted by the pinned-origin policy.

**Verify zero contact persistence on the final host:** use fictitious details and inspect both `member.html` and `verify.html`. Check that storage remains empty, no contact-bearing network request or download occurs, wallet prompts contain no name/email/private salt, and clear/reload leaves no receipt history. Test the explicit clipboard handoff separately: it is a user-directed copy outside the app's storage boundary. Ensure the host adds no analytics, forms, session-replay scripts or service worker. Run `npm run qualify` after configuration changes and repeat the actual wallet/host acceptance against that exact build.

## J. One real canary, then a separate launch decision

From the root admin console, create IA 101 in **Draft**, set its 50 reserved places, UTC window and public descriptors, then open for an explicitly approved limited test. No Eventbrite account is integrated into the contract.

Run one genuine member through claim → finality → private request → explicit clipboard/email handoff → receipt verification → duplicate check → one manually issued ticket → participant confirms receipt/access. A new signature or email must never produce a second ticket for the same claim key.

Keep broad access closed until findings and private acceptance evidence are reviewed. The app cannot attest that a member sent an email, prove inbox delivery or issue tickets. Do not promise those events from a browser success indicator.

If any older registry was deployed, reconcile all claims and tickets before migration. This source does not upgrade immutable deployed contracts or migrate records automatically.

## Troubleshooting — what to do next

| What you see | Next action |
|---|---|
| `EBADENGINE` | Check `node --version` and `npm --version`; reopen the terminal using Node 22 and npm 10. |
| `package.json` not found | Open the terminal inside the extracted repository, then rerun the command. |
| `LOCK_GATE_BLOCKED` or `npm ci` rejects the lock | Restore the reviewed lock from your checkout. Do not replace it with guessed versions or an automatic audit fix. |
| Python not found | Install Python 3 and reopen the terminal; use `python` on Windows or `python3` on macOS/Linux. |
| Chrome/OpenSSL missing | Install the named prerequisite; set `CHROME_BIN` to the real executable. Keep the failed qualification log, fix the prerequisite and rerun. |
| Local rehearsal cannot reach `127.0.0.1:8545` | Start `npm run node` in Terminal 1 and keep it open. |
| `EADDRINUSE` when previewing | Stop your previous preview process with Ctrl+C, then run `npm run serve` once. |
| `NOT_CONFIGURED`, `WRONG_ORIGIN` or mainnet required | Demo is expected locally. Live operation needs the approved registry, exact HTTPS origin and Ethereum mainnet; local mock addresses cannot be used. |
| `release:gate` reports `BLOCKED` | Read `qualification/DEPLOYMENT_GATE.json`; complete the missing real checks and source-bound private reports. |
| Approval expired, admin changed or nonce changed | Stop and prepare/review/sign a fresh plan. An old signature cannot authorize edited fields. |
| Broadcast interrupted, timed out or checkpoint already exists | Preserve `.local/deployment-broadcast.json`. Reconcile its hash/nonce and use the read-only recovery steps in H. Do not delete the checkpoint or automatically retry. |
| Receipt `WAITING_FOR_FINALITY` or expired | Wait for finality, or have the member prepare a fresh request for the existing claim. Do not claim or issue a second ticket. |

Share only redacted failure details when requesting help. Never upload `.env`, keystores/passwords, private approvals or a member's receipt.

## Primary documentation

- https://hardhat.org/docs/reference/nodejs-support
- https://hardhat.org/docs/cookbook/custom-solidity-compiler
- https://hardhat.org/docs/reference/network-manager
- https://hardhat.org/docs/guides/deployment/using-scripts
- https://docs.npmjs.com/cli/commands/npm-ci/
- https://docs.ens.domains/wrapper/expiry/
