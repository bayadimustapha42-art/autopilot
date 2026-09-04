# 🤖 Autopilot Bot — Business IA à 0 €

Bot d'automatisation pour vendre des produits digitaux sur Etsy avec **0 € de départ**.

## Ce qu'il fait tout seul

- **Chaque jour** : génère 2 épingles Pinterest + 1 script TikTok/Reels + 1 post communautaire + recommande la prochaine idée produit
- **Chaque dimanche** : rapport de ventes, frais, bénéfice net, conversion, produit gagnant, décisions CONTINUER / AMÉLIORER / ARRÊTER / TESTER + dashboard HTML
- **Sans toi** : le workflow GitHub Actions (`autopilot.yml`) s'exécute chaque jour à 7h00 UTC et commit le contenu généré tout seul

## Démarrage du bot

1. `cd bot && node run.js --demo` → génère un exemple dans `bot/output/`
2. `node chat.js` → mode conversation (commandes : `epingles`, `script`, `annonce`, `idee`, `rapport`, `ventes`, `aide`)
3. Le bot tourne en continu sur GitHub Actions (voir `bot/INSTALL.md`)

## SaaS local : Autopilot Studio

Une interface web complète est disponible dans `studio/` :

```powershell
cd studio
node server.js
```

Puis ouvre **http://127.0.0.1:3030**. Elle permet de scorer les idées, générer les packs de contenu, enregistrer les campagnes et obtenir les décisions automatiques. Aucun abonnement ni clé API n'est requis.

Test rapide : `cd studio && node smoke.js`. Documentation détaillée : [`studio/README.md`](studio/README.md).

## Description du projet

| Dossier | Rôle |
|---|---|
| `bot/` | Le bot (Node.js, zéro dépendance) : `run.js`, `lib/`, `data/`, `output/` |
| `bot/chat.js` | Mode conversation interactif |
| `.github/workflows/autopilot.yml` | Planification quotidienne automatique |

## Honnêteté

Aucun revenu n'est garanti. Le bot automatise tout ce qui est techniquement automatisable gratuitement (~70 %) ; les comptes, la publication manuelle des épingles/vidéos et l'encaissement restent à toi.
