# Pronostics communautaires

Le jeu, son calendrier et ses emails sont disponibles en anglais, français, espagnol, portugais, japonais, chinois et arabe. Les liens des emails conservent la langue choisie. Le calendrier arabe suit le sens de lecture de droite à gauche. Les statistiques du jeu ne remplacent pas le modèle de prévision : elles décrivent uniquement les dates choisies par les fans.

## Aperçu local jetable

Lancer `npm run dev` et `npm run game:preview`, puis ouvrir `http://localhost:3002/predictions`. Votes, liens privés et défis sont stockés uniquement en mémoire. Aucun appel à la D1 de production ni aucun email n’est envoyé. « Tester un ami » crée une nouvelle identité locale en conservant les autres participants. Le bouton « Recommencer » a été retiré ; l’API locale de remise à zéro reste disponible pour les tests automatisés. Les données disparaissent à l’arrêt du serveur. Ces commandes ne sont visibles qu’en développement sur localhost.

## Aperçu connecté à Cloudflare D1

```sh
npm run dev
npm run game:dev
npm run game:live
```

Garder les trois processus en marche et ouvrir `http://localhost:3001/fr/predictions`. Pour cet aperçu connecté : Next et l’API du jeu restent actifs derrière elle. L’interface est mise à jour en direct par Next ; `/api/game/*` utilise la **D1 Cloudflare `hxh-predictions`**, la même que la production. Les votes et autres écritures y sont réels et ne doivent pas servir de données de démonstration. Les migrations existent déjà ; pour appliquer une nouvelle migration après vérification, utiliser `npm run game:migrate`.

Le lancement récupère, sans l’enregistrer dans les sources, le secret du widget Turnstile « HxH Status preview », autorisé pour l’adresse de l’aperçu. Il faut une connexion Wrangler authentifiée. La vérification Turnstile et les limites de requêtes restent actives. L’envoi d’email est désactivé dans cet aperçu tant que Resend n’est pas configuré ; aucun faux email ni aucune tâche d’email ne sont écrits dans la D1 de production. Garder les serveurs actifs pendant les modifications et réserver `npm run build` à la vérification finale.

Le parcours : choisir une date → valider définitivement → consulter les statistiques → télécharger/partager une carte PNG → créer un défi et copier son lien. L’ami choisit d’abord sa date, puis rejoint explicitement le défi. Ce consentement est aussi l’occasion d’indiquer que son pseudo et sa date deviennent visibles dans ce groupe. Un lien privé de récupération permet de retrouver la participation sur un autre appareil sans inscription.

## Activer la production

Cloudflare est reconnecté via OAuth. L’ancien jeton prioritaire a été désactivé dans `.env` (fichier ignoré par Git). Les ressources suivantes sont déjà configurées :

- D1 `hxh-predictions`, identifiant `85d4e669-1f36-4f2e-a517-63135f8aa0f0`, avec les deux migrations appliquées en production.
- Widget Turnstile « HxH Status predictions », pour `hxhstatus.com` et `www.hxhstatus.com`, et widget distinct « HxH Status preview » pour l’aperçu.
- Secrets Worker `GAME_TURNSTILE_SECRET` et `GAME_EMAIL_KEY`, sans copie dans les sources.

Le texte de l’interface invite à recevoir l’annonce officielle ; ce déclenchement reste à implémenter. Le backend email actuel envoie la confirmation et les résultats après publication. Garder l’email désactivé tant que ce comportement n’est pas aligné et que le prestataire n’est pas configuré. `GAME_ENABLED` et `GAME_EMAIL_ENABLED` restent à `false` en production tant que la configuration d’envoi n’est pas terminée.

Pour terminer avec Resend gratuit :

1. Créer le compte gratuit sur https://resend.com/signup.
2. Ajouter le domaine d’envoi `hxhstatus.com` dans Resend et poser **uniquement les enregistrements DNS fournis pour l’envoi**. Ne pas remplacer les MX de réception existants. Désactiver le suivi des clics pour préserver les liens privés et leurs fragments.
3. Créer une clé API **Sending access**, limitée au domaine vérifié. Dans le terminal du projet, lancer `npx wrangler secret put RESEND_API_KEY` puis coller la clé dans l’invite masquée. Ne pas l’envoyer dans le chat.
4. Vérifier l’expéditeur `HxH Status <pronostics@hxhstatus.com>` dans `GAME_EMAIL_FROM`.
5. Passer `GAME_ENABLED` et `GAME_EMAIL_ENABLED` à `"true"`, construire et vérifier avec `npx wrangler deploy --dry-run`, puis déployer via le flux habituel du projet.
6. Vérifier sur le domaine public un vrai vote Turnstile, la réception et la confirmation du mail, avec une adresse de test explicitement autorisée.

Les pages statiques restent servies par Assets ; seul `/api/game/*` passe par le Worker. L’API indisponible affiche un message lisible, sans prétendre qu’un vote a été enregistré.

## Fermer et régler une manche

Le jeu concerne uniquement le chapitre 421, qui marque le retour attendu pour la prochaine série de chapitres. Le pronostic porte sur sa date de publication au Japon. Il ne passe jamais au chapitre 422 : l’API et la commande de gestion sont limitées au 421. **Fermer dès qu’une date officielle est annoncée**, sans attendre la date de publication ni la fin d’un déploiement :

```sh
# Exemples : remplacer les dates par celles de la source officielle.
npm run game:round -- close 421 2026-12-07 --remote
# Seulement après la publication réelle au Japon :
npm run game:round -- settle 421 2026-12-07 --remote
```

La commande exige `--remote` pour modifier Cloudflare D1. Ajouter `--dry-run` affiche le SQL sans l’exécuter. `open CHAPITRE DATE_MAX` ouvre une nouvelle manche uniquement pour un chapitre connu sans date officielle ; une manche existante n’est jamais réouverte par cette commande.

En secours, le Worker ferme aussi la manche lorsqu’une version déployée de `status-data.json` contient une annonce, et la règle lorsqu’elle indique `published`. **Cette synchronisation dépend du déploiement des données, ce n’est pas une surveillance instantanée des annonces.** La commande de fermeture est donc nécessaire au moment de l’annonce. Un report n’ouvre pas de nouveaux votes. Les classements utilisent la date réelle et attribuent le même rang aux écarts identiques.

## Données et limites

- Une participation immuable par identité anonyme et par chapitre. L’identité repose sur un cookie HttpOnly, SameSite=Lax, Secure en production, valable un an ; elle ne garantit pas une personne unique. Les cookies peuvent être effacés et les navigateurs changés.
- Turnstile est vérifié côté serveur avec le domaine et l’action attendus. Les écritures exigent une origine identique, les corps JSON sont limités à 4 Ko, les pseudos à 24 caractères. Les requêtes sont limitées par IP ; aucune IP n’est enregistrée dans D1.
- Les jetons de session et de récupération sont aléatoires et stockés uniquement sous forme de SHA-256 dans D1. Le lien privé contient son secret dans le fragment, supprimé de l’adresse dès sa lecture. Générer un nouveau lien invalide le précédent ; les sessions déjà reconnues restent actives.
- Une transaction D1 et une contrainte unique rendent les envois répétés idempotents. Un trigger incrémente l’histogramme uniquement lors d’un nouveau vote. Une fermeture concurrente est contrôlée au moment de l’insertion.
- Les statistiques publiques utilisent l’histogramme par jour, pas un parcours de toutes les participations. Cache public de 60 secondes ; aucune réponse personnalisée ni aucun jeton ne sont mis en cache. Il n’y a pas de polling automatique.
- Médiane et moyenne arrondies au jour le plus proche ; modes affichés avec leurs ex æquo ; plage interquartile empirique. Les pourcentages mensuels sont des parts de votes, jamais des probabilités de sortie.
- Un défi par créateur et par manche, 100 membres maximum, au plus dix défis par participant et par manche. Pas de commentaires ni de messagerie.
- Le partage natif dépend du navigateur. À défaut, le lien reste copiable et la carte PNG téléchargeable. Le lien public ouvre le jeu/la manche/le défi ; la carte personnalisée est le fichier partagé, pas une image Open Graph dynamique.
- Les pronostics restent archivés pour le classement. Il n’existe pas encore d’interface de modération ou de suppression : une intervention administrative doit préserver/recalculer l’histogramme. Ne pas supprimer un vote directement sans corriger son compteur.

## Vérification

`npm test` inclut des tests sur SQLite réel en mémoire : unicité face aux requêtes concurrentes, dates, fermeture, récupération, statistiques pondérées, groupes et classement ex æquo. La validation navigateur lit ensuite le Worker connecté à Cloudflare D1 ; elle ne crée pas de vote de test dans les données de production.

## Emails de participation

Le pseudo est obligatoire. L’email est facultatif, même lorsque le service email est activé. Seule une adresse renseignée est validée ; un vote sans email ne crée aucun mail. Les choix de la communauté et des amis sont affichés dans l’interface uniquement après participation ; les API publiques restent consultables. Le vote est enregistré avant la préparation du mail. Une panne du prestataire ne supprime pas la participation. Un joueur ayant déjà voté peut ajouter son adresse depuis sa participation reconnue. Une adresse reçoit au plus un mail de confirmation par manche ; les retries de vote n’en créent pas d’autres. La version actuelle ne permet pas de remplacer une adresse déjà enregistrée ni de renvoyer un lien expiré depuis l’interface.

Le mail contient la date, le pseudo, un lien de récupération privé, une action pour créer/retrouver son défi, une confirmation et un désabonnement. La confirmation expire après sept jours et nécessite un clic sur le bouton de la page ; un simple GET par un scanner de liens ne confirme rien. La récupération et le désabonnement utilisent des jetons séparés. Le lien reçu par email reste distinct du lien privé généré manuellement.

Les emails et les jetons ne sont jamais inclus dans les statistiques publiques. Les pseudos publics apparaissent dans les dix pronostics les plus proches après publication. Les jetons sont stockés hachés ; les messages en attente sont chiffrés avec AES-GCM et `GAME_EMAIL_KEY`. **Conserver ce secret** : le changer sans migration rend les messages existants illisibles.

Une tâche Cron toutes les cinq minutes synchronise les manches avec les données déployées et prépare les résultats pour les seules adresses confirmées, non désabonnées. Elle envoie l’écart en jours, le rang communautaire, la médiane et les rangs des défis. Chaque résultat est un instantané ; une correction ultérieure de la date réelle ou un nouveau défi ne déclenche pas automatiquement un deuxième mail.

Les envois utilisent une file D1, un bail exclusif, une charge utile figée et la clé d’idempotence Resend. Six tentatives maximum ; arrêt des tentatives ambiguës avant la fin de la fenêtre de déduplication de 24 heures. Les erreurs définitives restent visibles avec `status='failed'` dans `game_mail_jobs` ; pas de boucle de renvoi automatique sans limite.

Les plafonds applicatifs par défaut sont **90 tentatives par jour et 2 800 par mois**, ajustables par `GAME_EMAIL_DAILY_LIMIT` et `GAME_EMAIL_MONTHLY_LIMIT`. Les messages excédentaires attendent, sans achat automatique de forfait. Ces plafonds ne remplacent pas ceux du prestataire : un lancement viral peut retarder l’envoi, notamment les résultats à toute la communauté.

### Aperçu des emails

L’aperçu connecté à Cloudflare D1 n’envoie ni ne simule d’emails. Les tests automatisés exercent la préparation, le chiffrement, la confirmation et les résultats sur une base SQLite en mémoire. Pour activer de vrais emails, terminer la configuration Resend et déployer les secrets et variables de production décrits ci-dessus.

### Références d’intégration

- Resend API : https://resend.com/docs/api-reference/emails/send-email
- Déduplication 24 h : https://resend.com/docs/dashboard/emails/idempotency-keys
- Offre et limites : https://resend.com/pricing
- Alternative Cloudflare Email (nécessite Workers Paid pour les destinataires arbitraires) : https://developers.cloudflare.com/email-service/platform/pricing/
