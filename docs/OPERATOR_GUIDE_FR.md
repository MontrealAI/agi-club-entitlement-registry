# AGI Club — guide de l’organisateur

[English](OPERATOR_GUIDE_EN.md) · [Déploiement Hardhat](HARDHAT_DEPLOYMENT_FR.md) · [Opérations Etherscan](ETHERSCAN_GUIDE.md)

## Choisir votre langue

Sélectionnez **Français** ou **English** dans l’en-tête de toute page publique. Ce choix suit les liens internes avec le paramètre public `?lang=fr` ou `?lang=en`, sans cookie ni stockage du navigateur. Votre choix explicite prime sur la langue du navigateur.

Un changement de langue conserve les champs publics d’administration et d’Etherscan, mais annule les transactions préparées. Dans l’espace membre, il efface les coordonnées temporaires et demandes préparées et exige une reconnexion. Dans le vérificateur, il efface le reçu et le résultat. Un plan de déploiement reste chargé, mais exige une nouvelle confirmation de lecture. Refusez aussi toute demande déjà ouverte dans votre portefeuille pour l’annuler. Le changement de langue n’annule pas une transaction déjà soumise et n’efface ni le presse-papiers ni un courriel.

Le protocole signé, les noms des champs JSON, les fonctions du contrat et les identifiants publics conservent leur forme technique exacte. L’en-tête du courriel privé contient les deux langues et le sous-nom AGI Club complet signé. Son objet bilingue fixe ne contient aucune donnée membre. Le navigateur, le portefeuille et Etherscan disposent de leurs propres réglages de langue.

Dans ce guide, **wallet** désigne le portefeuille Ethereum, **membership** le nom de membre AGI Club, et **claim** la réclamation enregistrée pour un avantage.

## Réclamer, puis demander une intervention privée seulement si nécessaire

Consultez le [guide de conception des avantages](ENTITLEMENT_DESIGN_FR.md) pour les modèles pratiques et leurs limites. Le registre n’est lié ni à un événement ni à un prestataire de billetterie. Un membre peut réclamer sans nom ni courriel. Si aucune demande privée n’est nécessaire, il suit directement les instructions d’accès ou d’utilisation publiées après l’étape du claim.

## Traiter une demande privée

1. Recevez le courriel dans **president@montreal.ai** et gardez-le privé. Le texte préparé contient le sous-nom AGI Club complet.
2. Ouvrez **le vérificateur de votre origine officielle**, jamais un outil fourni par l’expéditeur. Collez le courriel préparé complet ou son JSON original. Un en-tête d’identité trompeur est rejeté.
3. Cliquez **Vérifier via mon portefeuille**. Exigez `VERIFIED_REQUEST_NOT_FULFILLED` et le `membership` complet attendu. Vérifiez l’identifiant d’avantage, la révision du claim et les coordonnées fournies. Un nom ou courriel vide signifie non fourni ; ni identité civile ni contrôle de boîte ne sont certifiés. Attente de finalité, révocation ou signature invalide bloquent la mise à disposition.
4. Consultez les conditions et recherchez la **claimKey** dans le registre privé et les dossiers du prestataire concerné. Verrouillez cette allocation avant traitement. Un autre nonce, destinataire ou numéro de révision désigne toujours la même allocation.
5. Si le droit est admissible et non déjà matérialisé, fournissez la ressource, l’accès, le service, la réservation ou l’avantage convenu par le canal choisi. Pour un billet seulement, un prestataire tel qu’Eventbrite peut être utilisé. N’utilisez que les coordonnées nécessaires ; demandez les informations réellement manquantes par votre procédure privée approuvée.
6. Notez hors du dépôt la claimKey, la révision, le statut et une référence privée du prestataire. Confirmez réception ou utilisation pendant l’essai d’acceptation. Effacez le vérificateur après usage.

Désignez un opérateur unique ou utilisez un verrou administratif privé partagé pour éviter les doublons simultanés. Cette page n’a ni stockage partagé, suivi de livraison ou verrou global automatique. Revérifiez juste avant de fournir l’avantage ; une révocation ultérieure reste possible.

**Zéro persistance dans le vérificateur statique :** le reçu et le résultat existent uniquement dans la page ouverte. Effacer, naviguer, changer de wallet/langue et dix minutes sans saisie ni clic de vérification les vident. Une vérification retardée ne restaure pas les données effacées et ne prolonge pas ce délai. Messagerie, registre privé et prestataire restent des systèmes distincts avec leurs propres règles de conservation. Aucun de leurs dossiers ou reçus privés ne doit être publié sur GitHub ou l’hébergement public.

## Corrections et questions fréquentes

- **Déjà réclamé :** utiliser le claim existant ; préparer une demande privée seulement si nécessaire. Régénérer un reçu ne demande pas une nouvelle transaction Ethereum.
- **Demande expirée :** après les 72 heures par défaut, demander une nouvelle signature pour le claim existant ; ne jamais contourner l’expiration.
- **Ancien reçu de billet :** les formats `/3` et antérieurs sont incompatibles avec `/4`. Mettre à jour espace membre et vérificateur, recharger et préparer une nouvelle demande. Ne pas réétiqueter une ancienne signature.
- **Autre courriel ou révision :** rapprocher l’allocation existante, annuler/remplacer la prestation ou l’accès externe si nécessaire ; aucune allocation supplémentaire automatique.
- **Copie indisponible :** sélectionner et copier manuellement le texte préparé, puis effacer la page. Tester le véritable parcours mobile avant l’ouverture.
- **Membership transféré :** le bénéficiaire enregistré reste inchangé jusqu’à correction administrative. Le transfert ENS ne crée pas une seconde allocation.
- **Attributions administratives :** attribuer aux détenteurs courants par lots de 1 à 50 labels distincts si l’administrateur prend en charge le gas. La mise à disposition privée exige toujours la vérification appropriée du bénéficiaire.

## Administration

Le déploiement et la démonstration démarrent **sans aucun avantage**. Choisir identifiant permanent, catégorie, capacité, dates et titres quand l’offre est décidée. Créer un Brouillon, publier les descriptifs FR/EN, vérifier et Ouvrir explicitement. Utiliser le portail ou Etherscan. En mode registre, les membres actualisent pour voir les changements sans modifier une liste du site. Un titre anglais vide retombe sur le français publié ; publier les deux pour un catalogue bilingue complet.

Le détenteur effectif courant de `club.agi.eth` administre le registre. Un Safe doit exécuter ses propres appels ; le déployeur jetable n’a aucun privilège. Garder le nom ENS valide et sous contrôle. Aucun contact, référence de livraison ou secret d’accès dans les champs publics. La révocation libère de la capacité active mais n’annule ni service, ni réservation, ni livraison externe : rapprocher avant réattribution.
