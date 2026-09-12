# Ubuntu → un registre AGI Club vide

[English](UBUNTU_MAINNET_EN.md) · [Guide Hardhat complet](HARDHAT_DEPLOYMENT_FR.md)

**Vous pouvez choisir le premier événement plus tard.** Le déploiement crée zéro avantage et zéro réclamation. Il ne nécessite aucun nom d’événement, date, quota, catégorie, métadonnée ou identifiant de billet. Vous pouvez laisser le catalogue vide et ajouter les avantages choisis ultérieurement, depuis la console d’administration ou Etherscan.

La seule valeur opérateur préremplie dans `.env.example` est :

```text
EXPECTED_ADMIN=0xa9eD0539c2fbc5C6BC15a2E168bd9BCd07c01201
```

Il s’agit du détenteur effectif attendu de `club.agi.eth`, vérifié auprès de l’ENS canonique. Le constructeur de production ne prend **aucun argument**. Tous les pouvoirs d’administration suivent le détenteur ENS actuel dès le déploiement ; le portefeuille de déploiement jetable ne reçoit aucun droit de propriété, d’administration ou de récupération. Un changement de détenteur ENS exige de nouveaux contrôles et une nouvelle autorisation, sans transfert de propriété à effectuer par le déployeur.

## 1. Préparer Ubuntu

Utilisez une installation Ubuntu 64 bits prise en charge et à jour, avec un compte utilisateur ordinaire. Placez le dépôt dans un dossier de travail privé, hors d’un serveur web ou d’un dossier partagé/synchronisé. Exécutez les commandes du projet sans `sudo`.

Installez les prérequis système avec le gestionnaire de paquets Ubuntu :

```bash
sudo apt update
sudo apt install git ca-certificates python3 openssl
```

Installez **Node 22.16.0 ou une version ultérieure de la branche 22**, avec **npm 10.x**, en suivant les [instructions officielles Node](https://nodejs.org/en/download). La version du dépôt de paquets Ubuntu peut différer ; ne présumez pas que `apt install nodejs npm` fournit les versions requises. Node 24 est hors de la plage déclarée par ce projet. Si vous utilisez déjà un gestionnaire de versions Node de confiance, sélectionnez Node 22. Aucune installation globale de Hardhat ni commande `hardhat --init` n’est nécessaire.

Installez Chrome/Chromium depuis sa distribution officielle ou les paquets pris en charge par Ubuntu. Vérifiez dans ce terminal :

```bash
node --version
npm --version
python3 --version
openssl version
```

Les tests détectent `/usr/bin/google-chrome` et `/usr/bin/chromium`. Pour un autre exécutable, renseignez `CHROME_BIN` avec son chemin absolu réel. Le confinement Snap/Flatpak peut empêcher l’accès aux chemins temporaires du profil et du certificat de test ; examinez l’échec signalé et utilisez une installation compatible. Conservez la politique de sécurité du navigateur de l’application. Les contrôles automatiques ne remplacent pas les essais avec votre véritable portefeuille et navigateur.

## 2. Utiliser le code et le verrou de dépendances revus

Exécutez une commande à la fois. Arrêtez-vous en cas d’échec.

```bash
git clone https://github.com/MontrealAI/agi-club-entitlement-registry.git
cd agi-club-entitlement-registry
git rev-parse HEAD
git status --short
sha256sum --check MANIFEST_SHA256.txt
npm ci --ignore-scripts --no-audit --no-fund
npm audit --audit-level=high
npm run qualify
```

Confirmez que le commit affiché est celui revu pour le déploiement. Conservez cette copie inchangée pendant la qualification, l’approbation du plan et la diffusion. N’exécutez ni `npm update`, ni `npm audit fix`, ni récupération de nouveau code dans une copie déjà approuvée pour le déploiement.

**Résultat attendu :** les huit étapes réussissent ; `qualification/LOCAL_RELEASE.json` indique `status: PASS` et `sourceUnchanged: true`. Conservez l’ensemble des rapports et journaux. Les données des tests automatiques sont fictives et restent sur des chaînes locales ; ces tests ne créent aucun événement de production et n’envoient aucune transaction mainnet.

Pour une répétition locale gratuite facultative, suivez la [section C du guide Hardhat](HARDHAT_DEPLOYMENT_FR.md#c-répéter-localement--aucune-adhésion-ni-dépense-réelle). Son rapport doit également indiquer `entitlementCount: 0` et `claimsCreated: 0`. Ne financez jamais les comptes de test publics de Hardhat.

## 3. Compléter les preuves de production manquantes

La réussite des tests locaux est nécessaire mais ne suffit pas à franchir le contrôle de déploiement. Créez `.env` sans écraser un fichier existant et limitez ses permissions :

```bash
umask 077
test -e .env || cp .env.example .env
chmod 600 .env
```

Modifiez-le localement. Gardez clés, identifiants RPC, mots de passe et rapports privés hors de GitHub et de la conversation. Laissez vides les valeurs inutilisées à cette étape.

| Avant de préparer un plan de déploiement | Éléments nécessaires |
|---|---|
| Répétition sur un fork du véritable mainnet | `MAINNET_FORK_RPC_URL` privé en lecture seule, `MAINNET_FORK_BLOCK` finalisé et `MEMBER_LABELS` réels représentatifs ; confirmez `EXPECTED_ADMIN`. Suivez la section E du [guide Hardhat](HARDHAT_DEPLOYMENT_FR.md). |
| Revues indépendantes et validation des parcours réels | Revues sécurité/juridique liées au code, essais réels du portefeuille, de la demande privée et de la billetterie. Suivez la section F du [guide Hardhat](HARDHAT_DEPLOYMENT_FR.md). Les données fictives de préparation ne choisissent ni ne publient votre première offre. |

Après configuration du fork en lecture seule, exécutez :

```bash
ALLOW_READ_ONLY_FORK=yes npm run test:fork
npm run release:gate
```

Consultez `qualification/DEPLOYMENT_GATE.json`. **`BLOCKED` impose de s’arrêter :** complétez les preuves nommées. Ne transformez pas un échec en `PASS` par modification du rapport et ne contournez pas les contrôles d’envoi. `EVIDENCE_READY_FOR_PRINCIPAL_REVIEW` signifie que les preuves sont réunies ; le détenteur racine doit encore approuver le plan de déploiement exact.

## 4. Préparer, autoriser et déployer le contrat vide

Suivez les sections G–H du [guide Hardhat](HARDHAT_DEPLOYMENT_FR.md) : budget explicite, adresse du déployeur jetable et fichier de clés chiffré, plan non signé, signature du détenteur racine et envoi unique. Aucun budget de frais ni aucune adresse de déployeur ne sont préremplis. N’exportez jamais la phrase de récupération ou la clé privée du portefeuille racine.

`npm run prepare:mainnet` n’envoie aucune transaction. La seule commande documentée de diffusion en production est `npm run deploy:mainnet`, avec sa confirmation explicite ponctuelle et l’autorisation signée. Ne déployez pas le contrat de test configurable, ne dirigez pas les tests vers mainnet et ne renseignez aucun argument constructeur pour `AGIClubEntitlementRegistryMainnet`.

Si l’envoi est interrompu, conservez `.local/deployment-broadcast.json` et suivez la procédure de reprise en lecture seule de la section H. Une expiration du délai RPC n’autorise pas un nouvel envoi.

## 5. Vérifier maintenant ; choisir la première offre plus tard

Suivez la section I du [guide Hardhat](HARDHAT_DEPLOYMENT_FR.md) pour l’inspection finalisée, la vérification du code sur Etherscan et la configuration revue du contrat, de son empreinte et de l’origine HTTPS. Publiez uniquement le site public construit lorsqu’il est prêt ; le dépôt source et le dossier privé de déploiement ne sont pas des fichiers à héberger.

Après avoir écrit la configuration publique, relancez `npm run qualify` et relisez la nouvelle empreinte source avant les essais sur l’hôte final. Un registre correctement configuré peut être qualifié ; des réglages incomplets ou une origine non sécurisée doivent être refusés.

Sur le contrat de production vérifié, **Read Contract** dans Etherscan doit afficher `entitlementCount = 0` avant la création d’un avantage. `admin()` doit correspondre au détenteur effectif de `club.agi.eth` ; vérifiez `isAdmin` pour ce détenteur et pour le déployeur jetable. Pour ce dernier, le résultat doit être `false`. Omettez `--entitlement` lors de la configuration du site pour suivre le catalogue administré sans liste d’événements préremplie.

Vous pouvez vous arrêter avec le registre vérifié et vide. Une fois l’offre réelle choisie et revue, créez-la volontairement en **Brouillon**, renseignez les titres français/anglais et les paramètres choisis, puis ouvrez-la explicitement. Le Brouillon proposé par défaut est un état de sécurité du formulaire de création futur ; il ne crée aucun événement. Réalisez l’essai réel limité membre/demande/billet avant l’ouverture générale. Consultez le [guide Etherscan](ETHERSCAN_GUIDE.md) et le [guide de l’organisateur](OPERATOR_GUIDE_FR.md).
