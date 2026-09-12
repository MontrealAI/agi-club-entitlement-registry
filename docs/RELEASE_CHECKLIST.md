# Release decisions — four separate gates

## 1. Source publication

- [ ] Publish clean source with no secrets or member data.
- [ ] Inspect contract provenance and the current changes; review the [immutable scope](ENTITLEMENT_DESIGN_EN.md#decide-the-immutable-contract-scope-before-deploying) / [périmètre immuable](ENTITLEMENT_DESIGN_FR.md#décider-du-périmètre-immuable-avant-le-déploiement).
- [ ] Use the reviewed dependency lock and retain candidate status; CI is not mainnet clearance.

## 2. Empty mainnet registry deployment

- [ ] Clean npm installation and advisory review pass.
- [ ] All eight qualification stages pass on unchanged source, including compiler/export, EVM/stateful/practical scenarios, genuine ethers journeys and bilingual browser/privacy checks.
- [ ] Production constructor starts with zero benefits; no benefit is created by deployment or prefilled in creation forms.
- [ ] Canonical ENS mainnet fork passes at a pinned finalized block on representative real memberships.
- [ ] Independent security findings resolved against the exact code, compiler and lock.
- [ ] Qualified [legal review](LEGAL_RELEASE_REVIEW.md) explicitly covers the empty deployment and existing membership/operator/privacy arrangements; future unknown benefits are excluded.
- [ ] Actual root/member wallets, intended mobile path and Safe if used are rehearsed; static contact minimization and commitment-only signing are verified on those devices.
- [ ] Private request, explicit copy/email handoff and verification are staged with fictitious data; the copied email and verified result show the same full AGI Club subname. No first offering needs to be selected.
- [ ] `.local/external-evidence.json` states `deploymentScope: "EMPTY_REGISTRY_ONLY"` and contains the four completed, source-bound reports. `npm run release:gate` passes its evidence checks.
- [ ] Current root holder reviews and signs the exact `AGIClubDeploymentPlan/2`, fee ceiling and expiry, authorizing only empty contract creation.
- [ ] Broadcast once; preserve recovery checkpoint, inspect transaction, finalized runtime and ENS authority; verify exact source on Etherscan before retiring the disposable deployer.

**Stopping here with an empty, verified registry is supported.** No benefit fulfillment report is required for this stage. No event, service, category, quota or first offer is assumed.

## 3. Chosen benefit and limited member canary

- [ ] Define the actual benefit, eligibility, public French/English terms, capacity/window, fulfillment method and minimal contact requirements. Confirm that the immutable contract can enforce the required native rules.
- [ ] Follow the [English](ENTITLEMENT_DESIGN_EN.md#deploy-empty-approve-a-chosen-benefit-later) / [French](ENTITLEMENT_DESIGN_FR.md#déployer-vide--approuver-un-avantage-plus-tard) instructions for `.local/benefit-launch-evidence.json`.
- [ ] Complete `benefitLegalReview` and `fulfillmentStaging` for the exact definition, registry, ID and source. Rehearse duplicates, concurrent operators, revocation, corrections and fulfillment/access cancellation as applicable. Eventbrite is optional.
- [ ] Run `npm run launch:gate`; obtain separate root approval of the reviewed limited canary. This gate's result grants no authority and does not intercept Etherscan calls.
- [ ] Create and read back an approved Draft using the actual admin wallet or Etherscan. Match every setting and both descriptors to the reviewed definition. Open deliberately if public member claiming is intended; curated grants may remain Draft.
- [ ] Confirm catalogue refresh shows root changes without per-benefit site edits in registry mode. Review and requalify any changed site/origin configuration before using it.
- [ ] Record a real root-wallet operation following the [Etherscan guide](ETHERSCAN_GUIDE.md). Never put private requests or contacts into Etherscan.

## 4. Broad member launch

- [ ] An explicitly approved member completes a real claim and finality, or verifies a deliberately granted current claim.
- [ ] If private fulfillment is needed, verify the signed request and any supplied contacts, confirm deliberate handoff, check the private fulfillment record and provide the benefit once. A name and email are not mandatory for every benefit.
- [ ] Participant confirms receipt or use of the actual benefit through the chosen process.
- [ ] Replayed/renewed requests cannot cause duplicate fulfillment; prior records and corrections are reconciled.
- [ ] Support, incident response, access changes, provider responsibilities and applicable retention are owned by the actual operator.
- [ ] Principal records a separate broad-launch decision for the reviewed scope.

Local tests cannot self-authorize real-world steps. Presence/hash checks cannot establish the truth of external assertions. Never change `NOT_EXECUTED` to `PASS` to unblock a command. Changed benefit definitions require new scope-bound reviews.

## Bilingual interface acceptance

- Check all eight public pages in French and English, including keyboard use, mobile reflow, errors and notices. Automated browser qualification covers both languages.
- Test language changes during real wallet approval: temporary private data clears and stale operations cannot complete. Reject pending wallet prompts separately; a language change cannot reverse a submitted transaction.
- Publish and verify both benefit titles. An absent English title falls back to the published French title. No benefit is preconfigured.
- Confirm the copied email includes the full signed subname, while the fixed bilingual mailto subject has an empty body. The signed protocol remains identical across languages.
