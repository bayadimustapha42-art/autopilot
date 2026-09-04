"use strict";

const $ = selector => document.querySelector(selector);
const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
const money = (value, currency) => `${Number(value || 0).toFixed(2)} ${esc(currency || "$")}`;
let cache = { summary: null, ideas: [], products: [], campaigns: [], pack: null, asset: "pins" };

async function api(url, options) {
  const response = await fetch(url, Object.assign({ headers: { "Content-Type": "application/json" } }, options || {}));
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}
function toast(message, error) { const el = $("#toast"); el.textContent = message; el.style.background = error ? "#fb7185" : "#5eead4"; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 3000); }
function nav() { document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active")); button.classList.add("active"); document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view")); $("#" + button.dataset.view).classList.add("active-view"); })); }
function kpi(label, value, foot, accent) { return `<div class="kpi" style="--accent:${accent}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`; }
function decisionBadge(d) { return `<span class="badge ${esc(d.tone)}">${esc(d.label)}</span>`; }

function renderDashboard() {
  const s = cache.summary, m = s.metrics, cur = s.settings.currency;
  $("#dashboard").innerHTML = `<div class="page-head"><div><div class="eyebrow">Pilotage intelligent</div><h1>Bonjour, voici ton cockpit.</h1><p>Une vue claire des opportunités, du contenu généré et des décisions à prendre. Le système reste local et tes données ne quittent pas ton ordinateur.</p></div><button class="button" data-go="studio">+ Créer une campagne</button></div>
  <div class="kpis">${kpi("Revenu net", money(m.net, cur), `${money(m.revenue, cur)} brut`, "#5eead4")}${kpi("Ventes", m.sales, `${m.clicks} clics suivis`, "#66a6ff")}${kpi("Conversion", `${m.conversion.toFixed(1)}%`, `${m.visits} visites`, "#a78bfa")}${kpi("Opportunités", s.ideaCount, `${s.productCount} produit actif`, "#fbbf75")}</div>
  <div class="dashboard-grid"><div class="panel"><div class="panel-title"><h2>Opportunité recommandée</h2><span>Score automatique</span></div>${s.topIdea ? `<div class="idea-highlight"><div class="score">${s.topIdea.score}<small>/100</small></div><h3>${esc(s.topIdea.name)}</h3><p class="muted">Meilleur équilibre entre demande, marge, risque et automatisation.</p><div class="progress"><i style="width:${s.topIdea.score}%"></i></div><button class="button secondary" data-go="opportunities">Voir toutes les idées →</button></div>` : `<div class="empty">Aucune idée disponible.</div>`}</div><div class="panel"><div class="panel-title"><h2>Prochaine action</h2><span>Autopilot</span></div><div class="notice">${s.campaignCount ? `Tu as <strong>${s.campaignCount}</strong> campagne(s) suivie(s). Consulte les décisions et améliore en priorité les offres sans vente.` : `Crée ta première campagne pour commencer à mesurer les visites, les clics et les ventes.`}</div><div style="height:14px"></div><div class="notice">✅ Génération locale active<br>✅ Aucun abonnement requis<br>◷ Publication plateforme : intervention humaine ou API approuvée</div></div></div>
  <div class="panel" style="margin-top:18px"><div class="panel-title"><h2>Campagnes récentes</h2><span>${s.campaignCount} au total</span></div>${campaignTable(s.campaigns, cur)}</div>`;
  document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => { const target = el.dataset.go; document.querySelector(`[data-view="${target}"]`).click(); }));
}
function campaignTable(rows, cur, editable) { if (!rows.length) return `<div class="empty">Aucune campagne. Lance ton premier pack de contenu depuis Content Studio.</div>`; return `<div class="table-wrap"><table><thead><tr><th>Produit</th><th>Statut</th><th>Visites</th><th>Ventes</th><th>Net</th><th>Décision</th>${editable ? "<th></th>" : ""}</tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.status)}</td><td>${r.visits}</td><td>${r.sales}</td><td>${money(r.revenue - r.fees, cur)}</td><td>${decisionBadge(r.decision)}</td>${editable ? `<td><button class="button secondary table-action" data-edit="${esc(r.id)}">Modifier</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`; }

function renderOpportunities() {
  $("#opportunities").innerHTML = `<div class="page-head"><div><div class="eyebrow">Research & scoring</div><h1>Opportunités produits</h1><p>Le scoring transparent pondère chaque idée sur 100. Clique sur une carte pour voir les critères et sélectionner une direction.</p></div><button class="button secondary" id="custom-score">Évaluer une idée</button></div><div class="idea-grid">${cache.ideas.map((idea, index) => `<article class="idea-card ${index === 0 ? "selected" : ""}" data-idea="${esc(idea.id)}"><div class="idea-score"><span class="muted">#${String(index + 1).padStart(2, "0")}</span><span class="score-ring">${idea.score}<small class="muted">/100</small></span></div><h3>${esc(idea.name)}</h3><div class="progress"><i style="width:${idea.score}%"></i></div><div class="bars">${bar("Demande", idea.demande)}${bar("Marge", idea.marge)}${bar("Auto", idea.automatisation)}</div></article>`).join("")}</div><div id="idea-detail" class="panel" style="margin-top:18px"></div>`;
  const show = id => { const idea = cache.ideas.find(i => i.id === id) || cache.ideas[0]; if (!idea) return; $("#idea-detail").innerHTML = `<div class="panel-title"><h2>${esc(idea.name)}</h2>${decisionBadge({ label: idea.score >= 70 ? "À PRIORISER" : "À TESTER", tone: idea.score >= 70 ? "good" : "warn" })}</div><p class="muted">Score final : <strong class="score-ring">${idea.score}/100</strong>. Les critères sont notés de 1 à 10 ; la concurrence et le risque sont interprétés comme des facteurs de sélection.</p><div class="bars" style="max-width:600px">${bar("Demande", idea.demande)}${bar("Concurrence", idea.concurrence)}${bar("Marge", idea.marge)}${bar("Viralité", idea.viral)}${bar("Facilité", idea.facilite)}${bar("Risque", idea.risque)}${bar("Automatisation", idea.automatisation)}</div>`; document.querySelectorAll(".idea-card").forEach(c => c.classList.toggle("selected", c.dataset.idea === idea.id)); };
  document.querySelectorAll(".idea-card").forEach(card => card.addEventListener("click", () => show(card.dataset.idea))); show(cache.ideas[0] && cache.ideas[0].id);
  $("#custom-score").addEventListener("click", async () => {
    const name = prompt("Nom de l'idée à évaluer :");
    if (!name) return;
    try {
      const result = await api("/api/score", { method: "POST", body: JSON.stringify({ name }) });
      toast(`${result.idea.name} : ${result.idea.score}/100`);
    } catch (e) { toast(e.message, true); }
  });
}
function bar(label, value) { return `<div class="bar-line"><span>${label}</span><i style="width:${Number(value || 0) * 10}%"></i><b>${value || 0}</b></div>`; }

function renderStudio() {
  const options = cache.products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
  $("#studio").innerHTML = `<div class="page-head"><div><div class="eyebrow">Création assistée</div><h1>Content studio</h1><p>Un produit, quatre assets prêts à publier. Génération locale instantanée, sans clé IA ni service payant.</p></div></div><div class="studio-grid"><div class="panel form-card"><label class="label">Produit<select class="select" id="product-select">${options}</select></label><label class="label">Statut initial<select class="select" id="pack-status"><option value="draft">Brouillon</option><option value="ready">Prêt à publier</option><option value="published">Publié</option></select></label><button class="button" id="generate-pack">Générer le pack</button><div class="notice">Le pack comprend 2 Pins, 1 script vidéo, 1 post communautaire et 1 annonce Etsy.</div></div><div class="panel" id="asset-panel"><div class="empty">Choisis un produit puis clique sur « Générer le pack ».</div></div></div>`;
  $("#generate-pack").addEventListener("click", async () => { try { cache.pack = await api("/api/content-pack", { method: "POST", body: JSON.stringify({ productId: $("#product-select").value }) }); cache.asset = "pins"; renderAsset(); toast("Pack généré avec succès"); } catch (e) { toast(e.message, true); } });
}
function renderAsset() { if (!cache.pack) return; const p = cache.pack; const assets = { pins: ["Épingles Pinterest", p.pins], tiktok: ["Script vidéo", p.tiktok], post: ["Post communautaire", p.post], listing: ["Annonce Etsy", p.listing] }; if (!assets[cache.asset]) cache.asset = "pins"; const current = assets[cache.asset]; $("#asset-panel").innerHTML = `<div class="asset-tabs">${Object.keys(assets).map(key => `<button class="tab ${key === cache.asset ? "active" : ""}" data-asset="${key}">${assets[key][0]}</button>`).join("")}</div><div class="asset-head"><span class="muted">Généré le ${new Date(p.generatedAt).toLocaleString("fr-FR")}</span><button class="button secondary" id="copy-asset">Copier</button></div><textarea class="textarea" id="asset-text" readonly>${esc(current[1])}</textarea><div style="height:14px"></div><button class="button" id="save-campaign">Enregistrer comme campagne</button>`; document.querySelectorAll("[data-asset]").forEach(btn => btn.addEventListener("click", () => { cache.asset = btn.dataset.asset; renderAsset(); }));$("#copy-asset").addEventListener("click", async () => { try { if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(current[1]); else { const area = $("#asset-text"); area.removeAttribute("readonly"); area.select(); document.execCommand("copy"); area.setAttribute("readonly", ""); } toast("Asset copié dans le presse-papiers"); } catch (_) { toast("Copie impossible : sélectionne le texte manuellement.", true); } });
 $("#save-campaign").addEventListener("click", saveCampaign); }
async function saveCampaign() { try { const product = cache.pack.product; await api("/api/campaigns", { method: "POST", body: JSON.stringify({ name: product.name, productId: product.id, status: $("#pack-status").value }) }); toast("Campagne enregistrée"); document.querySelector('[data-view="campaigns"]').click(); await load(); } catch (e) { toast(e.message, true); } }

function renderCampaigns() { const cur = cache.summary.settings.currency; $("#campaigns").innerHTML = `<div class="page-head"><div><div class="eyebrow">Mesure & décisions</div><h1>Campagnes</h1><p>Ajoute les chiffres de tes plateformes pour que le système recommande automatiquement CONTINUER, AMÉLIORER, ARRÊTER ou TESTER.</p></div></div><div class="panel"><form id="campaign-form" class="campaign-form"><label class="label">Produit<input class="input" name="name" required placeholder="Nom du produit"></label><label class="label">Visites<input class="input" name="visits" type="number" min="0" value="0"></label><label class="label">Vues<input class="input" name="views" type="number" min="0" value="0"></label><label class="label">Clics<input class="input" name="clicks" type="number" min="0" value="0"></label><label class="label">Ventes<input class="input" name="sales" type="number" min="0" value="0"></label><label class="label">Revenu<input class="input" name="revenue" type="number" min="0" step=".01" value="0"></label><label class="label">Frais<input class="input" name="fees" type="number" min="0" step=".01" value="0"></label><button class="button" type="submit">Ajouter</button></form></div><div class="panel" style="margin-top:18px"><div class="panel-title"><h2>Historique complet</h2><span>${cache.campaigns.length} campagne(s)</span></div>${campaignTable(cache.campaigns, cur, true)}</div>`; $("#campaign-form").addEventListener("submit", async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { await api("/api/campaigns", { method: "POST", body: JSON.stringify(data) }); event.target.reset(); toast("Campagne ajoutée"); await load(); } catch (e) { toast(e.message, true); } }); }
async function editCampaign(id) {
  const campaign = cache.campaigns.find(item => item.id === id);
  if (!campaign) return;
  const fields = ["visits", "views", "clicks", "sales", "revenue", "fees"];
  const values = {};
  for (const key of fields) {
    const value = prompt(`${key} (${campaign[key]})`, campaign[key]);
    if (value === null) return;
    values[key] = value;
  }
  try {
    await api(`/api/campaigns/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(values) });
    toast("Campagne mise à jour");
    await load();
  } catch (e) { toast(e.message, true); }
}

function renderSettings() { const s = cache.summary.settings; $("#settings").innerHTML = `<div class="page-head"><div><div class="eyebrow">Configuration locale</div><h1>Réglages</h1><p>Ces paramètres sont stockés dans <code>studio/data/state.json</code> sur ton ordinateur.</p></div></div><div class="settings-grid"><form id="settings-form" class="panel form-card"><label class="label">Nom de la boutique<input class="input" name="shopName" value="${esc(s.shopName)}"></label><label class="label">URL de la boutique<input class="input" name="shopUrl" type="url" value="${esc(s.shopUrl)}"></label><label class="label">Devise<input class="input" name="currency" value="${esc(s.currency)}" maxlength="5"></label><button class="button" type="submit">Enregistrer les réglages</button></form><div class="notice"><strong>Automatisé :</strong> scoring, génération, stockage, calculs et décisions.<br><strong>Semi-automatisé :</strong> tu copies les assets vers les plateformes.<br><strong>Intervention humaine nécessaire :</strong> comptes, identité, paiements et autorisations API.</div></div>`; $("#settings-form").addEventListener("submit", async event => { event.preventDefault(); try { await api("/api/settings", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); toast("Réglages enregistrés"); await load(); } catch (e) { toast(e.message, true); } }); }

async function load() { try {  const [summary, ideaData, productData, campaignData] = await Promise.all([api("/api/summary"), api("/api/ideas"), api("/api/products"), api("/api/campaigns")]); cache.summary = summary; cache.ideas = ideaData.ideas; cache.products = productData.products; cache.campaigns = campaignData.campaigns;
 $("#last-sync").textContent = "Synchronisé à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); renderDashboard(); renderOpportunities(); renderStudio(); renderCampaigns(); renderSettings(); } catch (e) { toast(e.message, true); } }
document.addEventListener("click", event => {
  const button = event.target.closest("[data-edit]");
  if (button) editCampaign(button.dataset.edit);
});
nav(); $("#refresh").addEventListener("click", load); load();
