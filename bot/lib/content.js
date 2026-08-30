"use strict";
/* Generateurs de contenu : epingles Pinterest, scripts TikTok/Reels/Shorts,
   annonces Etsy et posts communautaires. 100 % local, zero API, zero cout. */

const DAY = 24 * 60 * 60 * 1000;
function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / DAY);
}

/* ---------- Epingles Pinterest (rotation quotidienne) ---------- */
const PINS = [
  ["Comment établir un budget en 5 minutes par mois", "Finis les fins de mois dans le rouge : une méthode simple + un tracker qui fait les calculs à ta place. Épingle ceci."],
  ["La feuille de budget qui calcule tout pour toi", "Aucune formule à connaître : tu saisis tes chiffres, les totaux se mettent à jour seuls. Épingle pour ton prochain jour de paie."],
  ["Sinking funds expliqués simplement (+ tracker)", "Vacances, Noël, réparations : prévois les grosses dépenses sans toucher à ton épargne d'urgence. Épingle ceci."],
  ["Comment épargner pour Noël sans t'endetter", "Un petit montant chaque mois au lieu de tout payer en décembre. Le tracker est inclus. Épingle pour plus tard."],
  ["La méthode snowball pour rembourser tes dettes", "Rembourse la plus petite dette d'abord, puis reporte le paiement sur la suivante. Visible et motivant. Épingle ceci."],
  ["La règle 50/30/20 expliquée simplement", "50 % besoins, 30 % envies, 20 % épargne : le template l'applique pour toi. Épingle pour plus tard."],
  ["3 erreurs de budget qui t'empêchent d'économiser", "Erreur n°1 : pas de sinking funds. Découvre les deux autres + la solution. Épingle ceci."],
  ["Le fonds d'urgence : combien il te faut vraiment", "3 à 6 mois de dépenses, construits mois par mois. Le tracker te montre où tu en es. Épingle ceci."],
  ["Le challenge épargne 52 semaines", "1 € la semaine 1, 52 € la semaine 52 : plus de 1 300 € économisés sans le sentir. Épingle ceci."],
  ["Le budget de famille : la méthode des enveloppes", "Chaque catégorie = une enveloppe virtuelle dans une seule feuille Google Sheets. Épingle pour plus tard."],
  ["Pourquoi ton budget échoue (et la solution)", "Trop strict = tu abandonnes. Simple et régulier vaut mieux que parfait et lâché. Épingle ceci."],
  ["Un budget simple qu'on tient vaut mieux qu'un budget parfait qu'on lâche", "La constance fait 80 % du résultat. Commence aujourd'hui avec le template. Épingle ceci."]
];

function pins(product, n) {
  const d = dayOfYear(new Date());
  let out = "# Épingles Pinterest — " + new Date().toISOString().slice(0, 10) + "\n\n";
  for (let i = 0; i < n; i++) {
    const p = PINS[(d + i) % PINS.length];
    out += "## Pin " + (i + 1) + "\n";
    out += "**Titre :** " + p[0] + "\n";
    out += "**Description :** " + p[1] + " (" + product.keywords[0] + ", " + product.keywords[1] + ")\n";
    out += "**Lien :** boutique Etsy → " + product.name + "\n\n";
  }
  return out;
}

/* ---------- Scripts TikTok / Reels / Shorts (5 themes en rotation) ---------- */
const THEMES = [
  { name: "education",
    hooks: ["Ton budget échoue parce qu'il est trop strict.", "3 erreurs qui ruinent ton budget chaque mois.", "La règle des 24 h avant tout achat important."],
    screens: ["Règle 50/30/20", "1. Pas de sinking funds 2. Trop strict 3. Pas de suivi", "24 h = réflexion, pas privation"],
    ctas: ["La méthode + template en bio", "Épingle ceci", "Suis pour la suite"],
    tags: ["#budget", "#moneytok", "#argent", "#budgeting"] },
  { name: "demo",
    hooks: ["Le template qui calcule tout pour toi.", "Démo : ta feuille budget en 60 secondes.", "Ça marche sur ton téléphone ? Oui."],
    screens: ["Zéro formule à connaître", "Les totaux se calculent seuls", "Google Sheets = gratuit + partout"],
    ctas: ["Lien en bio", "Template en bio", "Réponds à tes questions en DM"],
    tags: ["#googleSheets", "#template", "#budget", "#demo"] },
  { name: "dettes",
    hooks: ["La méthode snowball en 60 secondes.", "J'ai remboursé mes dettes avec une feuille.", "Le challenge épargne 52 semaines."],
    screens: ["Petite dette d'abord → paiement en cascade", "Chaque mois : une barre qui baisse", "1 € → 52 € par semaine"],
    ctas: ["Tracker en bio", "Le système en bio", "Épingle ceci"],
    tags: ["#dettes", "#snowball", "#remboursement", "#epargne"] },
  { name: "epargne",
    hooks: ["Épargner 20 % sans le sentir.", "Le fonds d'urgence : combien il te faut vraiment.", "Paie-toi d'abord : la règle qui change tout."],
    screens: ["Paie-toi d'abord", "3 à 6 mois de dépenses", "Épargne automatique = tu oublies"],
    ctas: ["Template en bio", "Le tracker en bio", "Lien en bio"],
    tags: ["#epargne", "#argent", "#moneytok", "#urgence"] },
  { name: "preuve",
    hooks: ["Avant/après : plus de fins de mois dans le rouge.", "Combien coûte mon template ? (réponse honnête)", "Et si tu commençais ton budget aujourd'hui ?"],
    screens: ["Avant → Après", "Moins qu'un resto, utile toute l'année", "5 minutes suffisent"],
    ctas: ["Template en bio", "Lien en bio", "Lien en bio — je réponds en DM"],
    tags: ["#avantapres", "#budget", "#moneytok", "#honnete"] }
];

function tiktok(product) {
  const d = dayOfYear(new Date());
  const t = THEMES[d % THEMES.length];
  const i = d % t.hooks.length;
  return "# Script TikTok / Reels / Shorts\n\n"
    + "**Date :** " + new Date().toISOString().slice(0, 10) + " — **Thème :** " + t.name + "\n"
    + "**Hook :** " + t.hooks[i] + "\n"
    + "**Texte à l'écran :** " + t.screens[i] + "\n"
    + "**CTA :** " + t.ctas[i] + "\n"
    + "**Hashtags :** " + t.tags.join(" ") + "\n"
    + "**Description :** " + product.name + " — " + product.cta + "\n"
    + "**Idée vidéo :** face caméra ou capture d'écran de la feuille, 15-30 s, sous-titres auto (CapCut gratuit).\n";
}

/* ---------- Annonce Etsy complete ---------- */
function listing(product) {
  return "# Annonce Etsy — " + product.name + "\n\n"
    + "## Titre (≤ 140 caractères)\n" + product.keywords.slice(0, 6).join(", ") + "\n\n"
    + "## 13 tags (≤ 20 caractères chacun)\n" + product.keywords.slice(0, 13).join(" · ") + "\n\n"
    + "## Description (copier-coller)\n" + description(product) + "\n\n"
    + "## Prix\n" + product.price + " $ — lancement : " + product.priceSale + " $\n";
}

function description(product) {
  return "### Reprenez le contrôle de votre argent en 5 minutes par mois 💸\n"
    + product.pain + ".\n\n"
    + "**CE QUE VOUS RECEVEZ (téléchargement instantané) :**\n"
    + product.files.map(f => "- " + f).join("\n") + "\n\n"
    + "**POURQUOI LES ACHETEURS L'ADORENT :**\n"
    + "- Calculs 100 % automatiques (aucune formule à connaître)\n"
    + "- Catégories pré-remplies, entièrement personnalisables\n"
    + "- Fonctionne avec Google Sheets (gratuit), sur téléphone et ordinateur\n"
    + "- Téléchargement instantané + accès à vie\n\n"
    + "**COMMENT ÇA MARCHE :** 1) Achat → 2) Téléchargement instantané → 3) Ouvrir dans Google Sheets → 4) Saisir ses chiffres → terminé.\n\n"
    + "**FAQ :**\n"
    + "- « Comment recevoir le fichier ? » → Téléchargement instantané après l'achat, ouvert dans Google Sheets (gratuit).\n"
    + "- « Puis-je personnaliser les catégories ? » → Oui, toutes les catégories sont modifiables.\n\n"
    + "*Produit numérique — aucun article physique ne sera expédié.*";
}

/* ---------- Post communautaire ---------- */
function post(product) {
  return "# Post communautaire (Facebook / LinkedIn / Discord)\n\n"
    + "Quelqu'un ici a déjà regardé son compte le 25 du mois en se demandant où est passé son salaire ? 🙋\n\n"
    + "J'ai créé une feuille Google Sheets (gratuite) qui fait le calcul à ta place : budget mensuel, sinking funds et remboursement de dettes. "
    + "Tu saisis tes chiffres, tout le reste se met à jour seul.\n\n"
    + "👉 " + product.name + " — " + product.priceSale + " $ (prix de lancement, téléchargement instantané).\n"
    + "Je réponds à toutes les questions en commentaire ou en DM.";
}

module.exports = { pins, tiktok, listing, post };
