# Installer le bot pour qu'il tourne SANS toi

## Ce que le bot fait deja (teste et fonctionnel)
- Chaque jour : 2 epingles Pinterest + 1 script TikTok/Reels/Shorts + 1 post communautaire
  -> dossier `bot/output/AAAA-MM-JJ/`
- Chaque jour : recommande la prochaine idee produit (scoring >= 70/100)
  -> `bot/output/AAAA-MM-JJ/prochaine-idee.md`
- Chaque dimanche : rapport hebdomadaire automatique (ventes, frais, net, conversion)
  -> `bot/output/weekly-report.md` + `bot/output/dashboard.html`
- Decision automatique par produit : CONTINUER / AMELIORER / ARRETER / TESTER

## Option A - GitHub Actions (RECOMMANDE : gratuit, tourne sans ton ordinateur)
1. Cree un depot GitHub public (gratuit).
2. Copie TOUT ce dossier de travail (bot/ + .github/) a la racine du depot.
3. Pousse sur GitHub. Le workflow `.github/workflows/autopilot.yml` tourne
   chaque jour a 7h00 UTC et commite le contenu genere tout seul.
4. (Optionnel) Active GitHub Pages (Settings > Pages > Deploy from a branch)
   pour voir ton dashboard en ligne :
   `https://tonpseudo.github.io/ton-repo/bot/output/dashboard.html`

## Option B - Ton ordinateur (Windows)
1. Ouvre le Planificateur de taches.
2. Cree une tache quotidienne : programme `node`, argument `C:\chemin\vers\bot\run.js`.
3. L'ordinateur doit rester allume a l'heure prevue.

## Option C - Mac / Linux
- `crontab -e` puis : `0 7 * * * cd /chemin/vers/bot && node run.js`

## Les SEULES interventions humaines (impossibles a automatiser gratuitement)
Ces etapes exigent un compte ou une API payante/interdite -> le bot les prepare,
TOI tu copies-colles (5-15 min/jour maximum) :
- Coller les 2 epingles sur Pinterest (2 min)
- Uploader la video TikTok (2 min)
- Publier l'annonce Etsy (15 min, une fois par produit)
- Remplir `bot/data/sales.csv` chaque dimanche (10 min) - sinon le rapport reste a zero
- Creer les comptes (Etsy, Pinterest, TikTok, GitHub) et encaisser les paiements
- Creer la feuille Google Sheets d'un nouveau produit (2-3 h, UNE SEULE fois par produit)

## Format de sales.csv
```
date,produit,visites,vues,clics,ventes,revenu,frais
2026-09-06,Budget Tracker Bundle,120,800,45,3,36,4.8
```
- `visites` = vues de l'annonce (Etsy Stats)
- `ventes` = commandes
- `revenu` = total des commandes ($)
- `frais` = frais Etsy (0,20 $ + 6,5 % + ~3 %)

## Commandes
- `cd bot && node run.js`         : genere le lot du jour
- `cd bot && node run.js --demo`  : genere et affiche le lot
- `cd bot && node run.js --report`: genere le rapport hebdo a la main
