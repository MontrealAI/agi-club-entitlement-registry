# Hardhat — du code source au déploiement expressément autorisé

[English](HARDHAT_DEPLOYMENT.md) · [Guide de l’organisateur](OPERATOR_GUIDE_FR.md) · [Etherscan FR / EN](ETHERSCAN_GUIDE.md)

**Vous utilisez Ubuntu ?** Commencez par le [parcours de déploiement Ubuntu](UBUNTU_MAINNET_FR.md). Le registre est déployé vide ; vous pouvez choisir le premier avantage plus tard.

Commencez par un aperçu local : aucun portefeuille financé, compte RPC, secret de déploiement ou renseignement de membre n’est nécessaire. Le contrat destiné à Ethereum mainnet est **`AGIClubEntitlementRegistryMainnet`**. Les répétitions locales utilisent volontairement des contrats de test.

| Votre objectif | Parcours | Résultat attendu |
|---|---|---|
| Voir l’interface sur votre ordinateur | A → installation B → D | Démonstration sur `http://127.0.0.1:8080` |
| Tester avec des ETH locaux sans valeur | A → B → C | Rapport local, chaîne 31337 uniquement |
| Qualifier un candidat de production | A → qualification B → E → F | Preuves liées au code exact, sans diffusion de transaction |
| Vérifier et administrer avec Etherscan | [Guide Etherscan](ETHERSCAN_GUIDE.md) | Paramètres des 52 fonctions publiques |
| Déployer une première instance limitée et approuvée | G → H → I → J | Autorisation du détenteur de club.agi.eth, vérification, puis essai réel limité |

**Exécutez une commande à la fois, dans le dossier du dépôt. Passez à la suivante uniquement après réussite.** Gardez tout serveur local dans un terminal séparé ; **Ctrl+C** l’arrête.

Les résultats actuels sont joints aux [exécutions GitHub Actions](https://github.com/MontrealAI/agi-club-entitlement-registry/actions). Téléchargez l’artefact `local-qualification-linux` correspondant au commit pour lire `LOCAL_RELEASE.json` et ses journaux. `evidence/RELEASE_STATUS.json` décrit la livraison initiale, pas l’état actuel de la CI. La réussite des tests n’autorise ni le déploiement mainnet ni l’ouverture publique.

## A. Préparer l’ordinateur

Installez **Node 22.16.0 ou une version ultérieure compatible de la branche 22**, avec **npm 10**, puis vérifiez :

```bash
node --version
npm --version
```

Aucune installation globale de Hardhat n’est nécessaire. Le dépôt fixe Hardhat 3.16.0, ethers 6.17.0, solc 0.8.37 et le module de vérification Etherscan dans `package.json`. Ne lancez pas `npm update` pendant un déploiement.

Sur Windows, utilisez PowerShell ; sur macOS/Linux, le terminal. Entourez de guillemets les chemins contenant des espaces. Avec Git :

```bash
git clone https://github.com/MontrealAI/agi-club-entitlement-registry.git
cd agi-club-entitlement-registry
```

Autre possibilité : **Code → Download ZIP** sur GitHub, extraction, puis ouverture du terminal dans le dossier contenant `package.json`. La configuration Hardhat est déjà fournie.

| Prérequis | Vérification | Utilisation |
|---|---|---|
| Node 22.16.0+ dans la branche 22.x | `node --version` | Toutes les commandes ; Node 24 est hors de la plage déclarée |
| npm 10.x | `npm --version` | Installation reproductible avec le verrou du dépôt |
| Python 3 | `python3 --version` sur macOS/Linux ; `python --version` sur Windows | Configuration et tests hors ligne |
| Chrome ou Chromium | Ouvrir le navigateur installé | Qualification du navigateur |
| OpenSSL | `openssl version` | Certificat HTTPS local temporaire des tests |

Téléchargez Node 22 depuis le [site officiel](https://nodejs.org/en/download), puis rouvrez le terminal. `npm ci` n’installe pas Python, Chrome ou OpenSSL. Un simple aperçu demande seulement Node/npm et les dépendances du projet.

## B. Installer et qualifier

Le dépôt contient un véritable `package-lock.json` produit par npm et revu. Pour une extraction neuve dépourvue de verrou revu seulement :

```bash
npm run bootstrap:lock
npm run check:lock
```

Relisez et conservez le véritable verrou généré. Le workflow 01 permet aussi cette opération depuis GitHub. N’inventez jamais un verrou si le registre npm est inaccessible.

Installation normale :

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
```

`--ignore-scripts` empêche les scripts de cycle de vie des dépendances. Les paquets propres à la plateforme doivent néanmoins être présents. Examinez toute erreur ; ne lancez pas des scripts inconnus pour la contourner. Un échec du contrôle des avis de sécurité bloque la livraison jusqu’à revue.

Pour l’aperçu, passez à D. Pour la qualification :

```bash
npm run qualify
```

Cette commande contrôle la structure et le verrou, les régressions hors ligne, la compilation, les tests EVM, le parcours local de demande, la construction du site et les tests navigateur. Elle s’arrête au premier prérequis non satisfait et conserve les rapports sous `qualification/`.

**Réussite :** huit étapes `PASS`, avec `status: PASS` et `sourceUnchanged: true` dans `qualification/LOCAL_RELEASE.json`. `npm test` ou `npm run build:site` seuls ne remplacent pas une qualification complète. La CI Linux exécute les tests navigateur ; macOS et Windows contrôlent installation, tests et construction du site.

Le compilateur est le fichier installé exact `solc/soljson.js`. Profil de production : optimiseur à 200 exécutions, viaIR, EVM Shanghai. Les contrôles vérifient les limites de taille Ethereum et produisent l’identité et l’empreinte du compilateur. La vérification Etherscan doit utiliser ce même profil.

## C. Répéter localement — aucune adhésion ni dépense réelle

Terminal 1 :

```bash
npm run node
```

Terminal 2, dans le même dossier :

```bash
npm run deploy:local
```

Cette commande déploie des doubles ENS et un registre de test **vide** sur la chaîne 31337. Un détenteur racine et un membre fictifs sont configurés. Aucun avantage ni claim n’est créé. Le rapport `.local/local-rehearsal.json` doit contenir `chainId: 31337`, `entitlementCount: 0`, `claimsCreated: 0` et `scope: LOCAL_TEST_ONLY_NOT_A_MEMBERSHIP_OR_TICKET`.

Gardez le premier terminal ouvert. Redémarrer le nœud remet l’état local à zéro ; ses adresses ne servent jamais à configurer la production. **Ne financez ni ne réutilisez les clés publiques de test Hardhat.** Le portail de production refuse volontairement ce réseau local.

```bash
npm test
npm run test:journey
npm run test:stateful
```

`npm test` inclut les parcours et simulations ; les deux commandes spécifiques permettent de les relancer séparément pour un diagnostic. Le parcours utilise un modèle local de la sous-classe de production et de véritables fonctions ethers, mais ni finalité Ethereum réelle, portefeuille physique ou mise à disposition réelle.

Les simulations à état utilisent quatre graines fixes, un préfixe adversarial et 128 étapes générées par graine. Un modèle distinct contrôle après chaque étape les claims, bénéficiaires, horodatages, révisions, quotas et index. Les séquences couvrent transferts ENS, indisponibilités, pauses, concurrence pour la dernière place et transactions échouées sans modification partielle des lots. Le déployeur de test est contrôlé pour l’absence de privilèges.

**Réussite :** chaque graine est `PASS` dans `qualification/stateful-tests.json`. En cas d’échec, conservez graine, étape et commande ; relancez avec les mêmes sources et dépendances. Ces simulations bornées ne remplacent pas le fork mainnet réel, les essais de vrais portefeuilles ou les revues indépendantes.

## D. Construire et ouvrir l’interface

```bash
npm run build:site
npm run serve
```

Ouvrez **http://127.0.0.1:8080** et choisissez **Français** ou **English**. Parcours français : **Membres → Explorer sans portefeuille → Vérifier**. Pour l’administration : **Administration → Explorer la démonstration**. Utilisez uniquement des coordonnées fictives. Aucun reçu signé, droit, courriel ou billet réel n’est créé.

Le choix de langue suit les liens sans cookie ni stockage du navigateur. Il conserve les champs publics d’administration/Etherscan, mais efface les demandes privées temporaires et annule les autorisations préparées. Un message explique comment reprendre. Les fonctions du contrat, identifiants et messages signés gardent leur forme technique exacte.

Le constructeur du site copie la véritable distribution ethers et sa licence, ainsi qu’une liste explicite de fichiers publics, dans `dist/site`. Il ne substitue pas le double cryptographique des tests. Ouvrez l’adresse HTTP ; le double-clic sur un fichier HTML source n’est pas le mode de lancement pris en charge.

`npm run test:browser` nécessite Chrome/Chromium et OpenSSL. Si le navigateur n’est pas découvert, indiquez son véritable exécutable :

```bash
# macOS ; adaptez le chemin sous Linux.
export CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

```powershell
# Windows ; adaptez à votre installation.
$env:CHROME_BIN = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Relancez ensuite `npm run qualify`. Les tests de confidentialité simulent Ethereum ; ils ne qualifient pas un vrai portefeuille. Le certificat créé par OpenSSL est temporaire et local ; il ne configure pas le HTTPS de production.

## E. Fork mainnet avec accès amont en lecture seule

Créez `.env` localement depuis `.env.example`, sans écraser un fichier existant :

```bash
# macOS/Linux
test -e .env || cp .env.example .env
```

```powershell
# Windows
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Éditez le fichier localement et vérifiez son nom exact : `.env`, pas `.env.txt`. Excluez-le de tout téléversement. Renseignez :

```text
MAINNET_FORK_RPC_URL=YOUR_PRIVATE_READ_ONLY_MAINNET_RPC
MAINNET_FORK_BLOCK=A_PINNED_FINALIZED_BLOCK_NUMBER
EXPECTED_ADMIN=0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201
MEMBER_LABELS=REAL_ASCII_LABEL_1,REAL_ASCII_LABEL_2
```

Remplacez les valeurs indicatives par votre RPC approuvé, un numéro de bloc finalisé fixé et de vrais labels représentatifs. Contrôlez indépendamment le détenteur de `club.agi.eth` et les états de wrapping, fuses et expiration. Ne modifiez pas un nom ENS ni ses fuses pour faire réussir un test.

L’adresse fournie est **l’administrateur initial attendu**, à confirmer contre ENS au bloc du fork et au déploiement. Elle ne remplace pas la source d’autorité. Le constructeur n’accepte aucun argument propriétaire : il observe immédiatement le détenteur effectif existant de `club.agi.eth`. Le déployeur ne bénéficie d’aucune période d’administration et aucun transfert de propriété après déploiement n’est nécessaire. Chaque opération privilégiée continue de suivre le détenteur ENS après transfert.

Pour un nom direct `<label>.club.agi.eth`, `membershipInfo(label)` vérifie le propriétaire ENS, ou la détention dans un wrapper pris en charge avec ses règles d’expiration et de fuses. L’adresse d’un résolveur, une approbation de jeton ou un opérateur délégué ne suffit pas. Si le nom appartient à un Safe, utilisez le compte Safe lui-même, pas un signataire individuel.

L’[exemple préliminaire AGIJobManager](https://montrealai.github.io/agijobmanagerv0.html) illustre le parcours de connexion et vérification, mais accepte aussi des délégations et adresses de résolution plus larges que la politique de ce registre. Ses sessions sauvegardées et ses autres familles de noms ne font pas partie de cette application. Ne placez ni coordonnées dans ENS, les transactions ou les rapports, ni secret RPC dans `frontend/config.js`.

```bash
# macOS/Linux
ALLOW_READ_ONLY_FORK=yes npm run test:fork
```

```powershell
# Windows
$env:ALLOW_READ_ONLY_FORK="yes"
npm run test:fork
```

Le script lit le bloc réel fixé, puis déploie et usurpe des comptes **uniquement dans le fork local**. Il ne diffuse rien sur mainnet. Une usurpation locale réussie ne démontre pas le contrôle d’un Ledger ou Safe réel.

Utilisez ce point d’entrée documenté. Son lanceur vérifie l’environnement avant Hardhat, sans afficher les valeurs. Il archive l’ancien rapport sous `.local/fork-attempts/` et remplace le résultat courant par un état bloqué avant le nouvel essai. Seul un essai réussi lié à la source inchangée, au bloc demandé, au détenteur attendu et aux membres contrôlés peut produire `PASS`.

Le rapport final `qualification/mainnet-fork.json` porte un identifiant d’essai et une date de fin. Les rapports enfants restent privés et ne doivent jamais remplacer ce rapport final. Les exceptions brutes du fournisseur et la sortie enfant sont exclues, car elles peuvent contenir des identifiants RPC. Les échecs indiquent la phase : configuration, connexion, bloc amont, détention racine, déploiement ou claims. Corrigez les paramètres concernés ; pour un échec de connexion/compilation, vérifiez aussi `npm run compile` et les dépendances. Conservez les échecs ; ne partagez que des détails expurgés.

Le verrou `.local/mainnet-fork.lock` bloque l’utilisation des preuves pendant un essai. Une fin normale le libère après écriture du rapport ; une interruption peut le laisser. Avant de retirer un verrou obsolète, confirmez dans le gestionnaire de processus que le lanceur et ses enfants Hardhat sont arrêtés. Conservez le verrou et les rapports en privé, retirez uniquement ce verrou obsolète et relancez. Ne supprimez jamais un verrou actif ni le point de reprise du déploiement ; ne modifiez pas un rapport pour afficher `PASS`.

Après lecture des revues privées, le contrôle de livraison relit l’empreinte du rapport fork et contrôle le verrou avant et après cette lecture. Un nouveau verrou ou rapport modifié bloque le résultat et retire l’entrée de preuve obsolète. Laissez finir l’essai, examinez-le, puis relancez `npm run release:gate`. Ce contrôle observe les fichiers à cet instant ; il ne les réserve pas pour l’avenir.

## F. Revues indépendantes et essais de vrais appareils

Complétez la [revue juridique de livraison](LEGAL_RELEASE_REVIEW.md) avec un conseil qualifié et l’opérateur réel : périmètre explicitement vide du déploiement, droits existants des membres, avis FR/EN, renseignements obligatoires et traitement des courriels/prestations. Publiez les informations requises avant l’empreinte finale du code. La case de lecture du membre est temporaire ; elle ne constitue pas un registre d’acceptation conservé.

Résolvez les constats sur les sources, le compilateur et le verrou exacts. Vérifiez transitions d’autorité, wrapping/expiration, appels non autorisés, doublons, lots, quotas, révocation/réattribution, finalité et signatures invalides.

Essayez réellement Ledger/Safe/portefeuille membre, navigateur mobile, origine HTTPS et CSP, signature, copie explicite, courriel et vérification de demandes fictives. L’avantage réel et sa mise à disposition seront revus séparément une fois choisis. Les données de test restent fictives. Vérifiez que le portefeuille reçoit une empreinte salée, pas les coordonnées.

Conservez les rapports privés sous `.local/`, sans reçus clients. Utilisez `releases/external-evidence.example.json` pour préparer `.local/external-evidence.json`. Indiquez `deploymentScope: "EMPTY_REGISTRY_ONLY"`. Les quatre entrées requises sont :

- `independentSecurityReview` : revue de sécurité indépendante ;
- `legalReview` : revue juridique du déploiement réel ;
- `realWalletStaging` : essais des vrais portefeuilles ;
- `privateRequestStaging` : parcours de demande privée.

Aucun avantage choisi ni rapport de livraison n’est requis pour déployer vide. Une offre ultérieure exige ses propres revues juridique et de mise à disposition via `npm run launch:gate` ([instructions](ENTITLEMENT_DESIGN_FR.md#déployer-vide--approuver-un-avantage-plus-tard)).

Chaque entrée identifie le véritable réviseur, son rapport privé sous `.local/`, l’empreinte SHA-256 de ce fichier et la source exacte. Inscrivez `PASS` uniquement pour un résultat exécuté et revu. Aucun test de relais ne remplace `privateRequestStaging`.

```bash
npm run fingerprint
npm run release:gate
```

Le contrôle exige huit étapes locales réussies et leurs journaux non vides, le rapport du compilateur correspondant et un fork réel avec des membres distincts vérifiés. L’empreinte du code de création du fork doit correspondre à celle du build qualifié. Rapports et journaux entrent dans l’empreinte des preuves ; modifier un journal après signature invalide l’autorisation. Les preuves doivent être des fichiers ordinaires aux emplacements attendus, sans liens symboliques. Préservez l’intégralité de `qualification/` en important des preuves CI, notamment `compiler-status.json` et les journaux. Régénérez les anciens forks sans empreinte du code de création.

Le contrôle vérifie exhaustivité et empreintes, pas la véracité indépendante des déclarations d’autrui. Il n’autorise jamais lui-même un déploiement. Tout changement de code, tests, configuration, avis publics, guide juridique ou licence exige les preuves correspondantes. Gardez coordonnées et conseils juridiques hors des artefacts publics.

## G. Préparer un plan non signé pour un registre vide

Après réussite des contrôles, configurez `.env` avec `MAINNET_RPC_URL`, `EXPECTED_ADMIN`, `DEPLOYER_ADDRESS` et **`DEPLOY_MAX_COST_ETH`**, votre plafond explicite en ETH. Un budget vide bloque la préparation ; ce plafond n’est pas une promesse de tarif.

```bash
npm run prepare:mainnet
```

Le `AGIClubDeploymentPlan/2` autorise uniquement la création exacte du registre vide, sans création d’avantage ni lancement membre. Régénérez et révisez les anciens plans/signatures `/1` ; ne les réétiquetez pas.

Relisez `.local/deployment-plan.json` : chaîne 1, contrat de production, empreintes source/création/exécution, déployeur, administrateur ENS actuel, nonce, adresse prédite, limite de gas, plafonds des frais et expiration. **Cette commande n’envoie aucune transaction.** La réussite affiche `UNSIGNED EMPTY REGISTRY PLAN — no transaction sent`.

Le plan expire après 30 minutes. Si son délai ou le nonce change, préparez, relisez et faites signer un nouveau plan. Ne modifiez pas le JSON pour prolonger sa validité ou son budget. Le planificateur compare aussi l’artefact réel au code qualifié et le détenteur actuel à la preuve du fork ; une différence impose les nouvelles vérifications concernées.

Utilisez un **déployeur jetable distinct**, financé uniquement pour le budget revu. Le plan refuse le portefeuille administrateur comme déployeur. N’exportez jamais la clé ou phrase du Ledger/Safe racine. Le déployeur paie le gas, sans aucun privilège d’administration, de propriété ou de récupération. Conservez son historique jusqu’à la finalisation et vérification indépendante du déploiement.

**Considérez le déployeur comme compromis.** Ne lui accordez jamais d’approbation ENS d’opérateur ou de jeton, de contrôle d’un nom parent, de rôle de propriétaire/module Safe ni d’accès aux clés racines. Contrôlez séparément ces permissions externes : `isAdmin(deployer) = false` vérifie uniquement l’autorité directe sur le registre. Une personne disposant de sa clé peut voler ses ETH, consommer son nonce, remplacer une transaction en attente ou déployer un autre code sans cet outil. Le plan signé encadre l’outil, pas cet attaquant. Vérifiez le déploiement depuis une copie du dépôt, un appareil et un fournisseur indépendants et fiables avant d’accepter son adresse. `npm run test:deployer`, inclus dans la qualification, teste localement les 18 fonctions privilégiées et une attaque par constructeur contrefait.

## H. Faire autoriser, puis diffuser explicitement

Depuis l’origine HTTPS approuvée ou votre serveur local de confiance, ouvrez `deployment.html`. Avec `npm run serve` actif : **http://127.0.0.1:8080/deployment.html?lang=fr**. Chargez `.local/deployment-plan.json`, relisez chaque champ, confirmez la lecture et signez avec le détenteur réel de `club.agi.eth`. Un portefeuille de contrat exige son propre processus de signature, déjà testé.

Déplacez le fichier téléchargé dans `.local/deployment-approval.json` et gardez-le privé. C’est une autorisation de déploiement, pas un reçu membre. Les pages membre/vérificateur ne proposent aucun export de reçu vers un fichier.

Un changement de fichier, portefeuille, réseau ou langue, une navigation ou un retrait du consentement annule l’essai en cours dans la page. Refusez aussi la demande ouverte dans le portefeuille. Un seul essai de signature est permis à la fois ; compte et détenteur racine sont revérifiés avant téléchargement. Décocher la case ne révoque pas un fichier signé déjà partagé : il reste actif jusqu’à son expiration ou l’échec d’un autre contrôle.

Le diffuseur utilise un fichier JSON **chiffré du déployeur**, indiqué par `DEPLOYER_KEYSTORE`. Fournissez son mot de passe localement pour cette seule exécution, jamais dans GitHub ou des journaux partagés. L’environnement du processus est visible avec des privilèges locaux suffisants ; utilisez un appareil isolé et nettoyez-le ensuite.

```bash
# Terminal Bash macOS/Linux, hors session enregistrée ou partagée.
printf "Deployer keystore password: "
read -r -s DEPLOYER_KEYSTORE_PASSWORD; printf "\n"
export DEPLOYER_KEYSTORE_PASSWORD
AGI_MAINNET_SEND=I_APPROVE_THIS_EMPTY_REGISTRY npm run deploy:mainnet
unset DEPLOYER_KEYSTORE_PASSWORD
```

```powershell
# PowerShell, hors session enregistrée ou partagée.
$secret = Read-Host "Deployer keystore password" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:DEPLOYER_KEYSTORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $env:AGI_MAINNET_SEND = "I_APPROVE_THIS_EMPTY_REGISTRY"
  npm run deploy:mainnet
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Item Env:DEPLOYER_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:AGI_MAINNET_SEND -ErrorAction SilentlyContinue
}
```

Ces nettoyages ne garantissent pas l’effacement physique de la RAM. Utilisez votre outil de portefeuille de confiance pour produire le fichier Ethereum JSON chiffré du déployeur séparé ; une clé privée brute n’est pas l’entrée attendue. N’utilisez jamais la clé racine pour cela.

Le diffuseur refuse la CI, exige l’autorisation exacte et le plan signé, puis revérifie empreintes, administrateur, nonce et frais. Avant tout envoi RPC, il signe localement, calcule le hash et écrit durablement `.local/deployment-broadcast.json`. Ce point de reprise contient des métadonnées publiques, sans clé privée ni octets de transaction signée. Un second lancement ne peut ni l’écraser ni renvoyer depuis ce checkout ; le planificateur refuse aussi de remplacer le plan. Un échec d’écriture empêche l’envoi.

**Si l’envoi ou la confirmation s’interrompt, conservez le point de reprise et contrôlez son hash.** `SIGNED_SUBMISSION_OUTCOME_UNCONFIRMED` signifie que l’issue reste inconnue. Un délai RPC peut survenir après acceptation ; une absence de reçu peut correspondre à une transaction en attente. Ce n’est pas une autorisation de réessayer. Deux confirmations ne prouvent pas la finalité.

Reprise sans nouvelle transaction :

1. Ouvrez le point de reprise localement et conservez `transactionHash`, `deployer`, `nonce` et `predictedAddress`.
2. Contrôlez hash et nonce avec votre fournisseur/explorateur approuvé. Rapprochez les transactions en attente, minées, échouées ou remplacées. Sans reçu, conservez l’incertitude ; ne supprimez pas le point de reprise.
3. Fixez `REGISTRY_ADDRESS` à l’adresse prédite revue. Dès que le code est présent, exécutez seulement `npm run inspect:mainnet`. Aucun mot de passe de déployeur ni envoi n’est requis. Si la finalité manque, relancez cette lecture plus tard.
4. Si le déploiement ne peut aboutir, documentez l’issue et obtenez l’autorisation explicite du détenteur racine pour tout nouveau plan/budget. Utilisez un checkout distinct revu et gardez les preuves originales. Une erreur RPC ne donne pas cette autorisation.

`.local/mainnet-deployment.json` contient une vérification récente avec `finalityVerified: false`. Seule l’inspection finalisée réussie produit `.local/post-deployment.json` avec `finalityVerified: true`. L’expiration du plan limite le moment où cet outil peut envoyer ; elle ne fait pas expirer une transaction Ethereum déjà en attente.

Pour un portefeuille de contrat, la signature ERC-1271 est vérifiée aux états finalisé et récent avant déchiffrement du déployeur, puis après les contrôles préalables. Expiration et preuves sont contrôlées après ces lectures. Ces contrôles ne garantissent pas que détention ou politique du portefeuille resteront inchangées jusqu’au minage.

## I. Vérifier avant l’accès des membres

Renseignez localement `REGISTRY_ADDRESS` :

```bash
npm run inspect:mainnet
npm run verify:mainnet -- 0xYOUR_DEPLOYED_CONTRACT
```

La vérification par CLI exige une clé API Etherscan et le profil de production exact. Pour la vérification manuelle sur le site Etherscan, exécutez `npm run export:etherscan` ou récupérez l’artefact CI Linux `etherscan-verification-not-deployed` du même commit. Chargez `dist/etherscan/standard-input.json` avec **Solidity (Standard-Json-Input)**, en utilisant le compilateur et le chemin `project/` inscrits dans `VERIFICATION.json`, sans argument constructeur. Cette voie n’utilise pas votre clé API CLI. Consultez le [guide Etherscan](ETHERSCAN_GUIDE.md) pour les étapes et les 52 opérations.

`npm run inspect:mainnet` ne requiert ni clé ni mot de passe. Conservez le plan revu `.local/deployment-plan.json` et le point de reprise `.local/deployment-broadcast.json` : le plan fournit les empreintes de création/runtime, le déployeur, le nonce et les limites de frais ; le point de reprise fournit l’empreinte exacte de la transaction signée. Sans point de reprise, renseignez `DEPLOYMENT_TRANSACTION_HASH` à partir d’un dossier de transaction revu indépendamment. Une empreinte d’environnement contradictoire est refusée ; ne supprimez pas le point de reprise pour accepter une transaction de remplacement.

Pour une reprise en lecture seule sans plan, renseignez `DEPLOYER_ADDRESS`, `DEPLOYMENT_TRANSACTION_HASH` (sauf si le point de reprise est conservé), `EXPECTED_CREATION_HASH` et `EXPECTED_RUNTIME_HASH`, ainsi que `REGISTRY_ADDRESS` et l’actuel `EXPECTED_ADMIN`. Ces valeurs doivent provenir de dossiers indépendants revus, jamais d’un contrat inconnu ou du déployeur non fiable. Ce mode établit la création et l’identité ; il ne reconstitue pas les preuves manquantes d’autorisation ou de budget. Un plan expiré peut être inspecté historiquement ; cela ne le renouvelle pas et n’autorise aucun nouvel envoi.

L’inspection refuse une création dont le déployeur, le nonce, le bytecode, la valeur, le reçu/l’adresse ou la chaîne diffère, ou qui n’est pas finalisée dans son bloc canonique. Avec un plan, le type de transaction et les valeurs exactes de gas/frais doivent aussi correspondre. Elle contrôle runtime, getters et autorité ENS aux blocs finalisé et récent fixés, puis vérifie à nouveau ces blocs et celui de création. Un constructeur différent peut installer le même runtime avec un état initial malveillant : les getters ou la seule vérification Etherscan ne suffisent pas.

Au démarrage de l’inspecteur, le rapport précédent est archivé et un rapport `INCOMPLETE` est écrit avant les contrôles. Acceptez uniquement une commande actuelle terminée avec succès et `.local/post-deployment.json` contenant **à la fois** `creationVerified: true` et `finalityVerified: true`, le statut `CREATION_AND_IDENTITY_CHECK_PASS_NOT_LAUNCH_AUTHORIZATION`, la transaction revue et les ancres correspondantes. Un rapport archivé ou une commande échouée ne constitue pas une preuve actuelle, y compris si Hardhat échoue avant le démarrage de l’inspecteur. Utilisez `address` et `runtimeCodeHash` du rapport réussi ci-dessous. Ce contrôle n’autorise aucun lancement.

```bash
python3 scripts/configure.py --contract 0xYOUR_DEPLOYED_CONTRACT --runtime-code-hash 0xAPPROVED_RUNTIME_HASH --origin https://claims.example.org
npm run build:site
```

Sur Windows, utilisez `python` au lieu de `python3`. Gardez Node 22 sur `PATH` : le configurateur emploie le protocole canonique pour valider l’origine hors ligne. Remplacez l’origine indicative par l’**origine HTTPS réelle exacte**, dédiée, sans chemin ni barre finale : hôte en minuscules, punycode ASCII si nécessaire, sans port `:443` explicite. Un port HTTPS non standard est accepté. Une configuration invalide laisse le fichier précédent intact.

Sans `--entitlement`, le site lit le catalogue du registre par pages bornées, sans avantage préconfiguré. Les nouveaux avantages et titres modifiés via Etherscan apparaissent après actualisation. Le titre anglais vide retombe sur le français publié. Une liste volontairement restreinte utilise plusieurs `--entitlement` et nécessite un rebuild revu lors de ses changements. La vérification des reçus exige toujours le bytecode approuvé et le claim actif signé aux deux états finalisé/récent.

La nouvelle configuration publique change l’empreinte source/configuration : relisez le diff et le manifeste, relancez les tests, puis liez les essais réels au build finalement publié. Une approbation navigateur antérieure à cette configuration ne qualifie pas le site final.

Publiez **uniquement `dist/site`** sur un hébergeur statique adapté. Appliquez `_headers` ou des en-têtes équivalents ; tous les hébergeurs n’interprètent pas ce fichier. Testez le transport réel du portefeuille avec `connect-src 'none'`, sans affaiblir cette règle à l’aveugle. N’hébergez pas le dépôt, les secrets, les fixtures ou les dossiers privés. Avec IPFS, utilisez une origine HTTPS stable, dédiée et revue ; une origine de passerelle/CID changeante n’est pas automatiquement autorisée.

Sur l’hôte final, testez les deux langues avec des données fictives dans `member.html` et `verify.html` : stockages vides, aucun envoi réseau ou fichier contenant les coordonnées, aucun nom/courriel/sel privé dans le portefeuille, aucun historique restauré après effacement ou rechargement. Testez séparément le presse-papiers explicite. L’hébergeur ne doit ajouter ni analyse d’audience, formulaire, rejeu de session ou service worker. Relancez la qualification et les essais réels après toute modification.

## J. Un essai réel limité, puis une décision d’ouverture distincte

Le constructeur crée **zéro avantage**. Aucun premier avantage, quota, catégorie ou calendrier n’est imposé. Après approbation distincte du détenteur racine, choisissez les paramètres réels, créez un **brouillon** depuis la console ou Etherscan, relisez les titres FR/EN et ouvrez explicitement. Ne créez pas un exemple pendant le déploiement. Aucun compte de billetterie n’est intégré au contrat.

Faites suivre à un membre réel : claim → finalité → demande privée → copie/courriel explicite → vérification → contrôle des doublons → l’avantage choisi fourni une fois → confirmation de réception et d’accès. Une nouvelle signature ou adresse courriel ne doit jamais produire un doublon d’allocation pour la même clé.

Gardez l’accès général fermé jusqu’à revue des constats et preuves privées. L’application ne peut confirmer ni envoi, livraison en boîte courriel ou émission d’un billet. Si un ancien registre existe, rapprochez claims et prestations avant migration : aucun contrat immuable ni historique n’est mis à jour automatiquement.

## Dépannage

| Message ou situation | Action suivante |
|---|---|
| `EBADENGINE` | Vérifiez Node 22/npm 10 et rouvrez le terminal avec ces versions. |
| `package.json` introuvable | Ouvrez le terminal dans le dossier extrait du dépôt. |
| `LOCK_GATE_BLOCKED` ou verrou rejeté par `npm ci` | Restaurez le verrou revu. Ne devinez pas des versions et n’appliquez pas un correctif automatique d’audit. |
| Python, Chrome ou OpenSSL absent | Installez le prérequis ; renseignez `CHROME_BIN` si nécessaire. Conservez l’échec puis relancez. |
| `127.0.0.1:8545` inaccessible | Gardez `npm run node` actif dans le premier terminal. |
| `EADDRINUSE` | Arrêtez l’ancien aperçu avec Ctrl+C, puis lancez un seul `npm run serve`. |
| `NOT_CONFIGURED`, `WRONG_ORIGIN`, mainnet requis | Une démo locale est normale. Le mode réel exige le contrat approuvé, l’origine HTTPS exacte et mainnet. |
| `release:gate` indique `BLOCKED` | Lisez `qualification/DEPLOYMENT_GATE.json` et réalisez les vérifications réellement manquantes. |
| Autorisation expirée, administrateur ou nonce modifié | Préparez, relisez et faites signer un nouveau plan ; n’éditez pas les champs signés. |
| Envoi interrompu ou point de reprise déjà présent | Conservez-le et suivez H en lecture seule. Ni suppression du point de reprise ni renvoi automatique. |
| `WAITING_FOR_FINALITY` ou reçu expiré | Attendez la finalité ou faites signer une nouvelle demande pour le claim existant. Aucun deuxième claim ou prestation. |

Ne partagez que des erreurs expurgées. Ne téléversez jamais `.env`, clés, mots de passe, autorisations privées ou reçus membres.

Pour ressources, accès, services, allocations périodiques ou autres avantages, consultez le [guide général](ENTITLEMENT_DESIGN_FR.md). `fulfillmentStaging` relève du contrôle ultérieur `launch:gate` pour un avantage choisi ; Eventbrite est facultatif. Le déploiement vide exige le périmètre de revue explicite `EMPTY_REGISTRY_ONLY`. Aucun événement ne doit être choisi pour déployer. La demande privée est facultative pour un avantage ; la validation de son code, des appareils et de la confidentialité reste obligatoire.
