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
3. **Décrire.** Utiliser `setDescriptor` pour les titres français/anglais et, si utile, une URI publique HTTPS/IPFS des conditions ou métadonnées et son empreinte. Aucun nom, courriel, secret d’accès ou référence privée de livraison. Le site ne récupère, n’authentifie et n’exécute pas automatiquement les métadonnées externes ; rendre les conditions accessibles par les canaux publics approuvés.
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

La barrière de publication exige `fulfillmentStaging` : des preuves revues du processus de livraison, accès ou service choisi, incluant doublons, révocation, corrections et minimisation des coordonnées. Aucun événement ni Eventbrite n’est obligatoire. Les autres exigences de sécurité, droit, wallets, confidentialité et fork mainnet restent applicables. Tant que le premier avantage est indécis, ne pas le créer ni l’ouvrir ; déployer un registre vide ne qualifie pas une offre future inconnue.
