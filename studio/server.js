"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const STATE_FILE = path.join(ROOT, "data", "state.json");
const BOT = path.join(ROOT, "..", "bot");
const configuredPort = Number(process.env.PORT);
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort < 65536 ? configuredPort : 3030;
const MAX_BODY_BYTES = 1024 * 1024;
const STATUSES = ["draft", "ready", "published", "archived"];
const SCORE_KEYS = ["demande", "concurrence", "marge", "viral", "facilite", "risque", "automatisation"];

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (_) { return fallback; }
}

function saveState(nextState) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  // A direct write is intentional here: rename-over-existing is unreliable on Windows.
  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + "\n", "utf8");
}

function state() {
  const fallback = { settings: { shopName: "Autopilot Budget Studio", shopUrl: "https://www.etsy.com/", currency: "$" }, campaigns: [] };
  const loaded = readJson(STATE_FILE, null);
  const current = loaded && typeof loaded === "object" && !Array.isArray(loaded) ? loaded : {};
  const loadedSettings = current.settings && typeof current.settings === "object" && !Array.isArray(current.settings) ? current.settings : {};
  current.settings = {
    shopName: clean(loadedSettings.shopName || fallback.settings.shopName, 100) || fallback.settings.shopName,
    shopUrl: clean(loadedSettings.shopUrl || fallback.settings.shopUrl, 500) || fallback.settings.shopUrl,
    currency: clean(loadedSettings.currency || fallback.settings.currency, 5) || fallback.settings.currency
  };
  current.campaigns = Array.isArray(current.campaigns)
    ? current.campaigns.filter(item => item && typeof item === "object" && !Array.isArray(item))
    : [];
  return current;
}

function botJson(name, fallback) { return readJson(path.join(BOT, "data", name), fallback); }
function products() {
  const data = botJson("products.json", { products: [] });
  return data && Array.isArray(data.products) ? data.products : [];
}
function ideas() {
  const data = botJson("ideas.json", { ideas: [] });
  return data && Array.isArray(data.ideas) ? data.ideas : [];
}
function scoring() { return require(path.join(BOT, "lib", "scoring.js")); }
function content() { return require(path.join(BOT, "lib", "content.js")); }

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
  res.end(payload);
}

function text(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let tooLarge = false;
    req.on("data", chunk => {
      if (tooLarge) return;
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        tooLarge = true;
        raw = "";
      }
    });
    req.on("end", () => {
      if (tooLarge) return reject(new Error("Payload trop volumineux (1 Mo maximum)."));
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
        resolve(parsed);
      } catch (_) { reject(new Error("JSON invalide")); }
    });
    req.on("error", reject);
  });
}

function number(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; }
function scoreNumber(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 5; }
function clean(value, max) { return String(value == null ? "" : value).trim().slice(0, max || 300); }
function withScore(items) { return items.map(item => scoring().scoreIdea(Object.assign({}, item))); }
function normalizeIdea(input) {
  const item = { id: "custom", name: clean(input.name || "Nouvelle idée", 120) || "Nouvelle idée" };
  SCORE_KEYS.forEach(key => { item[key] = scoreNumber(input[key]); });
  return item;
}

function metrics(campaigns) {
  const sum = key => campaigns.reduce((total, item) => total + number(item[key]), 0);
  const visits = sum("visits"), views = sum("views"), clicks = sum("clicks"), sales = sum("sales");
  const revenue = sum("revenue"), fees = sum("fees");
  return { visits, views, clicks, sales, revenue, fees, net: revenue - fees, conversion: visits ? sales / visits * 100 : 0 };
}

function decision(campaign) {
  const visits = number(campaign.visits), sales = number(campaign.sales);
  if (!visits) return { label: "ARRÊTER", tone: "danger", action: "Obtenir des visites ou archiver cette campagne." };
  if (!sales) return { label: "AMÉLIORER", tone: "warn", action: "Tester le titre, le visuel et le prix." };
  if (sales >= 2) return { label: "CONTINUER", tone: "good", action: "Créer une variante et réutiliser le contenu gagnant." };
  return { label: "TESTER", tone: "info", action: "Publier davantage de contenus sur ce produit." };
}

function summary() {
  const s = state();
  const all = s.campaigns.map(item => Object.assign({}, item, { decision: decision(item) }));
  const ranked = withScore(ideas()).sort((a, b) => b.score - a.score);
  const recent = all.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return { metrics: metrics(s.campaigns), campaigns: recent.slice(0, 8), campaignCount: all.length, topIdea: ranked[0] || null, settings: s.settings, productCount: products().length, ideaCount: ranked.length };
}

function contentPack(product) {
  if (!product) throw new Error("Produit introuvable");
  const c = content();
  return { product, generatedAt: new Date().toISOString(), pins: c.pins(product, 2), tiktok: c.tiktok(product), post: c.post(product), listing: c.listing(product) };
}

async function api(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname === "/api/health") return json(res, 200, { ok: true, service: "autopilot-studio", time: new Date().toISOString() });
    if (req.method === "GET" && pathname === "/api/summary") return json(res, 200, summary());
    if (req.method === "GET" && pathname === "/api/ideas") return json(res, 200, { ideas: withScore(ideas()).sort((a, b) => b.score - a.score) });
    if (req.method === "GET" && pathname === "/api/products") return json(res, 200, { products: products() });
    if (req.method === "GET" && pathname === "/api/campaigns") return json(res, 200, { campaigns: state().campaigns.map(item => Object.assign({}, item, { decision: decision(item) })) });

    if (req.method === "POST" && pathname === "/api/score") {
      const input = await body(req);
      return json(res, 200, { idea: scoring().scoreIdea(normalizeIdea(input)) });
    }

    if (req.method === "POST" && pathname === "/api/content-pack") {
      const input = await body(req);
      const productId = clean(input.productId, 80);
      const p = products().find(item => item.id === productId);
      if (!p) return json(res, 404, { error: "Produit introuvable." });
      return json(res, 200, contentPack(p));
    }

    if (req.method === "POST" && pathname === "/api/campaigns") {
      const input = await body(req);
      const now = new Date().toISOString();
      const name = clean(input.name, 120);
      if (!name) return json(res, 400, { error: "Le nom du produit est obligatoire." });
      const campaign = {
        id: crypto.randomUUID(), name, productId: clean(input.productId, 80), status: STATUSES.includes(input.status) ? input.status : "draft",
        visits: number(input.visits), views: number(input.views), clicks: number(input.clicks), sales: number(input.sales), revenue: number(input.revenue), fees: number(input.fees), createdAt: now, updatedAt: now
      };
      const s = state(); s.campaigns.push(campaign); saveState(s);
      return json(res, 201, Object.assign({}, campaign, { decision: decision(campaign) }));
    }

    const match = pathname.match(/^\/api\/campaigns\/([^/]+)$/);
    if (match && req.method === "PUT") {
      let campaignId;
      try { campaignId = decodeURIComponent(match[1]); }
      catch (_) { return json(res, 400, { error: "Identifiant de campagne invalide." }); }
      const input = await body(req), s = state(), item = s.campaigns.find(c => c.id === campaignId);
      if (!item) return json(res, 404, { error: "Campagne introuvable." });
      if (input.name !== undefined) {
        const name = clean(input.name, 120);
        if (!name) return json(res, 400, { error: "Le nom du produit ne peut pas être vide." });
        item.name = name;
      }
      if (input.productId !== undefined) item.productId = clean(input.productId, 80);
      if (input.status !== undefined && STATUSES.includes(input.status)) item.status = input.status;
      ["visits", "views", "clicks", "sales", "revenue", "fees"].forEach(key => { if (input[key] !== undefined) item[key] = number(input[key]); });
      item.updatedAt = new Date().toISOString(); saveState(s);
      return json(res, 200, Object.assign({}, item, { decision: decision(item) }));
    }

    if (req.method === "PUT" && pathname === "/api/settings") {
      const input = await body(req), s = state();
      const shopName = clean(input.shopName, 100);
      const shopUrl = clean(input.shopUrl, 500);
      const currency = clean(input.currency, 5);
      if (shopName) s.settings.shopName = shopName;
      if (shopUrl) {
        try { const parsed = new URL(shopUrl); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); }
        catch (_) { return json(res, 400, { error: "L'URL de boutique doit commencer par http:// ou https://." }); }
        s.settings.shopUrl = shopUrl;
      }
      if (currency) s.settings.currency = currency;
      saveState(s); return json(res, 200, s.settings);
    }
    return json(res, 404, { error: "Route introuvable." });
  } catch (error) {
    const status = /Payload trop volumineux|JSON invalide/.test(error.message || "") ? 400 : 500;
    return json(res, status, { error: error.message || "Erreur serveur" });
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon" };
function serve(req, res) {
  let url;
  try { url = new URL(req.url || "/", "http://localhost"); }
  catch (_) { return text(res, 400, "URL invalide"); }
  if (url.pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
      return res.end();
    }
    return api(req, res, url.pathname);
  }
  if (!["GET", "HEAD"].includes(req.method)) return text(res, 405, "Méthode non autorisée");
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch (_) { return text(res, 400, "URL invalide"); }
  const file = path.resolve(PUBLIC, pathname === "/" ? "index.html" : "." + pathname);
  const relative = path.relative(PUBLIC, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return text(res, 403, "Interdit");
  fs.readFile(file, (error, data) => {
    if (error) return text(res, 404, "Page introuvable");
    const ext = path.extname(file);
    // HTML must always be fresh (dev + noscript fallback); immutable assets may be cached one day.
    const cacheControl = ext === ".html" ? "no-store" : "public, max-age=86400";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" });
    if (req.method !== "HEAD") res.end(data); else res.end();
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  if (!fs.existsSync(STATE_FILE)) saveState(state());
  const server = http.createServer(serve);
  server.on("error", error => { console.error("Autopilot Studio error:", error.message); process.exitCode = 1; });
  server.listen(PORT, "127.0.0.1", () => console.log("Autopilot Studio: http://127.0.0.1:" + PORT));
}

module.exports = { serve, summary, contentPack, decision, state, saveState };
