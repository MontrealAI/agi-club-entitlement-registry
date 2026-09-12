# AGI Club — mode d’emploi de Vincent

## La règle en une ligne

**Un droit vérifié, une demande privée, un seul billet Eventbrite.**

Le membre doit posséder un claim actif. La signature de sa demande lie le destinataire à ce claim, mais ne prouve ni identité civile ni contrôle de la boîte courriel. Elle n’empêche pas le partage ultérieur du billet final.

## Émettre un billet

1. Recevez le courriel dans `president@montreal.ai`. Ne publiez pas son contenu ni sa pièce jointe.
2. Ouvrez **le vérificateur de votre origine officielle**, jamais un lien fourni comme “outil de vérification” par l’expéditeur. Collez le reçu JSON. Il reste en mémoire dans cette page.
3. Cliquez **Vérifier via mon wallet**. Le résultat doit être `VERIFIED_REQUEST_NOT_A_TICKET`, avec le nom/courriel attendus. Attente de finalité, signature invalide ou droit révoqué = aucun billet à émettre.
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

Créer IA 101 en brouillon, capacité 50, puis régler titres FR/EN et dates en UTC. Exemple de début de l’événement prévu : `2026-09-22T23:00:00Z` correspond au 19 h de Montréal annoncé ; les fenêtres de claim sont des décisions distinctes à définir, pas une promesse automatique.

Ne pas écrire de données personnelles dans titres, références publiques ou motifs d’audit. Une révocation libère un quota on-chain, **sans annuler une commande Eventbrite**. Rapprocher les deux avant réattribution.

Le titulaire effectif de `club.agi.eth` exécute les opérations ; si c’est un Safe, les appels doivent provenir du Safe. Maintenir le contrôle et la validité du nom est une dépendance critique.
