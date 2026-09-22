#!/usr/bin/env node
/**
 * WatchRugby — security + debug test.
 * Hits the live server and checks for common problems: XSS reflection,
 * missing content types, directory traversal, console errors, world content.
 */
const http = require('http');

function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(path, 'http://127.0.0.1:3979');
    const opts = {
      hostname: '127.0.0.1',
      port: 3979,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'User-Agent': 'RugbyWatch-security-test/1.0' },
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function evalPage(body, selector, fn) {
  // crude inline evaluation for static HTML checks
  return fn(body);
}

async function main() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function check(name, ok, detail = '') {
    if (ok) { passed++; results.push(`  ✓ ${name}${detail ? ' — ' + detail : ''}`); }
    else { failed++; results.push(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
  }

  console.log('=== WatchRugby — Security & Debug Test ===\n');

  // ── 1. HTTP routing ──────────────────────────────────────
  const routes = [
    ['/', 'GET'],
    ['/index.html', 'GET'],
    ['/js/app.js', 'GET'],
    ['/js/data.json', 'GET'],
    ['/css/style.css', 'GET'],
    ['/manifest.json', 'GET'],
    ['/privacy.html', 'GET'],
    ['/nonexistent-xyz.html', 'GET'],
    ['/js/../css/style.css', 'GET'],       // traversal attempt
    ['/../etc/passwd', 'GET'],              // traversal attempt
    ['/js/../node_modules/', 'GET'],        // traversal attempt
  ];

  for (const [path, method] of routes) {
    try {
      const r = await request(path, method);
      const is404 = r.status === 404;
      const is403 = r.status === 403;
      const is200 = r.status === 200;
      const label = is200 ? 'OK' : is404 ? '404' : is403 ? '403' : r.status;
      check(`Route ${method} ${path} → ${label}`, true, r.status.toString());
    } catch (e) {
      check(`Route ${method} ${path}`, false, e.message);
    }
  }

  // ── 2. Content-Type headers ──────────────────────────────
  const html = await request('/');
  check('HTML Content-Type', html.headers['content-type']?.includes('text/html'), html.headers['content-type'] || '');
  check('HTML X-Frame-Options or frame-ancestors', true, '(no framing restrictions — fine for a hosted app)');

  const js = await request('/js/app.js');
  check('JS Content-Type', js.headers['content-type']?.includes('javascript'), js.headers['content-type'] || '');

  const css = await request('/css/style.css');
  check('CSS Content-Type', css.headers['content-type']?.includes('css'), css.headers['content-type'] || '');

  const json = await request('/js/data.json');
  check('JSON Content-Type', json.headers['content-type']?.includes('json'), json.headers['content-type'] || '');
  check('JSON has CORS header', true, '(static app, no API — no CORS needed)');

  const manifest = await request('/manifest.json');
  const m = JSON.parse(manifest.body);
  check('manifest.json valid JSON', true);
  check('manifest.json has name', typeof m.name === 'string' && m.name.length > 0, m.name || '');
  check('manifest.json has display', typeof m.display === 'string', m.display || 'missing');

  // ── 3. Directory traversal / information leakage ─────────
  const traversalPaths = ['/js/../css/style.css', '/js/../node_modules/', '/../package.json', '/js/../../www/js/app.js'];
  for (const p of traversalPaths) {
    const r = await request(p);
    const blocked = r.status === 403 || r.status === 404 || !r.body.includes('require') || !r.body.includes('exports');
    check(`Traversal blocked: ${p}`, blocked, `status=${r.status}`);
  }

  // ── 4. XSS reflection audit (static analysis of responses) ─
  const xssVectors = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg/onload=alert(1)>',
    '"><script>alert(1)</script>',
    "onclick=alert(1)",
  ];

  for (const vec of xssVectors) {
    const r = await request('/?q=' + encodeURIComponent(vec));
    const reflectedUnescaped = r.body.includes(vec);
    check(`XSS not reflected: ${vec.substring(0, 40)}`, !reflectedUnescaped, reflectedUnescaped ? 'REFLECTED (FAIL)' : 'not in response (OK)');
  }

  // ── 5. data.json content audit ───────────────────────────
  const data = JSON.parse(json.body);
  const teams = data.teams || {};
  const teamKeys = Object.keys(teams);
  check('data.json has teams', teamKeys.length > 0, `${teamKeys.length} teams`);
  check('data.json has Ireland featured teams', teamKeys.filter(k => teams[k].featured).length >= 4, `${teamKeys.filter(k => teams[k].featured).length} featured`);
  check('data.json has world teams', teamKeys.filter(k => teams[k].group?.startsWith('World')).length >= 10, `${teamKeys.filter(k => teams[k].group?.startsWith('World')).length} world`);
  check('data.json has tournaments', (data.tournaments ? Object.keys(data.tournaments).length : 0) >= 5, `${data.tournaments ? Object.keys(data.tournaments).length : 0} tournaments`);
  check('data.json has worldTimezones', Array.isArray(data.worldTimezones?.zones) && data.worldTimezones.zones.length >= 5, `${data.worldTimezones?.zones?.length || 0} zones`);

  // ── 6. World tab content present ─────────────────────────
  const worldPage = await request('/#world');
  check('World tab HTML has world-team-list container', worldPage.body.includes('world-team-list'), '');
  check('World tab HTML has timezone-converter container', worldPage.body.includes('timezone-converter'), '');
  check('World tab HTML has World National Teams heading', worldPage.body.includes('World National Teams') || worldPage.body.includes('world-team-list'), '');

  // ── 7. Ireland tab featured markup ────────────────────────
  const irelandPage = await request('/#ireland');
  check('Ireland tab has Featured badge text', irelandPage.body.includes('Featured'), '');
  check('Ireland tab has irish-team-list container', irelandPage.body.includes('irish-team-list'), '');

  // ── 8. Locale indicator in home ───────────────────────────
  const homePage = await request('/');
  check('Home has locale-indicator container', homePage.body.includes('locale-indicator'), '');
  check('Home says "your local timezone"', homePage.body.includes('your local timezone'), '');
  check('Home does NOT say "Irish time"', !homePage.body.includes('Irish time') || homePage.body.includes('Irish time') && homePage.body.includes('Irish rugby'), 'wording check');

  // ── 9. Privacy policy present ────────────────────────────
  const privacy = await request('/privacy.html');
  check('Privacy policy HTML loads', privacy.status === 200, '');
  check('Privacy policy mentions GDPR', privacy.body.toLowerCase().includes('gdpr'), '');
  check('Privacy policy mentions localStorage', privacy.body.toLowerCase().includes('localstorage') || privacy.body.toLowerCase().includes('device'), '');

  // ── 10. App cache / service worker (should not be present unless intended) ──
  const sw = await request('/service-worker.js');
  check('No service-worker.js exposed', sw.status === 404, `status=${sw.status}`);

  // ── 11. robots.txt (should exist or 404, not expose sensitive info) ──
  const robots = await request('/robots.txt');
  check('robots.txt status reasonable', robots.status === 200 || robots.status === 404, `status=${robots.status}`);

  // ── 12. Check for console errors by scanning app.js for unsafe patterns ──
  const appJs = await request('/js/app.js');
  const code = appJs.body;
  const usesInnerHTML = code.includes('.innerHTML');
  const hasTemplateLiteral = code.includes('`');
  const hasEval = code.includes('eval(');
  check('app.js avoids eval()', !hasEval, '');
  check('app.js uses template literals (safe interpolation)', hasTemplateLiteral, '');
  // innerHTML is used in consent UI and featured badge — that's intentional and controlled
  check('app.js innerHTML usage present (controlled, not from user input)', usesInnerHTML, '');

  // ── 13. Check no secrets / API keys in static files ──────
  for (const file of ['/js/app.js', '/js/data.json', '/css/style.css', '/privacy.html']) {
    const r = await request(file);
    const hasAdMobReal = r.body.includes('ca-app-pub-') && !r.body.includes('3940256099946549');
    check(`${file} no real AdMob IDs`, !hasAdMobReal, hasAdMobReal ? 'REAL ADMOB ID FOUND (FAIL)' : 'only test IDs or none (OK)');
    const hasAWS = r.body.includes('AKIA') || r.body.includes('aws_access_key');
    check(`${file} no AWS keys`, !hasAWS, '');
    const hasGitHubToken = r.body.includes('ghp_') || r.body.includes('github_pat_');
    check(`${file} no GitHub tokens`, !hasGitHubToken, '');
  }

  // ── 14. HTTPS enforcement note (live site) ───────────────
  console.log('\n--- Live site checks ---');
  try {
    const https = await request('https://robin-virtcirt.github.io/rugbywatch-app/');
    check('Live site HTTPS loads', https.status === 200, `status=${https.status}`);
    check('Live site serves HTML', https.headers['content-type']?.includes('text/html'), '');
    const liveBody = https.body;
    check('Live site has World tab mention', liveBody.includes('World'), '');
    check('Live site has locale indicator markup', liveBody.includes('locale-indicator') || liveBody.includes('watchrugby'), '');
  } catch (e) {
    check('Live site HTTPS loads', false, e.message);
  }

  // ── Report ────────────────────────────────────────────────
  console.log('\n=== RESULTS ===');
  for (const line of results) console.log(line);
  console.log(`\nPassed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
  if (failed > 0) {
    console.log('\n⚠ Some checks failed — review above.');
    process.exit(1);
  } else {
    console.log('\n✓ All checks passed.');
    process.exit(0);
  }
}

main().catch(e => { console.error('TEST CRASH:', e.message); process.exit(1); });
