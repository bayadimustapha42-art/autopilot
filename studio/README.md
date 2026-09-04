# Autopilot Studio

SaaS local-first pour piloter le business digital : scoring des idées, génération de contenu, suivi des campagnes et décisions automatiques.

## Démarrage

Depuis la racine du projet :

```powershell
cd studio
node server.js
```

Puis ouvre : **http://127.0.0.1:3030**

Aucun abonnement, aucune clé API et aucune base de données externe ne sont nécessaires.

## Fonctionnalités

- **Vue d'ensemble** : revenu, ventes, conversion, opportunité recommandée et campagnes récentes.
- **Opportunités** : scoring transparent sur 100 à partir de `bot/data/ideas.json`.
- **Content studio** : 2 Pins, un script TikTok/Reels, un post et une annonce Etsy générés à partir de `bot/lib/content.js`.
- **Campagnes** : suivi des visites, vues, clics, ventes, revenu et frais avec recommandation automatique.
- **Réglages** : nom, URL et devise de la boutique.

Les campagnes sont enregistrées localement dans `studio/data/state.json`. Ce fichier ne doit pas contenir de secret.

## Tests

```powershell
cd studio
node smoke.js
```

Le test vérifie la santé de l'API, les pages statiques, les validations, les idées, les produits, le pack de contenu et le cycle création/mise à jour d'une campagne. Il supprime ensuite sa donnée de test.

## API locale

- `GET /api/health`
- `GET /api/summary`
- `GET /api/ideas`
- `GET /api/products`
- `POST /api/score`
- `POST /api/content-pack`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `PUT /api/campaigns/:id`
- `PUT /api/settings`

## Automatisation réaliste

**Automatisé :** scoring, génération, sauvegarde locale, calcul des métriques et décisions.

**Semi-automatisé :** copier les contenus générés vers Etsy, Pinterest, TikTok ou Instagram.

**Intervention humaine nécessaire :** création et validation des comptes, identité, paiement, publication si aucune API officielle approuvée n'est disponible. Cette application ne contourne pas les règles des plateformes et ne prétend pas générer de revenu garanti.

## Prochaine étape

Quand le cœur local est validé, des connecteurs officiels peuvent être ajoutés derrière des variables d'environnement et des boutons de validation explicite. Ne place jamais un token dans le code, `state.json`, les logs ou le dépôt Git.
