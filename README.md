# ∞ AGI CLUB — ENTITLEMENT REGISTRY
## Static Privacy Edition · 2.3.0-rc.1

**VERIFY MEMBERSHIP → CLAIM ENTITLEMENT → PROVE CLAIM**

Reusable AGI Club benefits administered by the **current effective holder of `club.agi.eth` on Ethereum mainnet**. Deployment, creation forms and the admin demo start with **no preconfigured event or benefit**.

After the one-time approved contract/origin configuration, the member catalogue follows benefits created and modified through Etherscan. Members refresh the catalogue; no per-event website edit is needed. Optional explicit allowlists remain supported. The admin controls public titles, metadata, categories, quotas, dates, states, claim corrections, member-wrapper support and pausing. Permanent IDs, historical records, canonical ENS authority and deployed bytecode retain their contract-defined protections.

The copy-ready email to **president@montreal.ai** visibly includes the full **`subname.club.agi.eth`** and the signed receipt. The organizer verifier displays that identity from the verified signed label. The email link contains no member data; sending remains an explicit action in the member’s own mail application.

> **Member names and email addresses are not persisted by the webpage or written on-chain by its claim flow. The application has no email relay, contact database, analytics, or automatic request transmission.**
>
> Contact text is temporary browser state. After explicit consent, the member can copy the private receipt to the device clipboard and send it with their own mail application. Clipboard, wallet extensions, device, draft, email-provider and Eventbrite copies are outside the page's control. This is not anonymity or guaranteed erasure of RAM.

### English / Français

Every public page offers **English** and **Français**, including runtime notices, errors and approvals. The language choice follows internal links without cookies or browser storage. Public administration/Etherscan inputs remain intact; switching clears temporary private requests and invalidates pending approvals. Published benefit titles follow the selected language, with a French-title fallback when English is empty. The signed protocol remains identical. [English operator guide](docs/OPERATOR_GUIDE_EN.md) · [Guide français](docs/OPERATOR_GUIDE_FR.md).

Toutes les pages publiques proposent **Français** et **English**, y compris les messages et confirmations. Aucun nom ni courriel n’est enregistré pour mémoriser ce choix. Le changement de langue efface les demandes privées temporaires et annule les autorisations préparées.

### Start here

Open **[START_HERE.html](START_HERE.html)**. No installation is needed to read it.

| I want to… | Read this |
|---|---|
| Upload through the GitHub website | [GitHub UI guide](docs/GITHUB_WEB_UPLOAD.md) |
| See a local demo, rehearse a deployment or deploy an approved canary | [Hardhat English](docs/HARDHAT_DEPLOYMENT.md) / [Français](docs/HARDHAT_DEPLOYMENT_FR.md) |
| Verify the source and operate every public function through Etherscan | [Bilingual Etherscan guide](docs/ETHERSCAN_GUIDE.md); open **Etherscan** in the built website for copy-ready values |
| Understand exactly where contact data goes | [Privacy policy and implementation boundary](PRIVACY.md) |
| Review conditions, regulatory exposure and legal release requirements | [Bilingual public notice](frontend/legal.html), [operator/counsel review](docs/LEGAL_RELEASE_REVIEW.md) |
| Issue one complimentary ticket | [English](docs/OPERATOR_GUIDE_EN.md) / [Français](docs/OPERATOR_GUIDE_FR.md) |
| Evaluate readiness | [Release checklist](docs/RELEASE_CHECKLIST.md), [actual evidence](evidence/RELEASE_STATUS.json) |

### Status — read before deployment

This is a **source release candidate**, not an independently audited or mainnet-authorized deployment. Source publication is separate from hosting a live portal and from deploying Ethereum bytecode. No chain address is invented, and no production wallet, gas, email or Eventbrite action was performed for this delivery.

Production preparation also requires a completed deployment-specific `legalReview`, bound to the reviewed source and private report bytes. Public notices preserve mandatory rights and the MIT license; they do not establish an exemption, eliminate liability or replace qualified counsel's review of the actual operator, membership offering and privacy operations. The member acknowledgement stays in memory only.

The contract version is **2.1.1**, preserved byte-for-byte from the previous source candidate. Repository version is **2.3.0-rc.1**. The new privacy-preserving request schema is **`AGIClubTicketRequest/3`**. Old request formats are rejected rather than silently upgraded.

A genuine npm-generated `package-lock.json` is committed, including the pinned ethers 6.17.0 dependency and tmp 0.2.7 override. Use `npm ci` for reproducible installation, then run the non-deploying CI. The supplied frontend is source; build `dist/site` and complete the release gates before publishing a live claim service. Reports under `evidence/` describe the original source delivery; current execution reports are generated under `qualification/` and attached to GitHub Actions runs.

### Architecture

```text
Static member page ← wallet (membership / public Ethereum reads)
        ↓
claim(entitlementId, membershipLabel) → Ethereum registry
        ↓
name + email + random private salt → local SHA-256 commitment
        ↓
wallet signs scoped commitment-only message (no raw contact text)
        ↓
member explicitly copies private receipt → own email application
        ↓
president@montreal.ai → local receipt verification → manual Eventbrite ticket
```

**There is no Worker, D1, backend, webhook, form endpoint or automatic sender in this release.** GitHub holds source; a suitable static HTTPS host serves public assets. The static host is never submitted a recipient form.

### Administrator and future benefits

The production subclass fixes the canonical ENS Registry and NameWrapper. Every privileged call resolves the holder of `club.agi.eth`; the deployer has no separate authority. Ownership is not the ENS address-resolution record. A Safe must execute the administrative transaction itself; an individual signer is not automatically the contract administrator.

Deploy from a separate disposable wallet. The expected initial root holder supplied by the operator is `0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201`, prefilled as `EXPECTED_ADMIN` in `.env.example`. Deployment checks must confirm that address against canonical ENS. The production constructor needs no owner argument or post-deployment handover; ENS ownership determines administration from the beginning and after transfers. The deployment plan rejects using the root administrator as the disposable deployer.

The admin can create/duplicate benefits, change windows/categories/capacities/descriptors, open/close/archive, grant in bounded batches, make explicit exceptions, revoke/reinstate/reassign and pause self-claims. History is not erased. The key is **entitlement + membership node**, not wallet. A transfer does not create a second self-claim.

Full privileges means the management operations exposed by this immutable code—not a proxy upgrade, arbitrary future protocol compatibility, member-asset custody, or automatic Eventbrite cancellation. Expiry/parent control or loss of the root name can affect administration. No hidden recovery admin is provided.

All **52 public functions** (33 reads and 19 writes) are covered by the Etherscan helper and checked against the compiled production ABI. The helper prepares public parameters, including hashes, UTC seconds and batches, without connecting a wallet or submitting transactions. Etherscan operates the deployed registry; website configuration and private receipt handling remain separate. `npm run export:etherscan` produces exact Standard JSON verification input under `dist/etherscan/`, also available as the `etherscan-verification-not-deployed` Linux CI artifact. Source verification and parameter preparation do not grant mainnet clearance.

### Member experience

1. Connect the wallet and enter one direct ASCII `label.club.agi.eth` membership.
2. Claim, or use the active claim already assigned to the wallet. Network fees may apply; no token approval.
3. Enter name/email locally. Sign a message containing a **salted contact commitment**, not plaintext contacts.
4. Explicitly copy the receipt and paste it into a message to **president@montreal.ai**. Send it yourself.
5. Vincent verifies the signature, current/finalized claim and private issuance register, then manually creates one ticket.

The copy button clears the page's contact fields and application references after a successful handoff. A fixed `mailto:` link opens a **blank body**; no member contacts go into a URL. The page never claims that mail was sent or received. Reloading may require a new signature, **not a second Ethereum claim**.

### Build on a network-enabled machine

For your first preview, use Node **22.x (22.16.0+)** and npm **10.x**, open a terminal in the repository folder, and run one command at a time:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build:site
npm run serve
```

Open **http://127.0.0.1:8080** and select your language. Choose **Members → Explore without a wallet → Verify**, or **Membres → Explorer sans portefeuille → Vérifier**. No funded wallet or RPC key is needed for this demonstration. Keep the terminal open; Ctrl+C stops the preview. This first preview is separate from the qualification below.

Before deployment:

```bash
# Verify and install the committed lock.
npm run check:lock
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
npm run qualify
```

Node 22.16.0 or a compatible later Node 22, npm 10. The compiler/tool versions are pinned in `package.json`. Offline tests also need Python 3 (`python3` on macOS/Linux, `python` on Windows); full browser qualification needs Chrome/Chromium and OpenSSL. `npm run test:offline` works without downloaded packages using explicitly labelled test-only crypto/chain fixtures; it is not production-library qualification.

```bash
npm run node          # Terminal 1: local chain only
npm run deploy:local  # Terminal 2: LOCAL rehearsal; never real memberships
```

Use [the full guide](docs/HARDHAT_DEPLOYMENT.md) for fork, review, canary approval and mainnet steps. Never import public test keys into a wallet holding real assets.

### English / français

The live operator and member interfaces are French. English documentation is included; this release does not claim full bilingual UI parity. See [le guide opérateur](docs/OPERATOR_GUIDE_FR.md).

### Licence and disclosure

MIT. OpenZeppelin notices are preserved. ethers is installed as an exact dependency and its official distribution/licence is copied by the public-site builder; no crypto stub may be published instead. Report vulnerabilities privately to the address in [SECURITY.md](SECURITY.md), without member contact data.
