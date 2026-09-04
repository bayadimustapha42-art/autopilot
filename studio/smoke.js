"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const server = require("./server");

function request(method, route, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: 0, method, path: route, headers: { "Content-Type": "application/json" } }, () => {});
    reject(new Error("smoke request requires a running port"));
    req.end();
  });
}

async function run() {
  const listener = http.createServer(server.serve);
  await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  const call = (method, route, payload) => new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = http.request({ hostname: "127.0.0.1", port, method, path: route, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, res => {
      let raw = ""; res.on("data", chunk => raw += chunk); res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); } catch (e) { reject(e); } });
    });
    req.on("error", reject); req.end(body);
  });
  try {
    const health = await call("GET", "/api/health");
    if (health.status !== 200 || !health.data.ok) throw new Error("health check failed");
    const ideas = await call("GET", "/api/ideas");
    if (ideas.status !== 200 || !ideas.data.ideas.length || !ideas.data.ideas[0].score) throw new Error("ideas check failed");
    const products = await call("GET", "/api/products");
    if (products.status !== 200 || !products.data.products.length) throw new Error("products check failed");
    const pack = await call("POST", "/api/content-pack", { productId: products.data.products[0].id });
    if (pack.status !== 200 || !pack.data.listing || !pack.data.pins) throw new Error("content pack check failed");
    const campaign = await call("POST", "/api/campaigns", { name: "Smoke test", visits: 100, views: 300, clicks: 12, sales: 2, revenue: 24, fees: 3 });
    if (campaign.status !== 201 || campaign.data.decision.label !== "CONTINUER") throw new Error("campaign create check failed");
    const update = await call("PUT", "/api/campaigns/" + encodeURIComponent(campaign.data.id), { sales: 0 });
    if (update.status !== 200 || update.data.decision.label !== "AMÉLIORER") throw new Error("campaign update check failed");
    const stateFile = path.join(__dirname, "data", "state.json");
    const current = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    current.campaigns = current.campaigns.filter(item => item.id !== campaign.data.id);
    fs.writeFileSync(stateFile, JSON.stringify(current, null, 2) + "\n", "utf8");
    console.log("SMOKE OK: health, ideas, products, content pack, create/update campaign");
  } finally { listener.close(); }
}

run().catch(error => { console.error("SMOKE FAILED:", error.message); process.exitCode = 1; });
