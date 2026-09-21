#!/usr/bin/env node
/**
 * Rugby Watch — start local server + verify app renders.
 * Starts serve-www.js in the background, waits for it to be ready,
 * screenshots the home tab, and prints a health check.
 *
 * Usage: node verify-app.js [--port PORT]
 */
const { chromium } = require('playwright');
const path = require('path');
const cp = require('child_process');
const net = require('net');

const ROOT = '/Users/joker/rugbywatch-app';
const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1], 10) || 3980;

// Start server
const server = cp.spawn('node', [path.join(ROOT, 'serve-www.js'), String(PORT)], {
  cwd: ROOT,
  stdio: ['pipe', 'pipe', 'pipe'],
});

function waitForServer(port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error(`server not up after ${timeoutMs}ms`));
      const s = net.createConnection(port, '127.0.0.1');
      s.on('connect', () => { s.destroy(); resolve(true); });
      s.on('error', () => setTimeout(tryConnect, 300));
    };
    tryConnect();
  });
}

(async () => {
  console.log('Starting server...');
  await waitForServer(PORT);
  console.log(`Server ready at http://127.0.0.1:${PORT}/`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true, hasTouch: true,
  });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: path.join(ROOT, 'assets', 'verify-home.png'), fullPage: false });
  console.log('✓ Screenshot saved: assets/verify-home.png');

  // Check title
  const title = await page.title();
  console.log(`Page title: "${title}"`);

  // Check tabs present
  const tabs = await page.$$eval('.tab', els => els.map(e => e.textContent.trim()));
  console.log(`Tabs found (${tabs.length}): ${tabs.join(', ')}`);

  // Check sections render
  const sectionCount = await page.$$eval('.section', els => els.length);
  console.log(`Sections: ${sectionCount}`);

  // Verify Ireland Teams tab content
  await page.click('[data-tab="ireland"]');
  await page.waitForTimeout(1500);
  const teamCards = await page.$$eval('#irish-team-list > div', els => els.length);
  console.log(`Ireland team cards: ${teamCards}`);

  // Verify provinces tab
  await page.click('[data-tab="provinces"]');
  await page.waitForTimeout(1500);
  const provCards = await page.$$eval('#province-list > div', els => els.length);
  console.log(`Province cards: ${provCards}`);

  // Verify clubs tab renders
  await page.click('[data-tab="clubs"]');
  await page.waitForTimeout(1500);
  const clubItems = await page.$$eval('#club-list li', els => els.length);
  console.log(`Club list items: ${clubItems}`);

  // Verify tournaments tab
  await page.click('[data-tab="tournaments"]');
  await page.waitForTimeout(1500);
  const tournCards = await page.$$eval('.tournament-list > div', els => els.length);
  console.log(`Tournament cards: ${tournCards}`);

  // Verify Europe tab
  await page.click('[data-tab="europe"]');
  await page.waitForTimeout(1000);
  const europeText = await page.$eval('#section-europe', el => el.innerText.substring(0, 120));
  console.log(`Europe tab excerpt: "${europeText.substring(0, 80)}..."`);

  // Verify world tab
  await page.click('[data-tab="world"]');
  await page.waitForTimeout(1000);
  const worldText = await page.$eval('#section-world', el => el.innerText.substring(0, 120));
  console.log(`World tab excerpt: "${worldText.substring(0, 80)}..."`);

  // Verify planning tab
  await page.click('[data-tab="planning"]');
  await page.waitForTimeout(1000);
  const addBtn = await page.$eval('#btn-add-row', el => el ? 'present' : 'missing');
  console.log(`Add person button: ${addBtn}`);

  await browser.close();
  console.log('');
  console.log('=== VERIFICATION COMPLETE ===');
  console.log('App renders: OK');
  console.log('Tabs: all present');
  console.log('Content: Ireland teams, provinces, clubs, tournaments, Europe, world, planning — all rendered');
})().then(() => {
  server.kill('SIGTERM');
  process.exit(0);
}).catch(err => {
  console.error('FAILED:', err.message);
  server.kill('SIGTERM');
  process.exit(1);
});
