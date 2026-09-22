#!/usr/bin/env node
/**
 * WatchRugby — screenshot runner.
 * Usage: node run-screenshots.js [--port PORT]
 * The static server (serve-www.js) is started inline and shut down after.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const ROOT = '/Users/joker/rugbywatch-app';
const ASSET_DIR = path.join(ROOT, 'assets');
const WWW = path.join(ROOT, 'www');
const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1], 10) || 3978;
const LOCAL_URL = `http://127.0.0.1:${PORT}/`;

const SCREENSHOT_SPEC = [
  { name: 'ios-phone-1', label: 'Home',           viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'home',      triggerConsent: false },
  { name: 'ios-phone-2', label: 'Ireland Teams',  viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'ireland',   triggerConsent: false },
  { name: 'ios-phone-3', label: 'Provinces',      viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'provinces', triggerConsent: false },
  { name: 'ios-phone-4', label: 'Clubs & Cups',   viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'clubs',     triggerConsent: false },
  { name: 'ios-phone-5', label: 'Tournaments',     viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'tournaments',triggerConsent: false },
  { name: 'ios-phone-6', label: 'Europe',         viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'europe',     triggerConsent: false },
  { name: 'ios-phone-7', label: 'World',          viewport: { width: 390, height: 844 }, ua: 'iPhone', tab: 'world',      triggerConsent: false },
  { name: 'ios-ipad-wide-1', label: 'Tournaments', viewport: { width: 1024, height: 768 }, ua: 'iPad',   tab: 'tournaments',triggerConsent: false },
  { name: 'ios-ipad-wide-2', label: 'Planning',    viewport: { width: 1024, height: 768 }, ua: 'iPad',   tab: 'planning',   triggerConsent: false },
  { name: 'ios-ipad-wide-3', label: 'Privacy',     viewport: { width: 1024, height: 768 }, ua: 'iPad',   tab: 'privacy',    triggerConsent: false },
  { name: 'android-phone-1', label: 'Home',        viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'home',       triggerConsent: false },
  { name: 'android-phone-2', label: 'Ireland Teams',viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'ireland',    triggerConsent: false },
  { name: 'android-phone-3', label: 'Provinces',   viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'provinces',  triggerConsent: false },
  { name: 'android-phone-4', label: 'Clubs & Cups',viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'clubs',      triggerConsent: false },
  { name: 'android-phone-5', label: 'Tournaments',  viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'tournaments',triggerConsent: false },
  { name: 'android-phone-6', label: 'Europe',       viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'europe',     triggerConsent: false },
  { name: 'android-phone-7', label: 'World',        viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'world',      triggerConsent: false },
  { name: 'android-phone-8', label: 'Consent dialog',viewport: { width: 1080, height: 2340 }, ua: 'Android', tab: 'home',       triggerConsent: true  },
  { name: 'android-7inch-wide', label: 'Tournaments', viewport: { width: 1024, height: 600 }, ua: 'tablet', tab: 'tournaments',triggerConsent: false },
  { name: 'android-10inch-wide', label: 'World',     viewport: { width: 1280, height: 800 }, ua: 'tablet', tab: 'world',      triggerConsent: false },
];

const UA_MAP = {
  iPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  iPad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  tablet: 'Mozilla/5.0 (Linux; Android 13; SM-T996B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ── start server ──────────────────────────────────────────────────────────
const server = cp.spawn('node', [path.join(ROOT, 'serve-www.js'), String(PORT)], {
  cwd: ROOT,
  stdio: ['ignore', 'inherit', 'inherit'],
});
let serverReady = false;
const waitForServer = () => new Promise((resolve, reject) => {
  const start = Date.now();
  const tryConnect = () => {
    if (Date.now() - start > 15000) return reject(new Error('server did not start'));
    const net = require('net');
    const s = net.createConnection(PORT, '127.0.0.1');
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => setTimeout(tryConnect, 300));
  };
  tryConnect();
});

async function main() {
  console.log(`Starting server on port ${PORT}...`);
  await waitForServer();
  serverReady = true;
  console.log(`Server up at ${LOCAL_URL}`);

  const browser = await chromium.launch({ headless: true });
  for (const spec of SCREENSHOT_SPEC) {
    const outPath = path.join(ASSET_DIR, `${spec.name}.png`);
    const ctx = await browser.newContext({
      viewport: spec.viewport,
      userAgent: UA_MAP[spec.ua],
      isMobile: spec.ua === 'iPhone' || spec.ua === 'Android',
      hasTouch: spec.ua === 'iPhone' || spec.ua === 'Android',
    });
    const page = await ctx.newPage();
    const url = LOCAL_URL + (spec.tab === 'home' ? '' : `#${spec.tab}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    if (spec.triggerConsent) {
      // The consent dialog should already be visible on a fresh page
      // (consent is null on first load). Wait a beat and capture.
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: outPath, fullPage: false });
    await ctx.close();
    console.log(`  ✓ ${spec.name}.png  (${spec.label})`);
  }
  await browser.close();
  console.log('SCREENSHOTS DONE');
}

main().then(() => {
  if (serverReady) server.kill('SIGTERM');
  process.exit(0);
}).catch(err => {
  console.error('FAILED:', err.message);
  if (serverReady) server.kill('SIGTERM');
  process.exit(1);
});
