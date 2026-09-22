#!/usr/bin/env node
/**
 * WatchRugby — screenshot + icon generation script.
 *
 * Generates:
 * - assets/preview.png          (live site preview, 390×844 iPhone)
 * - assets/appstore/ios-phone-1..6.png   (iPhone 15, 390×844, different scroll positions)
 * - assets/appstore/ios-ipad-wide-1..3.png (iPad, 1024×768, different tabs)
 * - assets/playstore/android-phone-1..6.png (Android phone 1080×2340, different scrolls)
 * - assets/playstore/android-7inch-wide.png (7-inch tablet 1024×600)
 * - assets/playstore/android-10inch-wide.png (10-inch tablet 1280×800)
 *
 * Each screenshot captures the viewport; for long pages we scroll and stitch
 * or just capture the top — for store screenshots a clean top capture is fine
 * as long as the tab content is visible. We'll capture the top of each tab.
 *
 * NOTE: screenshots are of the LIVE site https://robin-virtcirt.github.io/
 * which is the pre-expansion version. We want to screenshot the EXPANDED app.
 * The expanded app lives in www/ — but Capacitor's native shell wraps it. For
 * store screenshots we screenshot the live web version at the live URL.
 *
 * However, the live URL currently serves the OLD app (ireland-rugby.html), not
 * the new expanded one. To make the screenshots accurate, we should either:
 *   (a) update the live site to serve the expanded app first, then screenshot, OR
 *   (b) screenshot the expanded app locally by serving www/ via a local server.
 *
 * We'll do (b): spin up a quick local static server pointing at www/, screenshot
 * that, and the screenshots will match the app's actual UI.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = '/Users/joker/rugbywatch-app';
const ASSET_DIR = path.join(ROOT, 'assets');
const WWW = path.join(ROOT, 'www');
const LIVE_URL = 'https://robin-virtcirt.github.io/';

// Local server: serve www on a port. We'll start one with npx static-server
// or a tiny node http server. To keep it simple, we'll use a one-liner:
//   npx serve www -p 3977 --single
// but that needs serve installed. We'll write a tiny node static server inline.

const PORT = 3977;
const LOCAL_URL = `http://localhost:${PORT}/`;

const SCREENSHOT_SPEC = [
  // iPhone 15
  { name: 'ios-phone-1', label: 'Home',        viewport: { width: 390, height: 844 }, device: 'iPhone 15', tab: 'home',       fullPage: false },
  { name: 'ios-phone-2', label: 'Ireland Teams',viewport: { width: 390, height: 844 }, device: 'iPhone 15', tab: 'ireland',    fullPage: false },
  { name: 'ios-phone-3', label: 'Provinces',   viewport: { width: 390, height: 844 }, device: 'iPhone 15', tab: 'provinces',  fullPage: false },
  { name: 'ios-phone-4', label: 'Clubs & Cups',viewport: { width: 390, height: 844 }, device: 'iPhone 15', tab: 'clubs',      fullPage: false },
  { name: 'ios-phone-5', label: 'Tournaments',  viewport: { width: 390, height: 844 }, device: 'iPhone 15', tab: 'tournaments',fullPage: false },
  { name: 'ios-phone-6', label: 'Europe',       viewport: { width: 390, height: 844 }, device: 'iPhone 15', tab: 'europe',      fullPage: false },
  // iPad wide
  { name: 'ios-ipad-wide-1', label: 'Tournaments', viewport: { width: 1024, height: 768 }, device: 'iPad', tab: 'tournaments', fullPage: false },
  { name: 'ios-ipad-wide-2', label: 'Planning',    viewport: { width: 1024, height: 768 }, device: 'iPad', tab: 'planning',    fullPage: false },
  { name: 'ios-ipad-wide-3', label: 'Privacy',     viewport: { width: 1024, height: 768 }, device: 'iPad', tab: 'privacy',     fullPage: false },
  // Android phone (taller — captures top of each tab)
  { name: 'android-phone-1', label: 'Home',        viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'home',       fullPage: false },
  { name: 'android-phone-2', label: 'Ireland Teams',viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'ireland',    fullPage: false },
  { name: 'android-phone-3', label: 'Provinces',   viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'provinces',  fullPage: false },
  { name: 'android-phone-4', label: 'Clubs & Cups',viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'clubs',      fullPage: false },
  { name: 'android-phone-5', label: 'Tournaments',  viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'tournaments',fullPage: false },
  { name: 'android-phone-6', label: 'Europe',       viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'europe',     fullPage: false },
  { name: 'android-phone-7', label: 'Consent',      viewport: { width: 1080, height: 2340 }, device: 'Android phone', tab: 'home',       fullPage: false, triggerConsent: true },
  // 7-inch tablet
  { name: 'android-7inch-wide', label: 'Tournaments', viewport: { width: 1024, height: 600 }, device: '7-inch tablet', tab: 'tournaments', fullPage: false },
  // 10-inch tablet
  { name: 'android-10inch-wide', label: 'Tournaments', viewport: { width: 1280, height: 800 }, device: '10-inch tablet', tab: 'tournaments', fullPage: false },
];

// ── tiny static file server ──────────────────────────────────────────────
const http = require('http');
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  let filePath = path.join(WWW, req.url === '/' ? 'index.html' : req.url);
  // Security: keep inside www
  if (!filePath.startsWith(WWW)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
});
server.listen(PORT, '127.0.0.1', () => {});

// ── wait for server ──────────────────────────────────────────────────────
function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('server not up'));
      require('http').get(url, res => { resolve(res); }).on('error', () => setTimeout(tryConnect, 200));
    };
    tryConnect();
  });
}

// ── main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('Waiting for local server...');
  await waitForServer(LOCAL_URL, 10000);
  console.log('Local server up at', LOCAL_URL);

  const browser = await chromium.launch({ headless: true });

  for (const spec of SCREENSHOT_SPEC) {
    const outPath = path.join(ASSET_DIR, `${spec.name}.png`);
    const ctx = await browser.newContext({
      viewport: spec.viewport,
      userAgent: spec.device === 'iPhone 15'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : spec.device === 'Android phone'
          ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
          : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      isMobile: spec.device === 'iPhone 15' || spec.device === 'Android phone',
      hasTouch: spec.device === 'iPhone 15' || spec.device === 'Android phone',
    });
    const page = await ctx.newPage();
    const url = LOCAL_URL + (spec.tab === 'home' ? '' : `#${spec.tab}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // For the consent screenshot, trigger the consent dialog on the home tab
    if (spec.triggerConsent) {
      // The consent UI appears when consent is null. We'll click nothing and
      // wait for the dialog to render. The app.js shows the dialog on init if
      // consent is null. Since we're on a fresh page, consent is null, so the
      // dialog should already be showing. Just capture.
      await page.waitForTimeout(1000);
    }

    // Full-page screenshots can be huge; we capture the viewport only.
    await page.screenshot({ path: outPath, fullPage: false });
    await ctx.close();
    console.log(`  ✓ ${spec.name}.png  (${spec.label})`);
  }

  await browser.close();

  // Also capture the preview (iPhone, home tab, full page if short)
  const previewCtx = await chromium.launch({ headless: true }).then(b => b.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  }));
  const previewPage = await previewCtx.newPage();
  await previewPage.goto(LOCAL_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await previewPage.waitForTimeout(2500);
  await previewPage.screenshot({ path: path.join(ASSET_DIR, 'preview.png'), fullPage: false });
  await previewCtx.close();
  await browser.close();

  console.log('SCREENSHOTS DONE');
  process.exit(0);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
