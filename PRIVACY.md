# Privacy boundary — ZERO MEMBER-CONTACT PERSISTENCE IN THE STATIC APP

## The implementable promise

The application does not persist the member's entered name or email, does not submit them to the static host, and does not write them to Ethereum. They exist temporarily in browser fields, JavaScript references and the private receipt preview.

This release **removes** the optional relay, contact database, automatic sending and private receipt downloads. There is no server-side retention setting because there is no server-side contact service in this product.

## Data flow

| Boundary | What crosses it |
|---|---|
| Public host → browser | Public HTML/CSS/JS/configuration. No external fonts or analytics. The host may record technical access logs such as IP and user agent. |
| Browser → wallet for claim | Public entitlement ID, membership label and transaction. No member name/email. |
| Browser → wallet for request signature | Scope, wallet, membership, claim revision, times, nonce and salted recipient commitment. **No name, email or private salt.** |
| Browser → Ethereum reads | Registry/claim identifiers; ERC-1271 receives a message digest/signature only. No recipient object is passed to chain IO. |
| Browser → clipboard | Complete private receipt, **only after a click and an explicit acknowledgement**. The application clears its references after successful copying. |
| Member's mail application → organizer | Private receipt and contacts, when the member sends them. A mail application/provider may retain drafts even before Send. |
| Operator → chosen fulfillment provider, if needed | Only recipient information necessary for the chosen benefit. This is outside the webpage. |

The receipt's signature authenticates a binding. **It does not encrypt the receipt.** A published receipt would reveal the contacts and association with a wallet. Keep it private.

## Why the salt matters

The browser generates 32 cryptographically random bytes with WebCrypto. SHA-256 covers a fixed protocol-domain string, the salt, normalized name and exact email. The wallet signs only that commitment and the public request scope. The private salt stays with the private recipient object, not in the message sent to the wallet/RPC. This reduces offline guessing from the commitment alone. It is not anonymous cryptography, a zero-knowledge proof, or protection against a compromised browser.

## No intentional persistence

No name/email/receipt is written through localStorage, sessionStorage, IndexedDB, cookies, Cache Storage, a service worker, browser file APIs, application logs, analytics, error reporting or public metadata. There is no recipient-bearing `mailto:` body/query, website query parameter or URL fragment. No form element or form submission is provided.

The static member page explicitly releases private references and empties inputs on clear, successful clipboard handoff, navigation/pagehide, pageshow including cache restoration, account/network changes and after 10 minutes of inactivity. Contact edits invalidate the old packet and an in-flight signature's epoch. Autocomplete and spellcheck are disabled as hints.

The organizer's verifier follows the same no-persistence boundary for pasted receipts and displayed recipients. It clears both on request, navigation/cache restoration, wallet changes and after ten minutes without an input or verification click. Completing a delayed verification does not restart that deadline or overwrite a newer receipt. Clearing during a wallet permission prompt prevents the old receipt from starting verification afterward. Errors use fixed application messages; provider text is never copied into the interface. The verifier offers no receipt download or history.

Qualification exercises both pages in a real browser with fictitious receipts and simulated wallets. It checks cookie/local/session/IndexedDB/cache/service-worker state, traps storage/file/logging attempts, inspects wallet and network calls, and verifies clear/reload behavior. The separate local EVM journey inspects actual claim calldata and logs and checks that receipt verification sends no transaction. These scopes do not establish the behavior of an unreviewed hosting platform, browser extension or real wallet.

**JavaScript cannot guarantee physical erasure of RAM, browser crash dumps, swap, backups, screenshots, keyboard services, extensions, browser autofill or device clipboard history.** The operating system/mail application can persist copies after user-directed handoff. Do not promise “completely private” or that nobody besides the organizer sees the address.

## No unnecessary disclosure

The page does not prefill the email body. Its mailto link contains only the public organizer mailbox and a fixed subject. The user explicitly copies, pastes and sends. The page cannot verify sending, delivery, mailbox control or benefit fulfillment. “Verified request” is not “message sent.”

## Public information and metadata

Wallets, memberships and claim logs are public and potentially identifiable. The promise above concerns the member's entered contact fields. Admin descriptor fields are public strings: never type contact data into an entitlement title, URI, audit reason or other on-chain field. An unconstrained admin cannot be made incapable of deliberately publishing information just by adding a privacy label.

## Hosting requirements

Use a dedicated, reviewed HTTPS origin without analytics, injected scripts, pre-existing service workers or shared untrusted apps. `frontend/_headers` is a template for hosts that support it. The CSP forbids direct page network connections and form submissions; wallet-extension transport operates outside the page. The real wallet/hosting combination must be tested rather than assuming CSP compatibility.

Static hosting and IPFS are not automatic confidentiality guarantees. A compromised host, dependency, wallet or device can change behavior. A GitHub repository may hold code publicly; never commit real requests, mailbox exports, receipts, screenshots, keys or private issuance records. Git ignore rules are a guardrail, not access control.

## Organizer handling

Use a private mailbox and restrict access to any fulfillment provider. Keep a separate private fulfillment register keyed by chain + registry + entitlement + membership node. A new nonce, email or revision is not another allocation. Revocation on Ethereum does not undo external delivery or access. Define retention and deletion for the mailbox, register and provider separately; this code does not automate or certify those policies.

## Suggested participant wording

> Votre nom et votre courriel ne sont ni sauvegardés par cette page ni écrits sur Ethereum. Ils restent temporairement dans votre navigateur. Le wallet signe une empreinte salée, sans recevoir ces coordonnées en clair. Vous choisissez de copier votre demande dans votre propre messagerie ; cette copie et les brouillons peuvent être conservés par votre appareil ou votre fournisseur. Après votre envoi, le Club et, si nécessaire, le prestataire choisi traitent les coordonnées fournies pour cet avantage. Votre wallet et votre claim Ethereum sont publics.
## Legal acknowledgement and external responsibilities

The member page's reading acknowledgement is volatile and starts unchecked. It is cleared with the private fields, including inactivity, navigation and wallet changes. It is not included in a receipt or wallet signature, and creates no persistent acceptance record. Withdrawal invalidates an outstanding claim preparation or private request; it cannot cancel a prompt already delivered to the wallet or undo a submitted transaction. Reject an outstanding prompt in the wallet itself.

The static app's zero name/email persistence does not describe the organizer's email, fulfillment ledger, fulfillment-provider records, device clipboard or hosting access logs. Before a live service, the operator must complete the [legal/privacy release review](docs/LEGAL_RELEASE_REVIEW.md), publish the actual responsible privacy title/contact and applicable processing/retention information, and arrange requests, corrections, deletion and incident handling for the systems it controls. The existing public support mailbox is president@montreal.ai; this repository does not certify a privacy appointment or third-party retention policy. Do not submit member details in GitHub issues or review evidence.

## Optional contact details

Claims require no name or email. The general `/4` private request accepts either contact field, both or neither. Omitted values are empty strings covered by the same salted commitment. Never collect contacts merely to complete a claim. A signed name is not a verified legal identity; a supplied email is not proof of mailbox control. An emailed receipt still reveals its sender’s mailbox even if both contact fields are empty. Use the separate approved privacy process for information this form intentionally does not collect, such as a necessary delivery address.
