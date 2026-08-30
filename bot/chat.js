"use strict";
/* Mode conversation : `node chat.js` — parle au bot.
   Ce n'est pas un LLM : le bot repond a des commandes et genere du contenu.
   Commandes : epingles, script, post, annonce, idee, rapport, ventes, aide, quitter */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const content = require("./lib/content");
const report = require("./lib/report");
const scoring = require("./lib/scoring");

const DATA = path.join(__dirname, "data");
function loadJSON(f) { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); }
function product() { return loadJSON("products.json").products[0]; }

function usedIds() {
  const f = path.join(DATA, "used.txt");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean) : [];
}
function nextIdea() {
  const ideas = scoring.best(loadJSON("ideas.json").ideas, 70);
  const used = usedIds();
  return ideas.find(i => used.indexOf(i.id) === -1) || ideas[0];
}

function salesSummary() {
  const rows = report.readSales();
  const s = k => rows.reduce((a, r) => a + r[k], 0);
  return "Ventes : " + s("ventes") + " | Revenu : " + s("revenu").toFixed(2)
    + " $ | Frais : " + s("frais").toFixed(2) + " $ | Net : "
    + (s("revenu") - s("frais")).toFixed(2) + " $\n"
    + (rows.length ? "Donnees : " + rows.length + " ligne(s) dans sales.csv"
                   : "Aucune donnee : remplis bot/data/sales.csv (voir INSTALL.md).");
}

const HELP =
  "Je reponds aux commandes suivantes :\n"
  + "  epingles  -> 2 epingles Pinterest pretes a coller\n"
  + "  script    -> script TikTok / Reels / Shorts\n"
  + "  post      -> post communautaire (Facebook / LinkedIn)\n"
  + "  annonce   -> annonce Etsy complete (titre, tags, description)\n"
  + "  idee      -> prochaine idee produit recommandee (scoring >= 70)\n"
  + "  rapport   -> rapport hebdomadaire + dashboard\n"
  + "  ventes    -> resume de tes ventes (sales.csv)\n"
  + "  aide      -> cette aide\n"
  + "  quitter   -> sortir";

function answer(input) {
  const c = String(input).toLowerCase().trim().replace(/[’']/g, "'");
  const p = product();
  if (/^(epingles|pins|pin)$/.test(c)) return content.pins(p, 2);
  if (/^(script|tiktok|reels|shorts)$/.test(c)) return content.tiktok(p);
  if (/^(post|communaut)/.test(c)) return content.post(p);
  if (/^(annonce|listing|etsy)$/.test(c)) return content.listing(p);
  if (/^(idee|idée|produit|scoring)$/.test(c)) {
    const n = nextIdea();
    return n ? "Prochaine idee recommandee : " + n.name + " — score " + n.score + "/100"
      : "Aucune idee >= 70 restante : ajoute des idees dans data/ideas.json.";
  }
  if (/^rapport/.test(c)) return report.build();
  if (/^ventes/.test(c)) return salesSummary();
  if (/^(aide|help|\?)$/.test(c)) return HELP;
  if (/^(quitter|exit|bye|stop)$/.test(c)) return "QUIT";
  return "Je ne connais pas cette commande. Tape \"aide\" pour voir ce que je sais faire.";
}

/* Mode interactif (terminal) */
function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("🤖 Autopilot — parle au bot (tape \"aide\", \"quitter\")");
  rl.setPrompt("> ");
  rl.prompt();
  rl.on("line", line => {
    const a = answer(line);
    if (a === "QUIT") { console.log("À bientôt ! Le bot continue de tourner sans toi."); rl.close(); return; }
    console.log(a);
    rl.prompt();
  });
}

/* Mode pipe (test automatique) : lit toutes les lignes puis quitte */
function piped() {
  let data = "";
  process.stdin.on("data", d => data += d);
  process.stdin.on("end", () => {
    data.split("\n").filter(l => l.trim()).forEach(l => {
      const a = answer(l);
      console.log("> " + l + "\n" + (a === "QUIT" ? "(quitte)" : a) + "\n");
    });
  });
}

if (process.stdin.isTTY) interactive(); else piped();
