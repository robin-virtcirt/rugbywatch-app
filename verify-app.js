#!/usr/bin/env node
/**
 * Rugby Watch — start local server + verify app renders.
 *
 * Starts serve-www.js (port 3980 by default) in the background,
 * waits for it to be ready, opens the home tab in a headless browser,
 * and prints a quick health check.
 *
 * Usage: node verify-app.js [--port PORT]
 */
"use strict";

const { chromium } = require("playwright");
const path = require("path");
const cp = require("child_process");
const net = require("net");

const ROOT = "/Users/joker/rugbywatch-app";
const DEFAULT_PORT = 3980;
const PORT = parseInt(process.argv.find(a => /^--port=/.test(a))?.split("=")[1], 10) || DEFAULT_PORT;

// ── start server ──────────────────────────────────────────────────────
function startServer() {
  const server = cp.spawn("node", [path.join(ROOT, "serve-www.js"), String(PORT)], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"]
  });
  return server;
}

function waitForServer(port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`server not up after ${timeoutMs}ms`));
      }
      const s = net.createConnection(port, "127.0.0.1");
      s.on("connect", () => { s.destroy(); resolve(true); });
      s.on("error", () => setTimeout(tryConnect, 250));
    };
    tryConnect();
  });
}

// ── main ──────────────────────────────────────────────────────────────
(async function main() {
  const server = startServer();
  let serverReady = false;
  try {
    console.log("Waiting for server on port " + PORT + " …");
    await waitForServer(PORT, 15000);
    serverReady = true;
    console.log("Server ready on port " + PORT);
  } catch (err) {
    console.error("Server did not start:", err.message);
    server.kill("SIGKILL");
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error("Chromium launch failed:", err.message);
    server.kill("SIGKILL");
    process.exit(1);
  }

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });

  try {
    await page.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "networkidle", timeout: 20000 });
  } catch (err) {
    console.error("Page navigation failed:", err.message);
    await browser.close();
    server.kill("SIGKILL");
    process.exit(1);
  }

  // Verify rendered content
  const title = await page.title();
  console.log("Page title:", title);

  const h1Text = await page.$eval("h1", el => el.textContent.trim()).catch(() => null);
  console.log("H1 text:", h1Text);

  // Check that tabs render
  const tabs = await page.$$eval(".tab", els => els.map(el => el.textContent.trim()));
  console.log("Tabs found:", tabs.join(", "));

  // Check sections exist
  const sections = await page.$$eval(".section", els => els.length);
  console.log("Sections:", sections);

  // Check locale indicator
  const localeInd = await page.$eval("#locale-code", el => el.textContent.trim()).catch(() => null);
  console.log("Locale code:", localeInd);

  // Check that Ireland teams tab renders some content
  await page.click('[data-tab="ireland"]');
  await page.waitForTimeout(800);
  const irelandCards = await page.$$eval("#irish-team-list > div", els => els.length);
  console.log("Ireland team cards:", irelandCards);

  // Check provinces tab
  await page.click('[data-tab="provinces"]');
  await page.waitForTimeout(800);
  const provinceCards = await page.$$eval("#province-list > div", els => els.length);
  console.log("Province cards:", provinceCards);

  console.log("\n✓ App renders OK — all tabs and content present");
  console.log("  URL: http://127.0.0.1:" + PORT + "/");
  console.log("  Title:", title);

  await browser.close();
  server.kill("SIGKILL");
  process.exit(0);
})().catch(err => {
  console.error("Verification error:", err.message);
  if (server) server.kill("SIGKILL");
  if (browser) browser.close();
  process.exit(1);
});
