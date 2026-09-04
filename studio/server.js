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
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3030;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (_) { return fallback; }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const temp = STATE_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(state, null, 2) + "\n", "utf8");
  fs.renameSync(temp, STATE_FILE);
}

function state() {
  const fallback = { settings: { shopName: "Autopilot Budget Studio", shopUrl: "https://www.etsy.com/", currency: "$" }, campaigns: [] };
  const current = readJson(STATE_FILE, fallback);
  current.settings = Object.assign(fallback.settings, current.settings || {});
  current.campaigns = Array.isArray(current.campaigns) ? current.campaigns : [];
  return current;
}

function botJson(name, fallback) { return readJson(path.join(BOT, "data", name), fallback); }
function products() { return botJson("products.json", { products: [] }).products || []; }
function ideas() { return botJson("ideas.json", { ideas: [] }).ideas || []; }
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
    req.on("data", chunk => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error("JSON invalide")); } });
    req.on("error", reject);
  });
}

function number(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; }
function clean(value, max) { return String(value == null ? "" : value).trim().slice(0, max || 300); }
function withScore(items) { return items.map(item => scoring().scoreIdea(Object.assign({}, item))); }

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
  return { metrics: metrics(s.campaigns), campaigns: all.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 8), topIdea: ranked[0] || null, settings: s.settings, productCount: products().length, ideaCount: ranked.length };
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
      const item = Object.assign({ id: "custom", name: "Nouvelle idée", demande: 5, concurrence: 5, marge: 5, viral: 5, facilite: 5, risque: 5, automatisation: 5 }, input);
      return json(res, 200, { idea: scoring().scoreIdea(item) });
    }

    if (req.method === "POST" && pathname === "/api/content-pack") {
      const input = await body(req);
      const p = products().find(item => item.id === clean(input.productId, 80)) || products()[0];
      return json(res, 200, contentPack(p));
    }

    if (req.method === "POST" && pathname === "/api/campaigns") {
      const input = await body(req);
      if (!clean(input.name, 120)) return json(res, 400, { error: "Le nom du produit est obligatoire." });
      const now = new Date().toISOString();
      const campaign = {
        id: crypto.randomUUID(), name: clean(input.name, 120), productId: clean(input.productId, 80), status: ["draft", "ready", "published", "archived"].includes(input.status) ? input.status : "draft",
        visits: number(input.visits), views: number(input.views), clicks: number(input.clicks), sales: number(input.sales), revenue: number(input.revenue), fees: number(input.fees), createdAt: now, updatedAt: now
      };
      const s = state(); s.campaigns.push(campaign); saveState(s);
      return json(res, 201, Object.assign({}, campaign, { decision: decision(campaign) }));
    }

    const match = pathname.match(/^\/api\/campaigns\/([^/]+)$/);
    if (match && req.method === "PUT") {
      const input = await body(req), s = state(), item = s.campaigns.find(c => c.id === decodeURIComponent(match[1]));
      if (!item) return json(res, 404, { error: "Campagne introuvable." });
      ["name", "productId", "status"].forEach(key => { if (input[key] !== undefined) item[key] = key === "status" ? (["draft", "ready", "published", "archived"].includes(input[key]) ? input[key] : item[key]) : clean(input[key], 120); });
      ["visits", "views", "clicks", "sales", "revenue", "fees"].forEach(key => { if (input[key] !== undefined) item[key] = number(input[key]); });
      item.updatedAt = new Date().toISOString(); saveState(s);
      return json(res, 200, Object.assign({}, item, { decision: decision(item) }));
    }

    if (req.method === "PUT" && pathname === "/api/settings") {
      const input = await body(req), s = state();
      s.settings.shopName = clean(input.shopName || s.settings.shopName, 100);
      s.settings.shopUrl = clean(input.shopUrl || s.settings.shopUrl, 500);
      s.settings.currency = clean(input.currency || s.settings.currency, 5);
      saveState(s); return json(res, 200, s.settings);
    }
    return json(res, 404, { error: "Route introuvable." });
  } catch (error) { return json(res, 400, { error: error.message || "Erreur serveur" }); }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
function serve(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return api(req, res, url.pathname);
  let file = path.join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(PUBLIC)) return text(res, 403, "Interdit");
  fs.readFile(file, (error, data) => error ? text(res, 404, "Page introuvable") : text(res, 200, data, MIME[path.extname(file)] || "application/octet-stream"));
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  if (!fs.existsSync(STATE_FILE)) saveState(state());
  http.createServer(serve).listen(PORT, "127.0.0.1", () => console.log("Autopilot Studio: http://127.0.0.1:" + PORT));
}

module.exports = { serve, summary, contentPack, decision };
