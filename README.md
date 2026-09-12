# ∞ AGI CLUB — ENTITLEMENT REGISTRY
## Static Privacy Edition · 2.3.0-rc.1

**VERIFY MEMBERSHIP → CLAIM ENTITLEMENT → PROVE CLAIM**

Reusable AGI Club benefits administered by the **current effective holder of `club.agi.eth` on Ethereum mainnet**. IA 101 is the first configured example, not a one-event contract.

> **Member names and email addresses are not persisted by the webpage or written on-chain by its claim flow. The application has no email relay, contact database, analytics, or automatic request transmission.**
>
> Contact text is temporary browser state. After explicit consent, the member can copy the private receipt to the device clipboard and send it with their own mail application. Clipboard, wallet extensions, device, draft, email-provider and Eventbrite copies are outside the page's control. This is not anonymity or guaranteed erasure of RAM.

### Start here

Open **[START_HERE.html](START_HERE.html)**. No installation is needed to read it.

| I want to… | Read this |
|---|---|
| Upload through the GitHub website | [GitHub UI guide](docs/GITHUB_WEB_UPLOAD.md) |
| Compile, test and deploy using Hardhat | [Hardhat guide](docs/HARDHAT_DEPLOYMENT.md) |
| Understand exactly where contact data goes | [Privacy policy and implementation boundary](PRIVACY.md) |
| Issue one complimentary ticket | [French operator guide](docs/OPERATOR_GUIDE_FR.md) |
| Evaluate readiness | [Release checklist](docs/RELEASE_CHECKLIST.md), [actual evidence](evidence/RELEASE_STATUS.json) |

### Status — read before deployment

This is a **source release candidate**, not an independently audited or mainnet-authorized deployment. Source publication is separate from hosting a live portal and from deploying Ethereum bytecode. No chain address is invented, and no production wallet, gas, email or Eventbrite action was performed for this delivery.

The contract version is **2.1.1**, preserved byte-for-byte from the previous source candidate. Repository version is **2.3.0-rc.1**. The new privacy-preserving request schema is **`AGIClubTicketRequest/3`**. Old request formats are rejected rather than silently upgraded.

A genuine npm lockfile could not be generated in this build environment. The included manual GitHub workflow generates one on a network-enabled runner; **review and commit that real lock, then run the non-deploying CI**. The supplied frontend is source, not an already-qualified `dist/site` build. Do not publish it as a live claim service before the gates pass.

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

The admin can create/duplicate benefits, change windows/categories/capacities/descriptors, open/close/archive, grant in bounded batches, make explicit exceptions, revoke/reinstate/reassign and pause self-claims. History is not erased. The key is **entitlement + membership node**, not wallet. A transfer does not create a second self-claim.

Full privileges means the management operations exposed by this immutable code—not a proxy upgrade, arbitrary future protocol compatibility, member-asset custody, or automatic Eventbrite cancellation. Expiry/parent control or loss of the root name can affect administration. No hidden recovery admin is provided.

### Member experience

1. Connect the wallet and enter one direct ASCII `label.club.agi.eth` membership.
2. Claim, or use the active claim already assigned to the wallet. Network fees may apply; no token approval.
3. Enter name/email locally. Sign a message containing a **salted contact commitment**, not plaintext contacts.
4. Explicitly copy the receipt and paste it into a message to **president@montreal.ai**. Send it yourself.
5. Vincent verifies the signature, current/finalized claim and private issuance register, then manually creates one ticket.

The copy button clears the page's contact fields and application references after a successful handoff. A fixed `mailto:` link opens a **blank body**; no member contacts go into a URL. The page never claims that mail was sent or received. Reloading may require a new signature, **not a second Ethereum claim**.

### Build on a network-enabled machine

```bash
# Only while a lock is absent: generate, review, then commit it.
npm run bootstrap:lock
npm run check:lock

# Thereafter, use the reviewed lock for every clean installation.
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
npm run qualify
```

Node 22.16.0 or a compatible later Node 22, npm 10. The compiler/tool versions are pinned in `package.json`. Linux browser tests need Chrome/Chromium and OpenSSL. `npm run test:offline` works without downloaded packages using explicitly labelled test-only crypto/chain fixtures; it is not production-library qualification.

```bash
npm run node          # Terminal 1: local chain only
npm run deploy:local  # Terminal 2: LOCAL rehearsal; never real memberships
```

Use [the full guide](docs/HARDHAT_DEPLOYMENT.md) for fork, review, canary approval and mainnet steps. Never import public test keys into a wallet holding real assets.

### English / français

The live operator and member interfaces are French. English documentation is included; this release does not claim full bilingual UI parity. See [le guide opérateur](docs/OPERATOR_GUIDE_FR.md).

### Licence and disclosure

MIT. OpenZeppelin notices are preserved. ethers is installed as an exact dependency and its official distribution/licence is copied by the public-site builder; no crypto stub may be published instead. Report vulnerabilities privately to the address in [SECURITY.md](SECURITY.md), without member contact data.
