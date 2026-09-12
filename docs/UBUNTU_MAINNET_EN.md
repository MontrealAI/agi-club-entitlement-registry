# Ubuntu → an empty AGI Club registry

[Français](UBUNTU_MAINNET_FR.md) · [Full Hardhat guide](HARDHAT_DEPLOYMENT.md)

**You can decide the first benefit later.** Deployment creates zero benefits and zero claims. It needs no benefit name, date, quota, category, metadata or fulfillment identifier. You can leave the catalogue empty and add your chosen benefits later through the administrator console or Etherscan.

The only prefilled operator value in `.env.example` is:

```text
EXPECTED_ADMIN=0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201
```

This is the expected effective owner of `club.agi.eth`, checked against canonical ENS. The production constructor takes **no arguments**. All administration follows the live ENS owner from deployment onward; the disposable deployment wallet receives no ownership, administration or recovery privilege. A changed ENS owner requires fresh checks and approval, not an ownership-handover transaction from the deployer.

## 1. Prepare Ubuntu

Use a supported, updated 64-bit Ubuntu installation and a normal user account. Keep the checkout in a private working directory, outside a web server or shared/synchronized folder. Run project commands without `sudo`.

Install the system prerequisites through Ubuntu's package manager:

```bash
sudo apt update
sudo apt install git ca-certificates python3 openssl
```

Install **Node 22.16.0 or later within 22.x**, with **npm 10.x**, using the [official Node installation instructions](https://nodejs.org/en/download). The Node version in Ubuntu's default package repository may differ; do not assume `apt install nodejs npm` supplies the required versions. Node 24 is outside this project's declared range. If you already use a trusted Node version manager, select Node 22 with it. You do not need a global Hardhat installation or `hardhat --init`.

Install Chrome/Chromium from its official distribution or Ubuntu's supported packages. Check in this terminal:

```bash
node --version
npm --version
python3 --version
openssl version
```

The browser tests detect `/usr/bin/google-chrome` and `/usr/bin/chromium`. For a different executable, set `CHROME_BIN` to its real absolute path. A confined Snap/Flatpak browser may not allow the temporary test profile/certificate paths; inspect the reported failure and use a compatible browser installation. Keep the application's browser security policy intact. The automatic checks do not replace acceptance on your real wallet and browser.

## 2. Use the reviewed source and lockfile

Run commands one at a time. Stop when a command fails.

```bash
git clone https://github.com/MontrealAI/agi-club-entitlement-registry.git
cd agi-club-entitlement-registry
git rev-parse HEAD
git status --short
sha256sum --check MANIFEST_SHA256.txt
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
npm run qualify
```

Confirm the displayed commit is the one reviewed for deployment. Keep that checkout unchanged through qualification, plan approval and broadcasting. Do not run `npm update`, `npm audit fix`, or pull new source into an approved deployment checkout.

**Expected qualification result:** all eight stages pass; `qualification/LOCAL_RELEASE.json` says `status: PASS` and `sourceUnchanged: true`. Save the complete qualification reports and logs. Automated test fixtures are fictitious and stay on local test chains; these tests do not create a production benefit or send mainnet transactions.

For an optional free local deployment rehearsal, use [Hardhat section C](HARDHAT_DEPLOYMENT.md#c-local-contract-rehearsal--no-real-membership-or-gas). Its report must also show `entitlementCount: 0` and `claimsCreated: 0`. Never fund Hardhat's public test accounts.

## 3. Complete the remaining production evidence

Passing local tests is necessary but does not clear the deployment gate. Create `.env` without overwriting an existing file, and restrict its permissions:

```bash
umask 077
test -e .env || cp .env.example .env
chmod 600 .env
```

Edit it locally. Keep keys, RPC credentials, passwords and private reports out of GitHub and chat. Leave values unused at this stage blank.

| Required before a deployment plan | What to provide |
|---|---|
| Real mainnet-fork rehearsal | Private read-only `MAINNET_FORK_RPC_URL`, a finalized `MAINNET_FORK_BLOCK`, and representative real `MEMBER_LABELS`; confirm `EXPECTED_ADMIN`. Follow [section E](HARDHAT_DEPLOYMENT.md#e-read-only-upstream-mainnet-fork). |
| Independent reviews and actual workflow acceptance | Source-bound security/legal review and real wallet, private-request workflow evidence for the empty deployment scope. Review a chosen benefit and fulfillment separately with `npm run launch:gate` before its limited canary. Follow [section F](HARDHAT_DEPLOYMENT.md#f-independent-review-and-real-device-rehearsal). Fictitious staging data does not select or publish your first offering. |

After configuring the read-only fork, run:

```bash
ALLOW_READ_ONLY_FORK=yes npm run test:fork
npm run release:gate
```

Inspect `qualification/DEPLOYMENT_GATE.json`. **`BLOCKED` means stop:** complete the named missing evidence. Do not edit a failed report to say `PASS` or bypass the broadcaster's checks. `EVIDENCE_READY_FOR_PRINCIPAL_REVIEW` means the evidence is assembled; the root holder must still approve the exact deployment plan.

## 4. Prepare, approve and deploy the empty contract

Follow [Hardhat sections G–H](HARDHAT_DEPLOYMENT.md#g-prepare-an-unsigned-empty-registry-plan) for the explicit budget, disposable deployer address and encrypted keystore, unsigned plan, root-holder signature and one-time broadcast. Neither a gas budget nor a deployer address is prefilled. Never export the root wallet's seed or private key.

`npm run prepare:mainnet` sends no transaction. The only documented production broadcast command is `npm run deploy:mainnet`, with its explicit one-time acknowledgement and signed approval. Do not deploy the configurable test core, run test scripts against mainnet, or enter constructor arguments for `AGIClubEntitlementRegistryMainnet`.

If broadcasting is interrupted, preserve `.local/deployment-broadcast.json` and follow the read-only recovery instructions in section H. An RPC timeout is not permission to send again.

## 5. Verify now; select your first offering later

Follow [Hardhat section I](HARDHAT_DEPLOYMENT.md#i-verify-before-member-access) for finalized inspection, Etherscan source verification and the reviewed contract/hash/HTTPS-origin configuration. Publish only the built public site when that site is ready; the source repository and private deployment folder are not website assets.

After writing the public configuration, rerun `npm run qualify` and review the new source fingerprint before acceptance on the final host. A correctly configured registry remains eligible for qualification; incomplete settings or an insecure origin must fail.

On the verified production contract, Etherscan **Read Contract** should show `entitlementCount = 0` before you create any benefit. `admin()` must match the effective owner of `club.agi.eth`; check `isAdmin` for that owner and for the disposable deployer. The latter must return `false`. Website configuration omits `--entitlement` to follow the admin-managed catalogue without a prefilled benefit list.

You may stop with the verified registry empty. When the real offering is decided and reviewed, create it deliberately as a **Draft**, set the French/English titles and your chosen parameters, then open it explicitly. The Draft default is a safety state for a future creation form; it does not create a benefit. Complete the actual limited member/request/fulfillment canary before broad member access. Consult the [Etherscan guide](ETHERSCAN_GUIDE.md) and [operator guide](OPERATOR_GUIDE_EN.md).

For resources, access, services, periodic allocations or other benefits, use the [general benefit design guide](ENTITLEMENT_DESIGN_EN.md). `fulfillmentStaging` belongs to the later `launch:gate` for a chosen benefit; Eventbrite is optional. The empty deployment requires the explicit `EMPTY_REGISTRY_ONLY` review scope. No event must be selected for deployment. The private request is optional for a benefit, but its code/device/privacy acceptance remains a release requirement.
