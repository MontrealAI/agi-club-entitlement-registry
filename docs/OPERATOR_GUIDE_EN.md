# AGI Club — operator guide

[Français](OPERATOR_GUIDE_FR.md) · [Hardhat deployment](HARDHAT_DEPLOYMENT.md) · [Etherscan operations](ETHERSCAN_GUIDE.md)

## Choose your language

Select **English** or **Français** in the header of any public page. The choice follows internal links through a public `?lang=en` or `?lang=fr` parameter; it uses no cookie or browser storage. An explicit choice takes precedence over your browser’s language.

Switching language keeps public administration and Etherscan inputs, but invalidates prepared transactions. On the member page it clears temporary contact details and requests and requires reconnection. In the organizer verifier it clears the receipt and result. A deployment plan remains loaded, but requires fresh acknowledgement. Reject any request already open in your wallet to cancel it there too. Language changes cannot cancel an already submitted transaction or erase a clipboard or email copy.

The signed protocol, JSON field names, contract function names and public identifiers retain their exact technical form in either language. The private email heading contains both languages and the full signed AGI Club subname. Its fixed bilingual subject contains no member data. Browser, wallet and Etherscan interfaces have their own language settings.

## Claim first; request private fulfillment only if needed

Read the [benefit design guide](ENTITLEMENT_DESIGN_EN.md) for practical models and the contract’s limits. The registry is not tied to an event or a ticket provider. A member can claim without name or email. If the published benefit needs no private request, follow its access/use instructions directly after the claim step.

## Handle a private request

1. Receive the member’s email at **president@montreal.ai**. Keep it private. The prepared email includes the full AGI Club subname.
2. Open **the verifier on your approved official origin**, never a tool supplied by the sender. Paste the complete prepared email or its original JSON. A misleading identity heading is rejected.
3. Choose **Verify through my wallet**. Require `VERIFIED_REQUEST_NOT_FULFILLED` and the expected full `membership`. Review the entitlement ID, claimant revision and any supplied contacts. Empty name/email means not supplied; neither a name nor mailbox control is certified. Awaiting finality, a revoked claim or an invalid signature blocks fulfillment.
4. Check the benefit’s published terms and look up the **claimKey** in your private fulfillment register and the relevant provider’s records. Lock that allocation before handling it. A different nonce, recipient or revision is still the same allocation.
5. If eligible and not already fulfilled, provide the resource, access, service, reservation or other agreed benefit through the chosen channel. For a ticket benefit only, a ticketing provider such as Eventbrite may be used. Use only necessary supplied contacts; obtain any genuinely required missing information through your approved private process.
6. Record claimKey, revision, fulfillment status and a private provider reference outside this repository. Confirm receipt/use during acceptance testing. Clear the verifier after use.

Designate one operator or use a shared private administrative lock to prevent concurrent duplicates. The static page has no shared store, delivery status or automatic global lock. Reverify immediately before fulfillment; a subsequent revocation can still occur.

**Zero persistence in the static verifier:** the pasted receipt and result stay in the open page only. Clear, navigation, wallet/language changes and ten minutes without input or a verification click empty them. Delayed verification cannot restore cleared data or extend that deadline. Email, your private register and any fulfillment provider are separate systems with their own retention practices. Do not upload their records or private receipts to GitHub or public hosting.

## Corrections and common questions

- **Already claimed:** use the existing claim. Prepare a new private request only if needed. No new Ethereum transaction is needed merely to regenerate a receipt.
- **Expired request:** after the default 72-hour validity, ask for a new signature for the existing claim; never bypass expiry.
- **Old ticket receipt:** `/3` and earlier formats are incompatible with `/4`. Update both member and verifier, reload and prepare a new request. Do not relabel an old signature.
- **Another email or revision:** reconcile the existing allocation, cancel/replace external delivery or access where appropriate; do not allocate again automatically.
- **Copy unavailable:** select and copy the prepared text manually, then clear the page. Test the real mobile flow before launch.
- **Membership transferred:** the recorded claimant remains the beneficiary until an administrative correction. ENS transfer does not create a second allocation.
- **Admin grants:** grant to current owners in batches of 1–50 distinct labels if the administrator should pay the gas. Private fulfillment still requires the appropriate claimant verification.

## Administration

Deployment and the demonstration start **without any benefit**. Choose permanent ID, category, capacity, dates and titles only when the offer is decided. Create a Draft, set French/English descriptors, review and explicitly Open. Use the portal or Etherscan. In registry mode, members refresh to see administrator changes without a website allowlist edit. An empty English title falls back to the published French title; publish both for a complete bilingual catalogue.

The current effective holder of `club.agi.eth` administers the registry. A Safe must execute its own calls; the disposable deployer receives no privileges. Keep the ENS name valid and controlled. Public fields must contain no contacts, delivery references or access secrets. Revocation frees active capacity but does not cancel an external service, reservation or delivery: reconcile before reassignment.
