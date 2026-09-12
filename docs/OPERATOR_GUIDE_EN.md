# AGI Club — operator guide

[Français](OPERATOR_GUIDE_FR.md) · [Hardhat deployment](HARDHAT_DEPLOYMENT.md) · [Etherscan operations](ETHERSCAN_GUIDE.md)

## Choose your language

Select **English** or **Français** in the header of any public page. The choice follows internal links through a public `?lang=en` or `?lang=fr` parameter; it uses no cookie or browser storage. An explicit choice takes precedence over your browser’s language.

Switching language keeps public administration and Etherscan inputs, but invalidates prepared transactions. On the member page it clears temporary contact details and requests and requires reconnection. In the organizer verifier it clears the receipt and result. A deployment plan remains loaded, but requires fresh acknowledgement. Reject any request already open in your wallet to cancel it there too. Language changes cannot cancel an already submitted transaction or erase a clipboard or email copy.

The signed protocol, JSON field names, contract function names and public identifiers retain their exact technical form in either language. The private email heading contains both languages and the full signed AGI Club subname. Its fixed bilingual subject contains no member data. Browser, wallet and Etherscan interfaces have their own language settings.

## One verified entitlement, one private request, one ticket

The member must have an active claim. Their request signature binds the recipient to that claim, but proves neither legal identity nor control of the email account. It does not prevent later sharing of the final ticket.

1. Receive the email at **president@montreal.ai**. Keep its contents and attachments private.
2. Open **the verifier on your approved official origin**, never a verification tool supplied by the sender. Paste the complete prepared email, including its identity heading and signed JSON receipt, or the original JSON. It stays in the page’s memory.
3. Select **Verify through my wallet**. The result must be `VERIFIED_REQUEST_NOT_A_TICKET`, with the full `membership: example.club.agi.eth` and the expected name/email. The subname comes from the signed label; a conflicting email heading is rejected. Awaiting finality, an invalid signature or a revoked entitlement means no ticket may be issued.
4. Look up the **claimKey** in your private issuance register and Eventbrite orders. The key does not change with an email address, nonce or new signature. A new revision is not a second admission.
5. If the entitlement has never been used for a ticket, manually create one complimentary AGI Club admission in Eventbrite for the name and email **verified in the receipt**, using the appropriate confirmation option.
6. Record the claimKey, revision, status and order number outside the repository. Confirm receipt during the limited production acceptance test. Clear the receipt from the interface after use.

Use your usual private administrative system; never host its records with this static application. To prevent operators issuing duplicates concurrently, designate one issuer or use an administrative lock. The static application has no shared store and provides no automatic global issuance lock.

**Zero persistence in the static verifier:** the pasted receipt and result exist only in the open page. Clear, navigation, wallet or language changes, and ten minutes without input or a verification click empty them. A delayed verification does not extend that deadline or restore a cleared receipt. Reloading restores no contact history. Email, your administrative register and Eventbrite remain separate systems with their own retention practices.

## Common questions

**The member has already claimed:** prepare only the private request, without another transaction. Reloading does not restore contact details; enter them again and sign.

**The request expired (72 hours by default):** ask the member to prepare a new request for the existing claim. Do not bypass verifier expiry.

**Another email or a new revision:** do not issue a second ticket. Confirm the correction, cancel or replace the previous ticket where necessary and reconcile the private register.

**Copying is unavailable:** the member needs an active finalized claim and a signed request. If automatic clipboard access is unavailable, they can select and copy the prepared text manually, then clear the page. Test the actual mobile flow before launch.

**The membership name was transferred after claiming:** the claim remains attached to its beneficiary until an administrative correction. Transfer does not recreate the entitlement.

**The administrator grants claims to members:** grants to current owners allow the administrator to pay the batch’s gas. Each member still signs their own private request, and verification remains required. Use batches of 1–50 distinct labels.

## Member instructions

Verify your membership. Claim your entitlement if it has not already been assigned. Enter your contact details locally, sign a private request, then copy it into your own email application. The site does not transmit your name or email. Where the benefit provides for a ticket, the organizer creates it manually after verification.

## Administration

Production deployment and the administrative demonstration start **without any event**. Choose the permanent identifier, category and capacity only when you decide to create the first benefit. Create a draft, set its French and English titles and optional UTC dates, review it and explicitly open it. The same operations are available through Etherscan.

In registry catalogue mode, members refresh to see new benefits and title changes, without an event list prefilled in the site. The interface uses the title for the selected language. An empty English title falls back to the published French title; the app does not invent or automatically translate benefit terms. Publish both titles with `setDescriptor` for a complete bilingual catalogue. Localized state labels do not change contract values: 1 = Draft, 2 = Open, 3 = Closed, 4 = Archived.

Never place personal data in public titles, references or audit reasons. Revocation releases on-chain capacity **without cancelling an Eventbrite order**. Reconcile both before reassignment.

The effective holder of `club.agi.eth` executes administrative operations. If that holder is a Safe, the calls must come from the Safe itself. Keeping control of the ENS name and its validity is a critical operational dependency. The disposable deployer receives no separate privileges.
