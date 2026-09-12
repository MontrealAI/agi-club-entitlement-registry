[Hardhat English](HARDHAT_DEPLOYMENT.md) · [Hardhat français](HARDHAT_DEPLOYMENT_FR.md) · [Operator English](OPERATOR_GUIDE_EN.md) · [Organisateur français](OPERATOR_GUIDE_FR.md)

# AGI CLUB — Etherscan, pas à pas / step by step

**FR — Après un déploiement approuvé et une vérification exacte du code, les 52 fonctions publiques du registre sont accessibles depuis Etherscan : 33 lectures et 19 écritures.** L’assistant **Etherscan** du site prépare leurs valeurs, sans wallet ni transaction. Il ne collecte aucun nom de participant ni courriel. Les lectures peuvent se faire sans wallet ; les écritures exigent le bon wallet et des frais réseau.

**EN — After an approved deployment and exact code verification, all 52 public registry functions are available through Etherscan: 33 reads and 19 writes.** The website’s **Etherscan** helper prepares their values without a wallet or transaction. It collects no participant names or email addresses. Reads need no wallet; writes require the correct wallet and network fees.

| Besoin / Goal | Chemin / Route |
|---|---|
| Déployer / Deploy | Complete the [Hardhat deployment guide](HARDHAT_DEPLOYMENT.md). The approved, bounded deployment uses the disposable wallet. |
| Publier le code exact / Publish exact source | Etherscan **Contract → Code → Verify & Publish**, using the public Standard JSON package below. |
| Lire / Read | Etherscan **Contract → Read Contract**. |
| Configurer ou réclamer / Configure or claim | Etherscan **Contract → Write Contract**. Select the function by **name**, not its display number. |
| Préparer les valeurs / Prepare values | Open **Etherscan** from the registry website. Choose Français/English, the approved address and an operation. |
| Configurer le site / Configure the website | The [public website configuration](HARDHAT_DEPLOYMENT.md#i-verify-before-member-access) remains a separate hosting operation. Etherscan cannot edit static website files. |
| Reçu privé et billet / Private receipt and ticket | Use the member page and private verifier, then the deliberate private-message and ticket workflow. Never paste these data into Etherscan. |

## 1. Déployer puis vérifier / Deploy, then verify

**FR.** La vérification Etherscan publie les sources qui correspondent au contrat déjà déployé. Elle ne déploie pas le contrat, ne réalise pas un audit et n’autorise pas un lancement. Terminez d’abord les barrières du guide Hardhat : qualification complète, fork mainnet réel, revues indépendantes, acceptation avec de vrais wallets, puis approbation limitée du détenteur racine. Le contrat de production est `AGIClubEntitlementRegistryMainnet` et n’a **aucun argument de constructeur**. Le déployeur jetable paie le gaz sans recevoir de privilège.

**EN.** Etherscan source verification publishes source matching an already-deployed contract. It does not deploy, audit or authorize launch. Complete the Hardhat gates first: full qualification, real mainnet fork, independent reviews, real-wallet acceptance and the root holder’s bounded approval. The production contract is `AGIClubEntitlementRegistryMainnet` with **no constructor arguments**. The disposable deployer pays gas and receives no privileges.

Generate the public verification package / Générer le dossier public :

```bash
npm run export:etherscan
```

This compiles with the production profile and recompiles the exact exported Standard JSON to check creation bytecode, runtime template and ABI. It rejects stale compiler evidence, changed public sources, extra source files, incorrect compiler settings and mismatched bytecode. A failed export removes the previous generated package. / Cette commande compile avec le profil de production puis recompile le JSON exact exporté ; les résultats doivent correspondre. Un export échoué retire le dossier généré précédent.

The output is **`dist/etherscan/`**. Without a local toolchain, download **`etherscan-verification-not-deployed`** from the successful Linux CI run for the reviewed commit. / Sans outil local, téléchargez cet artifact du run Linux réussi correspondant au commit revu.

| Fichier / File | Utilisation / Use |
|---|---|
| `standard-input.json` | Upload this single file using **Solidity (Standard-Json-Input)**. It already contains the reviewed public sources and settings. |
| `VERIFICATION.json` | Read the exact compiler version, contract path, source digest and creation-code hash. |
| `contract-abi.json` | Full public ABI, including functions, events and errors; useful for contract-wallet execution tools. |
| `README.txt` | Short bilingual instructions. |

**Etherscan procedure / Procédure Etherscan**

1. Open `https://etherscan.io/address/YOUR_APPROVED_REGISTRY_ADDRESS`. Verify the complete address against the approved deployment record. / Vérifiez l’adresse complète avec le dossier approuvé.
2. Open **Contract → Code → Verify & Publish**. / Ouvrez ces onglets.
3. Select **Solidity (Standard-Json-Input)** and the exact compiler version in `VERIFICATION.json`. Current pinned version: **`v0.8.37+commit.f401782d`**. Select **MIT** for the license. / Choisissez cette méthode, la version exacte et la licence MIT.
4. Upload **`standard-input.json`**. Preserve all source paths and settings: **optimizer enabled, 200 runs, `viaIR: true`, `evmVersion: shanghai`**. Do not flatten the source. / Ne fusionnez pas les sources et ne modifiez aucun réglage.
5. If asked to select the contract, use **`project/contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet`** from the manifest. Hardhat’s compiler input includes the `project/` prefix; keep it. / Conservez le préfixe `project/`.
6. Leave constructor arguments **empty**. No linked-library addresses are required. Complete the website’s verification prompt. / Arguments du constructeur vides ; aucune adresse de bibliothèque liée.
7. Require **Source Code Verified — Exact Match**, then open **Read Contract** and check the identity below. Preserve the successful verification URL. / Exigez une correspondance exacte puis vérifiez l’identité.

The documented CLI alternative remains `npm run verify:mainnet -- YOUR_APPROVED_REGISTRY_ADDRESS` with `ETHERSCAN_API_KEY` configured privately. Neither route requires publishing an API key, wallet key, deployment approval, receipt or contact list. / La méthode CLI reste disponible ; ne publiez aucune clé, approbation privée ou donnée de membre.

## 2. Identité et autorité / Identity and authority

Before every administrative session, read these values. / Avant chaque session administrative, lisez ces valeurs.

| Read Contract function | Expected / Attendu |
|---|---|
| `VERSION()` | `2.1.1` |
| `CANONICAL_ENS()` and `ensRegistry()` | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` |
| `CANONICAL_WRAPPER()` and `adminNameWrapper()` | `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401` |
| `admin()` | Current effective holder of `club.agi.eth`, freshly checked. Operator-supplied initial expectation: `0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201`. This address is an expectation, not a hardcoded permanent admin. |
| `adminInfo()` | Effective owner, ENS registry owner, wrapped/expiry details. A wrapper contract address alone is not the effective holder. |
| `isAdmin(account)` | `true` only for the current effective administrator; `false` for the separate disposable deployer. |
| `paused()` | Whether public self-claims are suspended. Administrative corrections remain available. |

**FR.** Si `admin()` vaut zéro ou ne correspond pas à la détention ENS indépendamment vérifiée, arrêtez les écritures et examinez la détention, les fuses, l’expiration et la disponibilité ENS. Aucun transfert d’administration dans ce registre n’est nécessaire à son déploiement. Le détenteur effectif est résolu à chaque appel. Un changement légitime de détention ENS retire immédiatement les privilèges de l’ancien détenteur. Les réglages du resolver ENS, une autorisation d’opérateur NFT ou la fonction Etherscan **Verify Address Ownership** ne confèrent aucun privilège dans le registre.

**EN.** If `admin()` is zero or differs from independently checked ENS ownership, stop writes and inspect ownership, fuses, expiry and ENS availability. No registry ownership handover is needed at deployment. Authority is resolved on every call, and a legitimate ENS ownership change immediately removes the former holder’s privileges. ENS resolver settings, NFT operator approvals and Etherscan’s **Verify Address Ownership** profile feature do not confer registry privileges.

**Contre-vérifier la racine dans Etherscan / Cross-check the root in Etherscan**

1. Open the canonical [ENS Registry — Read Contract](https://etherscan.io/address/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e#readContract). Call `owner(node)` with the fixed namehash of `club.agi.eth`: **`0x39eb848f88bdfb0a6371096249dd451f56859dfe2cd3ddeab1e26d5bb68ede16`**. / Lisez le propriétaire ENS de ce node fixe.
2. If it returns the canonical NameWrapper address above, open [NameWrapper — Read Contract](https://etherscan.io/address/0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401#readContract) and call `getData(uint256)` with **`26197956329659879375608614502944430547940191734812384976533597699969316216342`**. Inspect the returned owner, fuses and expiry. The canonical wrapper applies its expiry rules when returning ownership. Compare that effective owner with registry `admin()`. / Si la racine est enveloppée, comparez le détenteur effectif retourné par le wrapper avec `admin()`.
3. Otherwise, compare the direct ENS owner with `admin()`. Zero ownership is unavailable authority. These manual latest-state reads complement the finalized deployment inspection; repeat them if ownership changes between reads. / Sinon, comparez le propriétaire direct. Répétez si la détention change entre les lectures ; conservez le contrôle finalisé de déploiement.

**Wallet de contrat / Contract wallet.** If the effective holder is a Safe or another contract wallet, that wallet must execute the call. Connecting one of its individual signers to Etherscan is insufficient. Use that wallet’s supported execution workflow, with the target address, ABI parameters or public calldata from the helper. / Si le détenteur est un wallet de contrat, il doit lui-même exécuter l’appel via son processus prévu. Un signataire individuel connecté ne suffit pas.

## 3. Votre premier avantage, quand vous le décidez / Your first benefit, when you choose

**FR.** Le contrat déployé contient zéro avantage. Aucun événement, identifiant, catégorie ou quota n’est préconfiguré dans les formulaires. Le mode démonstration administratif est vide lui aussi. Créer un événement est une décision distincte du déploiement.

**EN.** The deployed contract contains zero benefits. No event, ID, category or quota is preconfigured in the forms. The admin demo also starts empty. Creating an event is a separate decision from deployment.

**FR.** Dans l’assistant du site, indiquez l’adresse approuvée et choisissez **Créer un avantage — createEntitlement**. L’identifiant lisible et la catégorie sont convertis localement en Keccak-256 ; vérifiez puis copiez les valeurs préparées. Les exemples ci-dessous sont des paramètres publics, pas une autorisation de publication. Chaque écriture constitue une transaction distincte ; attendez son succès et relisez le résultat avant la suivante.

**EN.** In the website helper, enter the approved address and choose **Create a benefit — createEntitlement**. The readable identifier and category are converted locally to Keccak-256; inspect and copy the prepared values. These examples are public parameters, not publication approval. Each write is a separate transaction; wait for success and read the result before the next one.

| `createEntitlement` field | Enter in helper / Saisir dans l’assistant | Meaning / Sens |
|---|---|---|
| `entitlementId` | Choose your permanent ID / Choisissez votre identifiant permanent | Case-sensitive benefit identifier; helper shows its bytes32 hash. |
| `category` | Choose your category / Choisissez votre catégorie | Public category, also hashed. |
| `capacity` | Choose explicitly / Choisissez explicitement | Maximum active claims; `0` means unlimited. No quota is prefilled. |
| `opensAt` | empty / vide | `0`: no lower claim-time bound. |
| `closesAt` | empty / vide | `0`: no upper claim-time bound. Set the approved claim deadline before opening. |
| `initialState` | `1` | Draft / Brouillon. |
| `metadataHash` | empty / vide | Zero bytes32: no integrity anchor specified. |

1. **Create draft / Créer le brouillon.** On Etherscan **Write Contract**, connect the actual root-holder wallet, select `createEntitlement`, paste each prepared value into the matching field and review the wallet request. All registry writes use **0 ETH value**; only network gas is payable.
2. **Read back / Relire.** In **Read Contract → entitlement**, use the same bytes32 ID. Check `exists = true`, state `1`, the capacity you chose and active/unique counts `0`.
3. **Add presentation / Ajouter la présentation.** Use `setDescriptor(id, fr, en, uri, digest)`. Titles describe the benefit publicly. FR is required; EN can be empty, but provide both for members. Each title is limited to **160 UTF-8 bytes**, not characters. URI is empty or public HTTPS/IPFS, maximum 512 bytes. `digest` is the Keccak-256 of the exact public metadata file, or zero. Never hash a private receipt or member contact data into this field.
4. **Set claim dates / Régler les dates.** Use `setWindow`. The helper accepts strict UTC such as `2026-09-22T16:00:00Z` or integer Unix seconds. Etherscan itself receives **seconds**, not milliseconds or a date string. The opening and closing seconds are inclusive; zero removes that bound. If both are set, closing must be greater than opening. These are claim windows, not necessarily event start/end times.
5. **Open / Ouvrir.** Use `setEntitlementState(id, 2)` only after checking the intended public setup. Read back `entitlement` and `remainingCapacity`.
6. **Website offer list / Catalogue du site.** The default configured website uses `entitlementMode: "registry"` and an empty `allowedEntitlements` array. Members connect to the verified registry and refresh its catalogue; new IDs and changed public titles appear without a website edit. Requests still require an active authenticated claim, exact bytecode/origin binding and finalized/latest checks. / Le catalogue vient du registre vérifié : les nouveaux avantages et les titres modifiés apparaissent après actualisation. Le reçu reste soumis à toutes les vérifications du droit actif. Explicit legacy allowlists remain restricted; adding an ID there requires a reviewed configuration change and rebuild.

**Sans assistant / Without the helper:** use Etherscan **Read Contract → entitlementId(canonicalName)** to calculate a readable identifier’s hash. `membershipNode(label)` calculates a membership node. Public category/reference hashes can also be calculated from their public text with `entitlementId`; its 128-byte input bound applies. Copy the returned bytes32 exactly. Do not enter readable text into a bytes32 write field. Empty metadata hashes must be represented as **`0x` followed by 64 zeros**, not an empty Etherscan bytes32 field.

## 4. Toutes les écritures / Every write function

All operations except `claim` require the current effective administrator. / Toutes les opérations sauf `claim` exigent l’administrateur effectif actuel.

| Function and ordered inputs | Usage / Effet |
|---|---|
| `createEntitlement(entitlementId, category, capacity, opensAt, closesAt, initialState, metadataHash)` | Create a unique benefit. / Créer un avantage unique. |
| `duplicateEntitlement(sourceId, newId)` | Copy category/capacity into a fresh Draft. Does not copy dates, descriptions, metadata hash or claims. / Nouveau brouillon, catégorie/quota seulement. |
| `setEntitlementState(entitlementId, newState)` | `1` Draft/Brouillon, `2` Open/Ouvert, `3` Closed/Fermé, `4` Archived/Archivé. `0` invalid. States can be changed again; archive does not erase history. |
| `setCapacity(entitlementId, newCapacity)` | `0` unlimited; a positive value cannot be below active claims. / Quota positif au moins égal aux droits actifs. |
| `setWindow(entitlementId, opensAt, closesAt)` | Change claim dates. / Modifier la période de réclamation. |
| `setCategory(entitlementId, newCategory)` | Change the public bytes32 category. / Changer la catégorie publique. |
| `setMetadataHash(entitlementId, newMetadataHash)` | Change only the public file integrity hash. / Modifier seulement le hash public. |
| `setDescriptor(id, fr, en, uri, digest)` | Update FR/EN titles, public metadata URI and hash. / Modifier la présentation publique. |
| `adminGrantClaimToCurrentOwner(entitlementId, label)` | First grant to the current effective membership holder. / Première attribution au détenteur effectif. |
| `adminGrantBatchToCurrentOwners(id, labels)` | Same first-grant rule for 1–50 distinct labels, atomically. / Lot atomique. |
| `adminGrantClaimOverride(entitlementId, label, claimant, reasonHash)` | Explicit exception to a nonzero wallet; nonzero public reason hash required. Does not prove ENS ownership. / Exception explicite et auditable. |
| `revokeClaim(entitlementId, label, reasonHash)` | Active → Revoked. Frees a slot; increments revision; keeps history. / Révoquer sans effacer. |
| `revokeBatch(id, labels, reasonHash)` | Revoke 1–50 distinct active claims atomically. / Révocation atomique. |
| `reinstateClaim(entitlementId, label)` | Revoked → Active, **same recorded claimant**; requires capacity. Does not automatically update to a new ENS holder. / Rétablir le bénéficiaire enregistré. |
| `reassignRevokedClaim(entitlementId, label, newClaimant)` | Revoked → Active for the chosen nonzero wallet; increments revision, preserves uniqueness, requires capacity. / Réattribution explicite. |
| `setSupportedNameWrapper(wrapper, supported)` | Membership-wrapper allowlist only; `true`/`false`. Review the wrapper first. The active root wrapper cannot be disabled. Canonical root authority remains immutable. / Politique de wrappers de memberships uniquement. |
| `pause()` | Stop public self-claims; reads and administrative corrections remain available. / Suspendre les réclamations publiques. |
| `unpause()` | Resume public self-claims subject to benefit state/dates/capacity/ownership. / Reprendre sous les règles existantes. |
| `claim(entitlementId, label)` | Member self-claim, called by the current effective membership holder. / Réclamation du membre détenteur. |

**FR.** Les attributions administratives et exceptions contournent le brouillon, les dates et la pause des réclamations publiques ; elles ne contournent jamais le quota ou l’unicité du droit. Corriger un droit n’annule pas un billet Eventbrite déjà délivré : l’organisateur doit corriger le billet séparément. Les paramètres d’un appel, ses logs et son historique sont publics, même si vous révoquez ensuite le droit.

**EN.** Administrative grants and exceptions bypass Draft/state, time windows and the public-claim pause; they never bypass capacity or the one-record rule. Correcting a claim does not cancel an issued Eventbrite ticket; the organizer must correct that separately. Call inputs, logs and history are public, including after revocation.

**Input format / Format.** Paste bytes32/address/decimal/bool values as shown, without extra quotation marks. For `string[]`, use the helper’s JSON array, for example `["alice","bob"]`. A membership input is one lowercase direct label, such as `alice`, not a wallet address, full personal name or email. The helper also accepts `alice.club.agi.eth` and produces `alice` for the contract. A failing batch reverts every member in that batch. / Un lot qui échoue n’attribue ni ne révoque partiellement ses membres.

## 5. Réclamer puis prouver / Claim, then prove

1. Read `membershipInfo(label)` and check `effectiveOwner`. The ENS address-resolution record is not membership ownership. / Vérifiez le détenteur effectif.
2. Read `claimability(entitlementId, claimant, label)` with the actual caller wallet. Status **0** means claimable at that read’s state. / État **0** : réclamation possible à cet instant.
3. In **Write Contract → claim**, use the bytes32 benefit ID and direct label. Connect the holder wallet and confirm the transaction. / Confirmez avec le wallet détenteur.
4. Wait for success, then read `claimRecord` or `claimantOf`, using `membershipNode(label)` for the node. Confirm the active claimant and revision. A successful transaction for a different function is not proof of this claim. / Relisez le droit actif.
5. For a private ticket request, return to the member page and use the existing active claim. Do **not** claim again or paste name/email/salt/receipt into Etherscan’s Verified Signatures, Input Data Messages, metadata, comments or transaction fields. / Retournez au site pour le reçu privé, sans seconde réclamation et sans dépôt des coordonnées dans Etherscan.

## 6. Toutes les lectures / Every read function

| Functions | Purpose / Sens |
|---|---|
| `VERSION`, `CANONICAL_ENS`, `CANONICAL_WRAPPER`, `CLUB_AGI_ETH_NODE`, `MAX_CANONICAL_NAME_BYTES`, `ensRegistry`, `adminNameWrapper` | Identity/constants. / Identité et constantes. |
| `admin`, `adminInfo`, `isAdmin`, `paused` | Authority and emergency state. / Autorité et pause. |
| `entitlementId(canonicalName)`, `membershipNode(label)` | Convert public identifiers to hashes. / Convertir les identifiants publics. |
| `entitlementCount`, `entitlementIdAt(index)`, `entitlementIdsPage(offset, limit)` | Enumerate benefits. Start offset `0`, limit `25`; advance offset by returned length. Limit 1–100. / Parcourir le catalogue. |
| `entitlement(entitlementId)` | Returns category, metadataHash, capacity, activeClaims, uniqueClaims, opensAt, closesAt, state, exists. / État complet de l’avantage. |
| `titleFR(id)`, `titleEN(id)`, `metadataURI(id)` | Public presentation. Unnamed bytes32 inputs still receive the entitlement ID hash. / Présentation publique. |
| `remainingCapacity(entitlementId)` | `(capped, remaining)`; `(false, 0)` means **unlimited**, not sold out. / `false, 0` signifie sans plafond. |
| `membershipInfo(label)` | Node, effective owner, registry owner, wrapped flag, expiry-known flag, expiry. / Détention effective. |
| `claimability(entitlementId, claimant, label)` | Whether the specified wallet can self-claim now; see reasons below. / Éligibilité de réclamation. |
| `claimRecord(entitlementId, node)` | Claimant, firstClaimedAt, lastActivatedAt, revokedAt, revision, status. Status: 0 None/Aucun, 1 Active/Actif, 2 Revoked/Révoqué. |
| `claimantOf(entitlementId, node)`, `hasClaimed(entitlementId, node)`, `wasEverClaimed(entitlementId, node)` | Active claimant, active status, historical existence. A revoked claim has zero active claimant but still exists historically. / Droit actif et historique. |
| `claimNodeCount(entitlementId)`, `claimNodeAt(entitlementId, index)`, `claimNodesPage(id, offset, limit)` | Unique membership records, including revoked ones. Corrections do not append another record. / Registres uniques, y compris révoqués. |
| `nameWrapperCount`, `nameWrapperAt(index)`, `supportedNameWrapper(wrapper)` | Membership-wrapper history and current policy. / Historique et politique des wrappers. |

## 7. Dépannage / Troubleshooting

| Result / Résultat | Action |
|---|---|
| Missing Read/Write Contract | Check the exact address and successful exact source verification. This is an immutable contract: use the normal tabs, not proxy tabs. / Vérifier adresse et code exact. |
| `NotClubAdmin` | Read `admin()` again and use that actual wallet. A disposable deployer, old ENS holder or individual Safe signer is insufficient. |
| `AdminUnavailable` or zero `admin()` | Inspect canonical ENS ownership/wrapper/expiry. Do not invent a replacement admin or transfer privilege to the deployer. |
| `ClaimRejected(1)` / `EnforcedPause` | Public claims paused. / Réclamations suspendues. |
| `ClaimRejected(2)` | Invalid direct label. / Label invalide. |
| `ClaimRejected(3)` | Unknown benefit ID; check exact case-sensitive hash. / Avantage inconnu. |
| `ClaimRejected(4/5/6)` | Draft / Closed / Archived. / Brouillon / Fermé / Archivé. |
| `ClaimRejected(7/8)` | Before opening / after closing. Check UTC seconds. / Pas encore ouvert / terminé. |
| `ClaimRejected(9/10)` | Already active / revoked. Reuse the existing proof or request an admin correction; ENS transfer cannot produce another first claim. |
| `ClaimRejected(11/12)` | Membership unavailable / caller not current effective holder. Expired emancipated wrapped names normally resolve to no owner and return 11. |
| `ClaimRejected(13)` | MembershipExpired enum value. Inspect ownership/expiry; canonical filtered wrapped ownership normally reports 11 for expired emancipated names. |
| `ClaimRejected(14)` / `CapacityFull` | No active slot available. / Quota atteint. |
| `CapacityBelowActiveClaims` | Choose a sufficient positive capacity or the explicitly intended unlimited value 0. |
| `ClaimRecordAlreadyExists` | Use correction functions for an existing record. / Utiliser les corrections. |
| `ClaimNotActive` / `ClaimNotRevoked` / `ClaimRecordDoesNotExist` | Read the current record and choose the appropriate transition. / Relire le droit. |
| `InvalidBatchSize` / failing batch | Use 1–50 distinct valid labels, inspect each record/owner and capacity, then retry a smaller reviewed batch. |
| Verification mismatch | Use the exact commit’s exported input, compiler and manifest path. Do not change optimizer, IR, EVM target, source paths or constructor arguments to silence the mismatch. |

Reads and pending transaction simulations can become stale before inclusion. Etherscan’s latest-state display is not the repository’s finalized identity check. Complete `npm run inspect:mainnet` before release and use the existing independent receipt verification/finality workflow. / Les lectures peuvent changer avant inclusion. Terminez le contrôle finalisé prévu avant l’ouverture du service.

## Sources officielles / Official references

Checked 2026-09-12 / Consultées le 12 septembre 2026:

- [Etherscan Read/Write Contract](https://info.etherscan.com/how-to-use-read-or-write-contract-features-on-etherscan/)
- [Connecting a wallet](https://info.etherscan.com/connecting-your-wallet-on-etherscan/)
- [Standard JSON verification and advanced compiler settings](https://info.etherscan.com/how-to-verify-contracts/)
- [Exact Match and the Contract Code tab](https://info.etherscan.com/navigating-the-contract-code-tab/)
- [Input formats](https://info.etherscan.com/understanding-the-required-input-formats-for-read-write-contract-tab/)

Local helper/EVM tests demonstrate parameter encoding against the compiled contract. They do not demonstrate a real deployed address, actual Etherscan verification or a hardware-wallet transaction. Record those production-specific results separately. / Les tests locaux prouvent l’encodage dans leurs limites ; la vérification Etherscan réelle et les wallets réels restent à qualifier séparément.
