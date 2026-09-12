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
3. **Describe it.** Use `setDescriptor` for French/English titles and, if useful, a public HTTPS/IPFS terms or metadata URI and its hash. Public metadata must contain no name, email, access credential or private delivery reference. The site does not fetch, authenticate or fulfill external metadata automatically; make the actual terms available to members through your approved public channels.
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

The release gate requires `fulfillmentStaging`: reviewed evidence for the actual delivery/access/service process chosen, including duplicates, revocation, corrections and contact minimization. It does not require an event or Eventbrite. Keep every other security, legal, wallet, privacy and mainnet-fork requirement intact. If the first offering is undecided, leave it uncreated and unlaunched; an empty deployment does not certify an unknown future offering.
