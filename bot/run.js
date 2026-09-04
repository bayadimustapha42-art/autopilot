"use strict";
/* Orchestrateur du bot autopilote.
   Usage :
     node run.js          -> genere le lot du jour (epingles + script + post) dans output/AAAA-MM-JJ/
     node run.js --report -> genere le rapport hebdomadaire (md + dashboard.html)
     node run.js --demo   -> genere le lot du jour et l'affiche a l'ecran
   Le rapport hebdo se lance aussi automatiquement chaque dimanche. */

const fs = require("fs");
const path = require("path");
const content = require("./lib/content");
const report = require("./lib/report");
const scoring = require("./lib/scoring");

const DATA = path.join(__dirname, "data");
const OUT = path.join(__dirname, "output");

function loadJSON(f) {
  const file = path.join(DATA, f);
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error("Données invalides dans " + f + " : " + error.message); }
}

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function stamp(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

function usedIds() {
  const f = path.join(DATA, "used.txt");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split(/\r?\n/).map(id => id.trim()).filter(Boolean) : [];
}

/* Prochaine idee produit recommandee (score >= 70, non deja proposee). */
function nextProduct() {
  const ideaData = loadJSON("ideas.json");
  const ideas = scoring.best(ideaData && Array.isArray(ideaData.ideas) ? ideaData.ideas : [], 70);
  const used = usedIds();
  return ideas.find(i => used.indexOf(i.id) === -1) || ideas[0];
}

function batch() {
  const productData = loadJSON("products.json");
  const products = productData && Array.isArray(productData.products) ? productData.products : [];
  const product = products[0] || { name: "Produit à définir", price: 0, priceSale: 0, keywords: [], files: [], cta: "" };
  const today = stamp(new Date());
  const dir = path.join(OUT, today);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "pins.md"), content.pins(product, 2), "utf8");
  fs.writeFileSync(path.join(dir, "tiktok.md"), content.tiktok(product), "utf8");
  fs.writeFileSync(path.join(dir, "post.md"), content.post(product), "utf8");

  const next = nextProduct();
  if (next && usedIds().indexOf(next.id) === -1) {
    fs.writeFileSync(path.join(dir, "prochaine-idee.md"),
      "# Prochaine idée produit recommandée\n\n"
      + "**" + next.name + "** — score " + next.score + "/100\n\n"
      + "Action : crée la feuille Google Sheets (2-3 h), puis ajoute le produit dans data/products.json.\n", "utf8");
    fs.appendFileSync(path.join(DATA, "used.txt"), next.id + "\n", "utf8");
  }

  fs.appendFileSync(path.join(OUT, "log.txt"), "[" + today + "] lot généré\n", "utf8");

  // Rapport automatique chaque dimanche
  if (new Date().getDay() === 0) report.build();
  return dir;
}

function main() {
  const args = process.argv.slice(2);
  if (args.indexOf("--report") !== -1) {
    report.build();
    console.log("Rapport hebdomadaire généré (output/weekly-report.md + dashboard.html).");
    return;
  }
  const dir = batch();
  if (args.indexOf("--demo") !== -1) {
    fs.readdirSync(dir).forEach(f => {
      if (f.endsWith(".md")) {
        console.log("\n===== " + f + " =====");
        console.log(fs.readFileSync(path.join(dir, f), "utf8"));
      }
    });
  } else {
    console.log("Lot du jour généré dans " + dir);
  }
}

main();
