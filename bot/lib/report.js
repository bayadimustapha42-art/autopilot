"use strict";
/* Rapport hebdomadaire : analyse bot/data/sales.csv et genere
   output/weekly-report.md + output/dashboard.html (page autonome). */

const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "data");
const OUT = path.join(__dirname, "..", "output");
const CSV = path.join(DATA, "sales.csv");

function readSales() {
  if (!fs.existsSync(CSV)) return [];
  return fs.readFileSync(CSV, "utf8").split("\n")
    .filter(l => l.trim() && !l.startsWith("date"))
    .map(l => {
      const c = l.split(",");
      return {
        date: c[0] || "", produit: c[1] || "?",
        visites: +c[2] || 0, vues: +c[3] || 0, clics: +c[4] || 0,
        ventes: +c[5] || 0, revenu: +c[6] || 0, frais: +c[7] || 0
      };
    });
}

/* Regle de decision par produit : CONTINUER / AMELIORER / ARRETER / TESTER */
function decisions(rows) {
  const byP = {};
  rows.forEach(r => { byP[r.produit] = byP[r.produit] || []; byP[r.produit].push(r); });
  return Object.keys(byP).map(p => {
    const rs = byP[p];
    const visites = rs.reduce((a, r) => a + r.visites, 0);
    const vues = rs.reduce((a, r) => a + r.vues, 0);
    const ventes = rs.reduce((a, r) => a + r.ventes, 0);
    let decision;
    if (visites === 0) decision = "ARRÊTER — 0 visite : retirer l'annonce (économise 0,20 $)";
    else if (ventes === 0) decision = "AMÉLIORER — vues mais 0 vente : retravailler titre, visuel ou prix";
    else if (ventes >= 2) decision = "CONTINUER — dupliquer en variantes (couleurs, langues, formats)";
    else decision = "TESTER — ajouter des épingles et vidéos sur ce produit";
    return { produit: p, visites, vues, ventes, decision };
  });
}

function build() {
  const rows = readSales();
  const somme = k => rows.reduce((a, r) => a + r[k], 0);
  const ventes = somme("ventes"), revenu = somme("revenu"), frais = somme("frais");
  const visites = somme("visites");
  const net = revenu - frais;
  const conv = visites ? ((ventes / visites) * 100).toFixed(1) + " %" : "—";
  const dec = decisions(rows);
  const top = dec.slice().sort((a, b) => b.ventes - a.ventes)[0];

  const md =
    "# Rapport hebdomadaire — " + new Date().toISOString().slice(0, 10) + "\n\n"
    + "**Ventes :** " + ventes + " · **Revenu :** " + revenu.toFixed(2) + " $ · **Frais :** "
    + frais.toFixed(2) + " $ · **Net :** " + net.toFixed(2) + " $\n"
    + "**Visites :** " + visites + " · **Conversion :** " + conv + "\n"
    + "**Produit gagnant :** " + (top ? top.produit + " (" + top.ventes + " ventes)" : "—") + "\n\n"
    + (dec.length
      ? "## Décisions\n\n" + dec.map(d => "- **" + d.produit + "** : " + d.decision).join("\n") + "\n"
      : "## Décisions\n\n_Aucune donnée dans sales.csv — ajoute une ligne par semaine (voir INSTALL.md)._");

  fs.writeFileSync(path.join(OUT, "weekly-report.md"), md, "utf8");
  fs.writeFileSync(path.join(OUT, "dashboard.html"), dashboardHtml(ventes, revenu, frais, net, visites, conv, dec), "utf8");
  return md;
}

function dashboardHtml(ventes, revenu, frais, net, visites, conv, dec) {
  const rows = dec.map(d =>
    "<tr><td>" + d.produit + "</td><td>" + d.visites + "</td><td>" + d.vues
    + "</td><td>" + d.ventes + "</td><td class=\"d\">" + d.decision + "</td></tr>").join("");
  return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">"
    + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>Autopilot — Tableau de bord</title><style>"
    + "body{margin:0;font-family:system-ui,sans-serif;background:#070b14;color:#eef2f9;line-height:1.5}"
    + ".wrap{max-width:860px;margin:0 auto;padding:24px 16px}h1{font-size:1.5rem}"
    + ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}"
    + ".card{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:14px}"
    + ".card b{display:block;font-size:1.35rem;background:linear-gradient(100deg,#8b5cf6,#3b82f6);-webkit-background-clip:text;background-clip:text;color:transparent}"
    + ".card span{color:#93a0b4;font-size:.8rem}table{width:100%;border-collapse:collapse;font-size:.88rem}"
    + "th,td{padding:8px 10px;text-align:left;border-bottom:1px solid rgba(148,163,184,.15)}th{color:#93a0b4;font-size:.75rem;text-transform:uppercase}"
    + ".d{color:#a5b4fc}.note{color:#93a0b4;font-size:.85rem;margin-top:16px}"
    + "</style></head><body><div class=\"wrap\"><h1>🤖 Autopilot — Tableau de bord</h1>"
    + "<p class=\"note\">Généré le " + new Date().toISOString().slice(0, 10) + " par le bot (rapport hebdomadaire automatique).</p>"
    + "<div class=\"grid\">"
    + "<div class=\"card\"><b>" + ventes + "</b><span>Ventes</span></div>"
    + "<div class=\"card\"><b>" + revenu.toFixed(2) + " $</b><span>Revenu</span></div>"
    + "<div class=\"card\"><b>" + frais.toFixed(2) + " $</b><span>Frais</span></div>"
    + "<div class=\"card\"><b>" + net.toFixed(2) + " $</b><span>Net</span></div>"
    + "<div class=\"card\"><b>" + visites + "</b><span>Visites</span></div>"
    + "<div class=\"card\"><b>" + conv + "</b><span>Conversion</span></div>"
    + "</div>"
    + (dec.length
      ? "<h2>Décisions produits</h2><table><tr><th>Produit</th><th>Visites</th><th>Vues</th><th>Ventes</th><th>Décision</th></tr>"
        + rows + "</table>"
      : "<p class=\"note\">Aucune donnée : ajoute des lignes dans bot/data/sales.csv (voir INSTALL.md).</p>")
    + "</div></body></html>";
}

module.exports = { build, readSales, decisions };
