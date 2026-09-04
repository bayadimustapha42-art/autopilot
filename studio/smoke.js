"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const server = require("./server");

async function run() {
  const listener = http.createServer(server.serve);
  await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  const call = (method, route, payload) => new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = http.request({ hostname: "127.0.0.1", port, method, path: route, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, res => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        let data = raw;
        try { data = JSON.parse(raw); } catch (_) { /* Static errors may be plain text. */ }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on("error", reject); req.end(body);
  });
  let testId;
  try {
    const page = await call("GET", "/");
    if (page.status !== 200 || typeof page.data !== "string" || !page.data.includes("Autopilot Studio")) throw new Error("static page check failed");
    if (!page.data.includes('name="description"') || !page.data.includes("application/ld+json") || !page.data.includes("<noscript>")) throw new Error("SEO meta/JSON-LD/noscript check failed");
    const robots = await call("GET", "/robots.txt");
    if (robots.status !== 200 || !String(robots.data).includes("Sitemap:")) throw new Error("robots.txt check failed");
    const sitemap = await call("GET", "/sitemap.xml");
    if (sitemap.status !== 200 || !String(sitemap.data).includes("<urlset")) throw new Error("sitemap.xml check failed");
    const icon = await call("GET", "/icon.svg");
    if (icon.status !== 200 || !String(icon.data).includes("<svg")) throw new Error("icon.svg check failed");
    const method = await call("DELETE", "/api/health");
    if (method.status !== 404) throw new Error("method handling check failed");
    const options = await call("OPTIONS", "/api/health");
    if (options.status !== 204) throw new Error("CORS preflight check failed");
    const head = await call("HEAD", "/");
    if (head.status !== 200 || head.data !== "") throw new Error("HEAD check failed");
    const health = await call("GET", "/api/health");
    if (health.status !== 200 || !health.data.ok) throw new Error("health check failed");
    const ideas = await call("GET", "/api/ideas");
    if (ideas.status !== 200 || !ideas.data.ideas.length || !ideas.data.ideas[0].score) throw new Error("ideas check failed");
    const products = await call("GET", "/api/products");
    if (products.status !== 200 || !products.data.products.length) throw new Error("products check failed");
    const pack = await call("POST", "/api/content-pack", { productId: products.data.products[0].id });
    if (pack.status !== 200 || !pack.data.listing || !pack.data.pins || !pack.data.tiktok || !pack.data.post) throw new Error("content pack check failed");
    const missingPack = await call("POST", "/api/content-pack", { productId: "missing-product" });
    if (missingPack.status !== 404) throw new Error("missing product validation failed");
    const invalidScore = await call("POST", "/api/score", { name: "Input test", demande: 99, concurrence: -5, risque: "bad" });
    if (invalidScore.status !== 200 || invalidScore.data.idea.demande !== 10 || invalidScore.data.idea.concurrence !== 0 || invalidScore.data.idea.risque !== 5 || invalidScore.data.idea.score < 0 || invalidScore.data.idea.score > 100) throw new Error("score normalization failed");
    const campaign = await call("POST", "/api/campaigns", { name: "Smoke test", visits: 100, views: 300, clicks: 12, sales: 2, revenue: 24, fees: 3 });
    if (campaign.status !== 201 || campaign.data.decision.label !== "CONTINUER") throw new Error("campaign create check failed");
    testId = campaign.data.id;
    const update = await call("PUT", "/api/campaigns/" + encodeURIComponent(campaign.data.id), { sales: 0 });
    if (update.status !== 200 || update.data.decision.label !== "AMÉLIORER") throw new Error("campaign update check failed");
    const invalidSettings = await call("PUT", "/api/settings", { shopUrl: "javascript:alert(1)" });
    if (invalidSettings.status !== 400) throw new Error("settings validation failed");
    const oversized = await call("POST", "/api/score", { data: "x".repeat(1024 * 1024) });
    if (oversized.status !== 400) throw new Error("payload limit check failed");
    const invalidJson = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: "127.0.0.1", port, method: "POST", path: "/api/score", headers: { "Content-Type": "application/json" } }, res => { let raw = ""; res.on("data", chunk => raw += chunk); res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(raw) })); });
      req.on("error", reject); req.end("not-json");
    });
    if (invalidJson.status !== 400) throw new Error("invalid JSON validation failed");
    const traversal = await call("GET", "/%2e%2e/server.js");
    if (traversal.status !== 403 && traversal.status !== 404) throw new Error("path traversal validation failed");
    const stateFile = path.join(__dirname, "data", "state.json");
    console.log("SMOKE OK: API, validation, limits, traversal guard, content pack, create/update campaign");
  } finally {
    if (testId) {
      const stateFile = path.join(__dirname, "data", "state.json");
      try {
        const current = JSON.parse(fs.readFileSync(stateFile, "utf8"));
        current.campaigns = Array.isArray(current.campaigns) ? current.campaigns.filter(item => item.id !== testId) : [];
        fs.writeFileSync(stateFile, JSON.stringify(current, null, 2) + "\n", "utf8");
      } catch (_) { /* Preserve the original test error. */ }
    }
    listener.close();
  }
}

run().catch(error => { console.error("SMOKE FAILED:", error.message); process.exitCode = 1; });
