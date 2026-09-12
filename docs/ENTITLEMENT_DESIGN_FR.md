# Choisir librement un avantage — sans décider du premier maintenant

[English](ENTITLEMENT_DESIGN_EN.md) · [Guide opérateur](OPERATOR_GUIDE_FR.md) · [Etherscan](ETHERSCAN_GUIDE.md)

Le registre démarre vide. Le déploiement ne crée aucun événement, service, catégorie ou allocation. Quand vous êtes prêt, le détenteur effectif de `club.agi.eth` choisit l’avantage et publie ses conditions. Toutes les fonctions d’administration existantes sont accessibles dans le portail ou Etherscan.

## Choisir un modèle pratique

Ces exemples sont des possibilités, pas des offres configurées ni des promesses.

| Avantage | Paramètres du registre à choisir | Mise à disposition séparée, si nécessaire |
| --- | --- | --- |
| Ressource ou téléchargement | Un identifiant permanent par ressource ou édition ; capacité 0 si aucun plafond de claims n’est voulu | Livrer la ressource en privé ou utiliser un service d’accès sécurisé indépendant. Aucun lien secret dans les métadonnées publiques. |
| Accès à une communauté ou un logiciel | Un identifiant par périmètre et période d’accès | Le service authentifie le bénéficiaire et revérifie le claim actif. Ce site statique ne protège pas un contenu privé hébergé. |
| Consultation ou autre service | Un identifiant par allocation définie ; capacité limitée aux allocations actives | Planifier le rendez-vous et suivre son exécution en privé. Un claim ne réserve pas un créneau. |
| Priorité ou accès anticipé | Définir précisément la priorité dans les conditions | Gérer la file et ses règles séparément. L’ordre des claims n’implémente pas une file prioritaire. |
| Réservation ou admission | Un identifiant par type de réservation ou édition, avec capacité explicite | Confirmer la réservation ou émettre un billet avec le prestataire choisi. Eventbrite est un exemple facultatif, pas une dépendance. |
| Objet physique ou privilège partenaire | Définir l’objet, l’admissibilité et l’allocation | Recueillir une adresse de livraison seulement par un canal privé adapté ; cette application n’a aucun champ d’adresse. Suivre livraison ou utilisation séparément. |
| Allocation périodique | Un identifiant distinct par période ou allocation | Suivre séparément chaque identifiant. Rouvrir un ancien identifiant ne réinitialise jamais le claim du membre. |
| Ensemble d’avantages | Un identifiant pour un ensemble indivisible ; plusieurs pour des éléments gérés indépendamment | Un seul claim ne suit ni quantités, ni livraisons partielles, ni chaque élément ; utiliser un registre privé. |

La catégorie est une valeur descriptive `bytes32`. Elle n’active aucun comportement particulier et n’impose aucune catégorie prédéfinie. Choisissez votre propre libellé stable ; les suggestions du portail sont facultatives. Aucun paiement, émission de jeton, rendement financier, système de stock, facturation récurrente ou livraison automatique n’est inclus.

## Créer plus tard, en cinq étapes

1. **Définir l’offre.** Préciser le périmètre, l’admissibilité, la disponibilité, la mise à disposition, les coordonnées nécessaires, les annulations, l’assistance et les conditions. Publier les conditions en français et en anglais. Faire vérifier les obligations de cette offre avant son ouverture.
2. **Créer un brouillon.** Choisir un identifiant permanent, une catégorie, une capacité et une fenêtre facultative de claims en UTC. Dans Etherscan, utiliser `createEntitlement` avec l’état `1`. Aucun champ ne choisit le premier avantage à votre place. Capacité `0` signifie sans plafond de claims actifs ; une date vide dans le portail est encodée `0` (sans borne).
3. **Décrire.** Utiliser `setDescriptor` pour les titres français/anglais et, si utile, une URI publique HTTPS/IPFS des conditions ou métadonnées et son empreinte. Aucun nom, courriel, secret d’accès ou référence privée de livraison. Le site ne récupère, n’authentifie et n’exécute pas automatiquement les métadonnées externes ; rendre les conditions accessibles par les canaux publics approuvés. Les membres peuvent sélectionner l’avantage puis **Lire les détails de cet avantage** : titres, capacité active, fenêtre et instructions à un même bloc observé. Un lien HTTPS s’ouvre uniquement sur clic explicite ; les autres URI restent du texte. Aucun document externe n’est chargé automatiquement.
4. **Vérifier et ouvrir.** Relire identifiant, catégorie, titres, capacité, dates et état. Tester la mise à disposition choisie. Régler explicitement l’état `2` (Ouvert). Les membres actualisent le catalogue ; le mode registre ne demande aucune configuration du site par avantage.
5. **Gérer.** Modifier descriptifs, catégorie, capacité, fenêtre et état depuis les contrôles administratifs. Attribuer, révoquer, rétablir et réaffecter seulement après le rapprochement externe approprié. Relire l’état courant avant toute transaction.

## Connaître les limites

- La clé du claim est **chaîne + registre + identifiant d’avantage + nœud du membership**. Chaque membership peut avoir un claim actif par identifiant ; plusieurs noms détenus par un même wallet restent des identités distinctes. Ce n’est pas une limite par personne civile.
- La capacité compte les **claims actifs**, attributions administratives comprises. Une révocation libère de la capacité même après livraison. Ce n’est ni un stock total ni un compteur de prestations fournies. Rapprocher le stock externe avant un remplacement.
- Les dates ouvrent et ferment les nouveaux claims des membres, pas les droits déjà actifs. Fermer, archiver ou suspendre ne désactive pas automatiquement un service tiers. Publier et appliquer l’expiration d’accès dans ce service. Les attributions administratives constituent une exception explicite et doivent respecter l’offre publiée.
- L’identifiant permanent et l’historique ne peuvent être effacés ou réinitialisés. Corriger les enregistrements courants avec les fonctions disponibles ; créer un nouvel identifiant pour une allocation indépendante. La capacité ne peut descendre sous le nombre de claims actifs. Un avantage archivé reste gérable par les contrôles d’état existants ; le contrat n’est pas évolutif par proxy.
- Un transfert de membership ne donne pas une seconde utilisation. Une correction change la révision, pas la clé du claim. Renouveler la demande, changer de courriel ou signer de nouveau ne crée pas une allocation supplémentaire.
- Le claim consigne un droit, pas une livraison, consommation, réservation ou identité civile. La vérification privée contrôle à un instant donné le bénéficiaire et sa signature ; elle ne garantit ni disponibilité ultérieure ni absence de révocation.

Pour un accès continu, authentifier l’utilisateur par un défi récent propre au service et lire l’état courant du claim avec une intégration distincte et revue. Ne pas réutiliser le reçu envoyé par courriel comme identifiant général de connexion. Après un transfert ENS, le bénéficiaire enregistré peut différer du nouveau détenteur ; appliquer les conditions d’accès et rapprocher les corrections administratives.

## Demander uniquement le nécessaire

Un membre peut réclamer sans nom ni courriel. Si une intervention privée est nécessaire, la demande signée accepte aucun champ de contact, le nom seul, le courriel seul ou les deux, selon le besoin réel. Un champ vide signifie **non fourni**, jamais identité ou boîte vérifiée. Envoyer un reçu sans coordonnées par courriel expose tout de même l’adresse d’expédition aux systèmes de messagerie.

Le protocole `/4` est général et lié à un avantage et une révision de claim. Les signatures `AGIClubTicketRequest/3` sont volontairement rejetées : mettre à jour le site membre et le vérificateur, recharger, puis préparer une nouvelle demande pour le claim existant. Ne pas modifier ni réétiqueter un ancien reçu. Cette migration ne nécessite aucune nouvelle transaction on-chain.

## Décider du périmètre immuable avant le déploiement

Il s’agit d’un **registre général d’attributions binaires** : un historique unique par identifiant d’avantage et nœud de membre. Il couvre de nombreuses sortes d’avantages, mais n’exécute pas des règles arbitraires. Modifier une catégorie ou un document public n’ajoute aucun comportement au contrat.

| Besoin | Ce que le contrat déployé peut imposer | Ce qui exige un autre système ou une autre conception |
| --- | --- | --- |
| Attribution ouverte aux membres | Détenteur direct actuel et valide du sous-nom `club.agi.eth`, état Open, fenêtre facultative, capacité active et unicité | Le contrat ne vérifie pas l’âge, le territoire, le niveau, les prérequis ou l’admissibilité contractuelle. |
| Attribution sur sélection ou invitation | Garder l’identifiant en Draft ; le détenteur racine attribue les droits aux membres sélectionnés, individuellement ou par lots atomiques | La sélection est externe. Ne pas ouvrir l’identifiant si tous les membres valides ne doivent pas pouvoir réclamer. Draft et pause n’empêchent pas les attributions administratives. |
| Réservations | Identifiant et capacité distincts par classe ou créneau indépendant | Aucun contrôle des conflits entre identifiants, file d’attente, calendrier ou réclamation atomique de plusieurs identifiants par un membre. |
| Allocations périodiques | Nouvel identifiant indépendant par période ; duplication vers un Draft vide | Aucun renouvellement automatique, facturation ou remise à zéro de l’ancien historique. |
| Ensembles d’avantages | Une attribution indivisible ou des identifiants indépendants par composante | Aucune quantité, utilisation partielle, atomicité entre composantes ou capacité partagée entre identifiants. |
| Accès continu | Lectures publiques de l’attribution active, du bénéficiaire enregistré, de la révision et de l’historique | Le service doit authentifier l’utilisateur et appliquer sa politique d’expiration, de suspension et de transfert du sous-nom. |
| Corrections et migration | Révocation, rétablissement, réattribution et dérogation explicite auditables, sous contrôle racine | Les dérogations et réattributions peuvent viser un wallet ne détenant pas le sous-nom ; le service doit décider s’il exige aussi la détention actuelle. |
| Consommables ou crédits | Enregistrement d’un droit binaire à une allocation définie | Aucun registre de consommation, solde décrémenté, exécution partielle ou stock total. Révoquer libère une place active même après livraison. |
| Paiements, jetons ou droits sur des revenus | Aucun | Un système distinct, conçu et revu pour cet usage, est nécessaire ; les métadonnées n’ajoutent aucune fonction financière. |

**Fixés au déploiement :** registre ENS et NameWrapper racine canoniques, nœud d’autorité `club.agi.eth`, libellés directs en ASCII minuscule de 1 à 63 octets, historique unique par identifiant/nœud, données publiques permanentes et modèle binaire. Aucun proxy, mécanisme de mise à niveau, rôle administratif délégué ou propriétaire de secours n’est prévu. Une autorité racine indisponible bloque les opérations privilégiées ; le déployeur jetable ne peut pas récupérer le contrôle. Une infrastructure ENS future incompatible ou de nouvelles règles natives exigent un nouveau contrat et une politique explicite de migration.

**Modifiables par les méthodes racine existantes :** catégories libres, descriptions FR/EN, URI/empreinte publique, état/fenêtre de réclamation, capacité (jamais sous le nombre actif), wrappers de membres et corrections. Les identifiants archivés peuvent être rouverts, mais leur historique n’est jamais réinitialisé. Les lots sont limités à 50, les pages de lecture à 100 ; l’interface membre charge 25 éléments à la fois. Titres et URI ont des limites en octets, vérifiées par l’assistant Etherscan.

Modifier les conditions, la catégorie ou les métadonnées **n’incrémente pas la révision d’une attribution**. La demande privée lie l’identifiant et la révision, pas l’acceptation de conditions modifiées ni une empreinte figée des métadonnées. Utilisez un nouvel identifiant pour une allocation sensiblement différente ; conservez toute preuve d’acceptation juridiquement nécessaire dans un processus externe revu. Une modification de description ne vaut pas consentement rétroactif.

`npm run test:scenarios` exerce le constructeur de production et ces limites dans un EVM local protégé : registre vide, catégories libres, plusieurs sous-noms pour un même wallet, capacité réutilisée, créneaux, sélection, périodes, ensembles, états d’accès, descriptions, transferts, migration et annulation atomique d’un lot effectivement miné. Le rapport est `qualification/contract-scenarios.json` ; `npm run qualify` inclut ces essais. L’infrastructure ENS est fictive : ces simulations ne remplacent ni fork réel à bloc fixé, ni audit indépendant, ni validation du service réel. Si une règle absente doit être imposée **dans le contrat immuable**, résolvez cette conception avant de le déployer.

## Déployer vide ; approuver un avantage plus tard

`npm run release:gate` couvre **EMPTY_REGISTRY_ONLY**. Le manifeste privé doit indiquer explicitement ce périmètre et les quatre revues terminées : `independentSecurityReview`, `legalReview`, `realWalletStaging` et `privateRequestStaging`. Sécurité, droit, appareils/confidentialité et fork réel restent obligatoires ; les données fictives permettent de valider le code de demande sans choisir la première offre. Le détenteur racine signe un `AGIClubDeploymentPlan/2` autorisant uniquement la création exacte du contrat. Régénérez et révisez les anciens plans/signatures `/1` ; ne les réétiquetez pas.

Une fois l’avantage choisi, utilisez un contrôle séparé **avant de demander l’accord racine pour son essai limité** :

1. Rédigez `.local/benefit-definition.txt` : identifiant exact, catégorie, capacité, fenêtre/état, titres FR/EN, URI/empreinte publique, admissibilité, portée de l’accès/prestation, coordonnées éventuellement nécessaires, annulation et assistance. Protégez les secrets opérationnels dans les documents privés ; les conditions publiques et champs on-chain ne doivent contenir aucune coordonnée de membre ni aucun identifiant secret.
2. Copiez `releases/benefit-launch-evidence.example.json` vers `.local/benefit-launch-evidence.json` sans écraser de preuves existantes. Indiquez l’empreinte du code courant, l’adresse mainnet vérifiée, l’empreinte d’exécution, l’identifiant permanent et le SHA-256 du document. Adresses et empreintes on-chain : hexadécimal minuscule avec `0x` ; SHA-256 de fichiers : sans `0x`.
3. Lancez `npm run launch:gate`. Sans revues, le résultat reste correctement `BLOCKED` ; une définition valide produit `benefitScopeSha256`. Transmettez ce périmètre exact et la définition aux réviseurs. Obtenez `benefitLegalReview` et `fulfillmentStaging` pour l’avantage envisagé, notamment doublons, opérateurs simultanés, révocation/corrections et minimisation des coordonnées. Inscrivez le véritable réviseur, l’empreinte de périmètre inchangée et celle des rapports ; `PASS` uniquement après exécution et revue réussies.
4. Relancez le contrôle. `EVIDENCE_READY_FOR_BENEFIT_REVIEW` rassemble les preuves pour examen racine, sans autoriser déploiement, essai ou lancement général. Le contrôle lie les octets des documents, le code et l’empreinte d’exécution ; il ne valide ni le sens de la définition ni les réglages actuels on-chain. Le détenteur racine doit comparer la définition revue à l’état de la chaîne avant chaque opération concernée.
5. Après accord racine séparé, créez et relisez le Draft, puis ouvrez-le explicitement si nécessaire (la sélection administrative peut rester en Draft). Validez le parcours réel d’un membre et l’exécution de l’avantage avant une décision distincte de lancement général. Toute modification de périmètre exige des preuves revues correspondantes.

`qualification/BENEFIT_LAUNCH_GATE.json` contrôle présence et empreintes ; ce n’est ni une opinion professionnelle ni une preuve de livraison. Les contrôles locaux n’interceptent pas les appels Etherscan ou du wallet racine. Eventbrite est facultatif ; aucun événement, service ou autre première offre n’est exigé pour déployer vide. Le registre peut rester vide aussi longtemps que nécessaire.
