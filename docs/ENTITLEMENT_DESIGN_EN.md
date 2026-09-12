# Choose any benefit — leave the first one undecided

[Français](ENTITLEMENT_DESIGN_FR.md) · [Operator guide](OPERATOR_GUIDE_EN.md) · [Etherscan](ETHERSCAN_GUIDE.md)

The registry starts empty. Deployment does not create an event, service, category or allocation. When you are ready, the effective owner of `club.agi.eth` chooses the benefit and publishes its terms. All existing administration functions are available in the portal or Etherscan.

## Pick the simplest practical model

Examples below are design choices, not configured offerings or promises.

| Benefit | Registry setup you choose | Separate fulfillment, if needed |
| --- | --- | --- |
| Resource or download | One permanent ID for a resource or edition; capacity 0 if no claim limit is intended | Deliver the resource privately or use an independently secured access service. Never put a secret download link in public metadata. |
| Community or software access | One ID for a defined access scope and period | The access service authenticates the claimant and rechecks the active claim. This static site cannot protect hosted private content. |
| Consultation or other service | One ID per defined allocation; capacity limits active allocations | Schedule the appointment and track completion privately. A claim does not reserve a time slot. |
| Priority or early access | Define what priority means in the published terms | Maintain the actual queue or priority rules externally. Claim order does not itself implement a priority queue. |
| Reservation or event admission | One ID per reservation class or edition, with an explicit capacity | Confirm the reservation or issue a ticket through the chosen provider. Eventbrite is an optional example, not a dependency. |
| Physical item or partner perk | Define the item, eligibility and allocation | Collect a delivery address only through an appropriate separate private channel; this app has no address field. Track delivery or redemption privately. |
| Periodic allowance | A distinct ID for each period or allocation | Track fulfillment separately for each ID. Reopening an old ID never resets a member’s existing claim. |
| Bundle of benefits | One ID if the bundle is one indivisible allocation; separate IDs for independently managed parts | A single claim does not track quantities, partial delivery or each bundle component; use a private fulfillment record. |

A category is a descriptive `bytes32` value. It does not activate special contract behavior or require a predefined category. Choose your own stable category label; portal suggestions are optional. No payment, token mint, financial return, inventory backend, subscription billing or automatic delivery is included.

## Create later, in five steps

1. **Define the offer.** Decide its scope, eligibility, availability, fulfillment method, any required contact details, cancellation/support process and applicable terms. Publish French and English terms. Review obligations for that actual offer before opening it.
2. **Create a draft.** Choose a permanent ID, your category, capacity and optional UTC claim window. In Etherscan use `createEntitlement` with state `1`. No field selects your first benefit for you. Capacity `0` means unlimited active claims; a blank portal date is encoded as `0` (no boundary).
3. **Describe it.** Use `setDescriptor` for French/English titles and, if useful, a public HTTPS/IPFS terms or metadata URI and its hash. Public metadata must contain no name, email, access credential or private delivery reference. Members can select the benefit and use **Read this benefit’s details** to inspect its published titles, active capacity, claim window and instructions at one observed block. HTTPS instructions open only on an explicit click; other URIs remain text. The site does not fetch, authenticate or fulfill external metadata automatically.
4. **Check and open.** Read back the ID, category, titles, capacity, dates and state. Rehearse the chosen fulfillment flow. Explicitly set state `2` (Open). Members refresh the catalogue; registry mode requires no per-benefit site configuration.
5. **Manage.** Adjust descriptors, category, capacity, claim window and state through the administrator controls. Use grants, revocations, reinstatements and reassignment only with the appropriate external reconciliation. Read current state before confirming a transaction.

## Understand the limits before choosing a model

- The claim key is **chain + registry + entitlement ID + membership node**. Each membership can have one active claim for that ID; different ENS memberships are separate identities even if one wallet holds them. This is not one claim per civil person.
- Capacity counts **active claims**, including grants. Revocation frees capacity even if the benefit was already delivered. It is not lifetime stock or a count of completed deliveries. Reconcile external inventory before issuing a replacement.
- Claim opening and closing times control new member claims, not the expiry of an already active claim or delivered benefit. Closing, archiving or pausing does not automatically disable a third-party service. Publish access expiry rules separately and enforce them at the service. Administrative grants remain an explicit exception path and must respect the published offer.
- The permanent ID and historical records cannot be erased or reset. Correct current records through the exposed operations; create a new ID for a new independent allocation. Capacity cannot be lowered below the active claim count. Archived offerings can be managed through the contract’s existing state controls; this is not an upgradeable contract.
- A membership transfer does not grant a second use. An administrative correction changes the claim revision, not its claim key. A renewed request, different email or new signature also does not create another allocation.
- A claim records entitlement, not delivery, usage, redemption, a booking or a legal identity. A verified private request is a point-in-time check of the current claimant and signature; it cannot guarantee later availability or block a later revocation.

For ongoing access, authenticate the user with a fresh, service-scoped challenge and inspect current claim state through a separately reviewed integration. Do not reuse the emailed fulfillment receipt as a general login credential. The current recorded claimant may differ from a new ENS holder after a transfer; apply the published access policy and reconcile administrative changes.

## Request only what is necessary

Members can claim without entering a name or email. If the benefit needs private fulfillment, they may prepare a signed request with neither contact field, name only, email only or both, depending on the actual need. Empty fields mean **not supplied**, never verified identity or mailbox ownership. Sending even an empty-contact receipt by email still exposes the sender’s mailbox to the email systems.

The `/4` request is general and bound to one entitlement and claim revision. Old `AGIClubTicketRequest/3` signatures are deliberately rejected; update both member and verifier code, reload, then prepare a new request for the existing claim. Do not edit or relabel an old receipt. No new on-chain transaction is required for this migration.

## Decide the immutable contract scope before deploying

This is a general **binary allocation registry**: one historical record for each entitlement ID and membership node. It can support many kinds of benefit, but it is not a general execution engine. The same contract does not acquire new rules when an administrator changes a category or public document.

| Requirement | What the deployed contract can enforce | What needs another system or design |
| --- | --- | --- |
| Public member allocation | Current valid direct `club.agi.eth` membership owner, Open state, optional claim window, active capacity, uniqueness | Extra age, territory, tier, prerequisite or contractual eligibility is not checked by the contract. |
| Curated or invitation-only allocation | Keep the ID in Draft; the root holder grants selected valid memberships individually or in atomic batches | Selection/review happens externally. Do not open the ID if all valid memberships must not self-claim. Draft and pause do not prevent root grants. |
| Reservations | Separate ID and capacity for each independently allocated class or slot | No conflict detection across IDs, queue, booking calendar or atomic member claim of several IDs. |
| Recurring allocations | A new independent ID per period; duplication creates an empty Draft | No automatic renewal, billing, or reset of the old record. |
| Bundles | One indivisible allocation or independent IDs per component | No quantities, partial use, cross-component atomicity or shared capacity across IDs. |
| Continuous access | Public getters expose the active claim, recorded claimant, revision and history | The consuming service must authenticate users and enforce its own expiry, suspension and membership-transfer policy. |
| Corrections and migration | Root-controlled revocation, reinstatement, reassignment and explicit audited override | Overrides/reassignments can name a wallet that does not own that membership; consumers must choose whether current ownership is additionally required. |
| Consumables or credits | A binary right to a defined allocation can be recorded | No redemption ledger, decrementing balances, partial fulfillment or lifetime stock counter. Revocation releases active capacity even after delivery. |
| Payments, tokens or revenue rights | None | These require a separate, specifically designed and reviewed system; metadata cannot add financial functionality. |

**Fixed after deployment:** canonical ENS registry and root NameWrapper, the `club.agi.eth` authority node, direct lowercase ASCII membership labels (1–63 bytes), one lifetime record per ID/node, public permanent history and the binary claim model. There is no proxy, upgrade entry point, admin-role delegation or alternative recovery owner. An unavailable root authority fails closed; the disposable deployer cannot recover control. Future incompatible ENS infrastructure or new native rules require a new contract and an explicit migration policy.

**Editable through existing root-only methods:** arbitrary categories, French/English descriptors, public metadata URI/hash, claim state/window, capacity (not below active claims), membership-wrapper support and claim corrections. Archived IDs can be reopened, but history is never reset. Batches are limited to 50 and read pages to 100; the member UI loads 25 items at a time. Titles and URI have byte limits; the Etherscan helper validates those inputs.

Changing terms, category or metadata **does not increment claim revision**. A private request binds the ID and claim revision, not acceptance of revised terms or a frozen metadata hash. Use a new ID for a materially different allocation and retain any legally required assent through a separately reviewed process. Never treat a descriptor edit as retroactive member consent.

Run `npm run test:scenarios` to exercise the production constructor and these boundaries in a guarded local EVM. It covers an empty registry, arbitrary categories, shared-wallet memberships, capacity reuse, slots, curated grants, periods, bundles, access state, descriptor edits, transfers, migration and a mined batch rollback. Results appear in `qualification/contract-scenarios.json`; `npm run qualify` includes the suite. These simulations use fictitious ENS infrastructure and cannot replace a pinned real mainnet fork, independent audit or real service acceptance. If you require any of the unsupported rules **inside this immutable contract**, resolve that design before deploying it.

## Deploy empty; approve a chosen benefit later

`npm run release:gate` covers **EMPTY_REGISTRY_ONLY**. The private external-evidence manifest must explicitly state that scope and contain the four completed reviews: `independentSecurityReview`, `legalReview`, `realWalletStaging` and `privateRequestStaging`. Security, legal, real-device/privacy and pinned-fork checks remain required; fictitious staging exercises the shipped request code without selecting your first offering. The root signs an `AGIClubDeploymentPlan/2` authorizing only exact contract creation. Old `/1` plans and signatures must be regenerated and reviewed; do not relabel them.

Once you choose a benefit, use a separate gate **before asking the root to approve its limited canary**:

1. Write `.local/benefit-definition.txt` with the exact intended ID, category, capacity, claim window/state, French/English titles, public URI/hash, eligibility, access/delivery scope, any required private data, cancellation and support arrangements. Keep operational secrets in protected review material; public terms and all on-chain fields must contain no member contacts or credentials.
2. Copy `releases/benefit-launch-evidence.example.json` to `.local/benefit-launch-evidence.json` without overwriting existing evidence. Fill the current source SHA-256, verified mainnet registry address and runtime hash, permanent entitlement ID and the definition file SHA-256. Addresses and on-chain hashes use lowercase `0x` hex; file hashes are lowercase SHA-256 without `0x`.
3. Run `npm run launch:gate`. While reviews are missing it correctly returns `BLOCKED`; a valid definition produces `benefitScopeSha256`. Give that exact scope and definition to the reviewers. Obtain `benefitLegalReview` and `fulfillmentStaging` for the actual proposed benefit, including duplicate requests, concurrent operators, revocation/corrections and minimal contacts. Record the real reviewer, unchanged scope hash and exact report-file SHA-256; mark `PASS` only when the review was completed successfully.
4. Rerun the gate. `EVIDENCE_READY_FOR_BENEFIT_REVIEW` assembles evidence for root review; it grants no deployment, canary or broad-launch permission. The gate binds definition/report bytes, source and runtime identity; it does not read or approve the definition's meaning or current on-chain settings. The root must compare the reviewed definition with current chain state before each relevant operation.
5. After separate root approval, create/read back the Draft and deliberately open it if appropriate (curated grants can remain Draft). Complete actual limited member and fulfillment acceptance before a separate broad-launch decision. Changing the benefit scope requires new matching review evidence.

`qualification/BENEFIT_LAUNCH_GATE.json` is a hash/presence report, not a professional opinion or proof that delivery occurred. Local gates do not intercept Etherscan or root-wallet calls. Eventbrite is optional; no event, service or other first offering is required for an empty deployment. Keep the registry empty for as long as needed.
