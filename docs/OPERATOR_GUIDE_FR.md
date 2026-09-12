# AGI Club — guide de l’organisateur

[English](OPERATOR_GUIDE_EN.md) · [Déploiement Hardhat](HARDHAT_DEPLOYMENT_FR.md) · [Opérations Etherscan](ETHERSCAN_GUIDE.md)

## Choisir votre langue

Sélectionnez **Français** ou **English** dans l’en-tête de toute page publique. Ce choix suit les liens internes avec le paramètre public `?lang=fr` ou `?lang=en`, sans cookie ni stockage du navigateur. Votre choix explicite prime sur la langue du navigateur.

Un changement de langue conserve les champs publics d’administration et d’Etherscan, mais annule les transactions préparées. Dans l’espace membre, il efface les coordonnées temporaires et demandes préparées et exige une reconnexion. Dans le vérificateur, il efface le reçu et le résultat. Un plan de déploiement reste chargé, mais exige une nouvelle confirmation de lecture. Refusez aussi toute demande déjà ouverte dans votre portefeuille pour l’annuler. Le changement de langue n’annule pas une transaction déjà soumise et n’efface ni le presse-papiers ni un courriel.

Le protocole signé, les noms des champs JSON, les fonctions du contrat et les identifiants publics conservent leur forme technique exacte. L’en-tête du courriel privé contient les deux langues et le sous-nom AGI Club complet signé. Son objet bilingue fixe ne contient aucune donnée membre. Le navigateur, le portefeuille et Etherscan disposent de leurs propres réglages de langue.

Dans ce guide, **wallet** désigne le portefeuille Ethereum, **membership** le nom de membre AGI Club, et **claim** la réclamation enregistrée pour un avantage.

## La règle en une ligne

**Un droit vérifié, une demande privée, un seul billet Eventbrite.**

Le membre doit posséder un claim actif. La signature de sa demande lie le destinataire à ce claim, mais ne prouve ni identité civile ni contrôle de la boîte courriel. Elle n’empêche pas le partage ultérieur du billet final.

## Émettre un billet

1. Recevez le courriel dans `president@montreal.ai`. Ne publiez pas son contenu ni sa pièce jointe.
2. Ouvrez **le vérificateur de votre origine officielle**, jamais un lien fourni comme “outil de vérification” par l’expéditeur. Collez le texte complet préparé pour le courriel, avec son en-tête d’identité et son reçu JSON, ou le JSON original. Il reste en mémoire dans cette page.
3. Cliquez **Vérifier via mon portefeuille**. Le résultat doit être `VERIFIED_REQUEST_NOT_A_TICKET`, avec le sous-nom complet `membership: exemple.club.agi.eth` et le nom/courriel attendus. Le sous-nom est dérivé du label signé ; un en-tête de courriel contradictoire est rejeté. Attente de finalité, signature invalide ou droit révoqué = aucun billet à émettre.
4. Recherchez la **claimKey** dans votre registre privé d’émission et dans vos commandes Eventbrite. La clé ne change pas avec le courriel, le nonce ou une nouvelle signature. Une révision n’est pas une seconde admission.
5. Si le droit n’a jamais été matérialisé, créez manuellement une admission AGI Club gratuite dans Eventbrite pour le nom et le courriel **vérifiés dans le reçu**, et utilisez l’option d’envoi de confirmation appropriée.
6. Notez hors du dépôt la claimKey, la révision, le statut et le numéro de commande. Confirmez la réception pour le canary. Effacez le reçu de l’interface après usage.

Le registre privé peut être votre outil administratif habituel ; il ne doit jamais être hébergé avec cette application. Pour éviter une course entre opérateurs, une seule personne attribue les billets ou un verrou administratif est appliqué. **Aucun stockage partagé signifie aussi aucun verrou automatique global de fulfilment.**

**Zéro persistance dans le vérificateur statique :** le reçu collé et le résultat existent uniquement dans la page ouverte. Le bouton **Effacer**, la navigation, un changement de wallet et dix minutes sans saisie ni clic de vérification vident les champs. Une vérification retardée ne prolonge pas ce délai et ne fait pas réapparaître un reçu effacé. Rechargez la page : aucun historique de coordonnées n’est restauré. Vos courriels, votre registre administratif et Eventbrite restent des outils distincts avec leurs propres règles de conservation.

## Problèmes fréquents

**Le membre a déjà réclamé :** il reprend uniquement la demande, sans nouvelle transaction. S’il recharge la page, ses coordonnées ne sont pas récupérées : il les ressaisit et signe.

**Demande expirée (72 h par défaut) :** faire préparer une nouvelle demande pour le claim existant. Ne pas contourner l’expiration du vérificateur.

**Autre courriel / nouvelle révision :** ne pas émettre un deuxième billet. Confirmer la correction, annuler/remplacer le billet précédent si nécessaire et rapprocher le registre privé.

**Le membre ne voit pas l’option de copie :** il doit disposer d’un claim actif finalisé et d’une demande signée. L’environnement doit permettre le presse-papiers ; sinon le cadre peut être sélectionné/copier manuellement, puis effacé. Prévoir un essai réel mobile avant lancement.

**Le nom a été transféré après claim :** la réclamation reste attachée à son bénéficiaire jusqu’à une correction administrative ; un transfert ne recrée pas de droit pour l’édition.

**Vous attribuez des claims aux ~50 membres :** les attributions administratives au détenteur courant permettent de prendre en charge le gas du lot. Chaque membre signe ensuite sa demande privée. Les signatures et vérifications restent nécessaires.

## Texte membre

> Vérifiez votre membership. Réclamez votre droit, s’il n’est pas déjà attribué. Saisissez vos coordonnées localement, signez une demande privée, puis copiez-la dans votre propre messagerie. Le site ne transmet pas votre nom ni votre courriel. Le billet Eventbrite sera créé manuellement après vérification.

## Administration

Le déploiement et la démonstration administrative démarrent **sans aucun événement**. Choisissez vous-même l’identifiant permanent, la catégorie et le quota du premier avantage, uniquement quand vous décidez de le créer. Créez un brouillon, réglez titres FR/EN et dates UTC, relisez puis ouvrez explicitement. Les mêmes opérations sont disponibles dans Etherscan. En mode catalogue du registre, les membres actualisent le catalogue pour voir les nouveaux avantages et les titres modifiés ; aucune liste d’événements n’est préremplie dans le site.

Ne pas écrire de données personnelles dans titres, références publiques ou motifs d’audit. Une révocation libère un quota on-chain, **sans annuler une commande Eventbrite**. Rapprocher les deux avant réattribution.

Le titulaire effectif de `club.agi.eth` exécute les opérations ; si c’est un Safe, les appels doivent provenir du Safe. Maintenir le contrôle et la validité du nom est une dépendance critique.

Renseignez les deux titres avec `setDescriptor` pour un catalogue bilingue complet. L’interface affiche le titre de la langue choisie ; si le titre anglais est vide, elle affiche le titre français publié, sans inventer de traduction des conditions. Les libellés d’état traduits ne changent pas les valeurs du contrat : 1 = Brouillon, 2 = Ouvert, 3 = Fermé, 4 = Archivé.
