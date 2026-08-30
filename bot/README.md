# 🤖 Autopilot Bot — business en ligne automatise a 0 euro

Bot Node.js **zero dependance** qui gere la boucle du business Etsy digital :

RECHERCHE (banque d'idees) → SCORING (>= 70/100) → CREATION (epingles, scripts,
annonces, posts) → ANALYSE (rapport hebdo + decisions CONTINUER/AMELIORER/ARRETER/TESTER)

## Demarrage rapide
```
cd bot
node run.js --demo     # genere le lot du jour et l'affiche
node run.js --report   # rapport hebdomadaire + dashboard
```

## Structure
- `run.js`            : orchestrateur (lot quotidien + rapport auto le dimanche)
- `lib/scoring.js`    : scoring des idees produits sur 100
- `lib/content.js`    : generateurs de contenu (epingles, TikTok, annonces, posts)
- `lib/report.js`     : analyse des ventes + decisions
- `data/`             : produits, idees, ventes (sales.csv), historique
- `output/`           : contenu genere + rapport + dashboard

## Pour qu'il tourne sans toi
Voir `INSTALL.md` (GitHub Actions gratuit = option recommandee).

## Honnete
Le bot automatise TOUT ce qui est automatisable gratuitement (~70 %).
La publication sur Etsy/Pinterest/TikTok et l'encaissement exigent des comptes
et des actions manuelles (API payantes ou interdites) -> indiquees dans INSTALL.md.
Aucun revenu garanti : le bot produit et analyse, les ventes dependent du marche.
