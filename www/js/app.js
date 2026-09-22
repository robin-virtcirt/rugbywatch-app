/**
 * WatchRugby — www/js/app.js
 *
 * Cross-platform WatchRugby app (iOS + Android). Ireland featured alongside
 * worldwide content. Locale-aware timezone conversion with pub watchability
 * relative to user's clock. Language selector drives all UI strings via the
 * locales block in data.json. Includes Flappy Rugby mini-game.
 *
 * Source of truth: www/js/data.json (single source of truth for all
 * teams, tournaments, provinces, clubs, and locale strings).
 *
 * This file reads data.json on load and re-renders on locale change.
 */

"use strict";
(function () {
  'use strict';

  // ── Globals ────────────────────────────────────────────────────────
  var APP_NAME = 'WatchRugby';
  var DATA_PATH = '/www/js/data.json';
  var data = null;
  var currentLocale = 'en';
  var isBeingDestroyed = false;

  // ── DOM refs ───────────────────────────────────────────────────────
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var localeSelector = $('#locale-selector');
  var localeIndicator = $('#locale-indicator');
  var tabButtons = $$('.tab');
  var sections = $$('.section');
  var searchInput = $('#search-input');
  var searchClear = $('#search-clear');
  var flappyStartBtn = $('#flappy-showing');  // kick off from badge click

  // ── Init ───────────────────────────────────────────────────────────
  loadData(function () {
    bindLocaleSelector();
    restoreLocale();
    bindTabs();
    renderAllTabs();
    bindSearch();
    bindFlappyShowBadge();
    showLocaleIndicator(currentLocale);
  });

  // ── Data load ──────────────────────────────────────────────────────
  function loadData(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', DATA_PATH, true);
    xhr.responseType = 'json';
    xhr.onerror = function () {
      console.error('Failed to load data.json');
      cb(null);
    };
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          data = xhr.response;
          if (!data || typeof data !== 'object') throw new Error('bad data');
          cb(data);
        } catch (e) {
          console.error(e);
          cb(null);
        }
      } else {
        cb(null);
      }
    };
    xhr.send();
  }

  // ── Locale ─────────────────────────────────────────────────────────
  function bindLocaleSelector() {
    if (!localeSelector) return;
    localeSelector.addEventListener('change', onChange);
    // Also support the data-locale attributes on the select element
    Array.prototype.forEach.call(localeSelector.options, function (opt) {
      opt.addEventListener('click', onChange);
    });
  }

  function onChange() {
    var checked = localeSelector.querySelector('option:checked');
    if (!checked) return;
    var locale = checked.value || checked.getAttribute('data-locale') || checked.textContent.trim().toLowerCase();
    if (locale && data && data.locales && data.locales[locale]) {
      currentLocale = locale;
      renderAllTabs();
      showLocaleIndicator(locale);
    } else {
      // fallback: try the text content
      var txt = (checked.textContent || '').trim().toLowerCase();
      if (txt && data && data.locales) {
        var found = Object.keys(data.locales).find(function (k) {
          return data.locales[k].label && data.locales[k].label.toLowerCase() === txt;
        });
        if (found) {
          currentLocale = found;
          renderAllTabs();
          showLocaleIndicator(found);
        }
      }
    }
  }

  function restoreLocale() {
    var saved = localStorage.getItem('watchrugby-locale');
    if (saved && data && data.locales && data.locales[saved]) {
      currentLocale = saved;
    }
    if (localeSelector) {
      for (var i = 0; i < localeSelector.options.length; i++) {
        var opt = localeSelector.options[i];
        if (opt.value === currentLocale || opt.getAttribute('data-locale') === currentLocale) {
          opt.selected = true;
          break;
        }
      }
    }
    showLocaleIndicator(currentLocale);
  }

  function showLocaleIndicator(loc) {
    if (!localeIndicator) return;
    var l = data && data.locales && data.locales[loc] ? data.locales[loc] : null;
    if (!l) {
      localeIndicator.textContent = 'Language: ' + (loc || 'en');
      return;
    }
    var tz = getText(l, 'tzLabel') || '';
    var rt = getText(l, 'rt') || '';
    var label = getText(l, 'label') || loc.toUpperCase();
    localeIndicator.innerHTML =
      '<span class="locale-badge"><span class="locale-lang">' + label + '</span>' +
      (tz ? '<span class="locale-sep">·</span><span class="locale-tz">' + tz + '</span>' : '') +
      '</span>' +
      '<span class="locale-label">' + (rt ? rt + '' : '') + '</span>';
  }

  function getText(loc, key) {
    if (!data || !data.locales || !data.locales[this.currentLocale]) return null;
    var dict = data.locales[this.currentLocale].dict;
    // Try compound key
    if (dict && dict[key]) return dict[key];
    // try the key directly on locale
    if (data.locales[this.currentLocale][key] && typeof data.locales[this.currentLocale][key] === 'string') return data.locales[this.currentLocale][key];
    return null;
  }

  function text(keyOrDict) {
    // Support both 'key' string and {dict, key} object form
    if (!data) return keyOrDict || '';
    var loc = currentLocale;
    if (!data.locales[loc]) loc = 'en';
    var dict = data.locales[loc].dict;
    if (typeof keyOrDict === 'string') {
      return dict && dict[keyOrDict] ? dict[keyOrDict] : keyOrDict;
    }
    if (keyOrDict.dictKey && dict && dict[keyOrDict.dictKey]) return dict[keyOrDict.dictKey];
    if (keyOrDict.raw) return keyOrDict.raw;
    return '';
  }

  function textFor(loc, dictKey) {
    if (!data || !data.locales || !data.locales[loc]) return dictKey || '';
    var dict = data.locales[loc].dict;
    return dict && dict[dictKey] ? dict[dictKey] : dictKey;
  }

  // ── Tabs ───────────────────────────────────────────────────────────
  function bindTabs() {
    Array.prototype.forEach.call(tabButtons, function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tab');
        if (!id) return;
        setActiveTab(id);
      });
    });
  }

  function setActiveTab(id) {
    if (!id) return;
    Array.prototype.forEach.call(tabButtons, function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === id);
    });
    Array.prototype.forEach.call(sections, function (s) {
      s.classList.toggle('active', s.id === 'section-' + id);
    });

    // Re-render that tab's dynamic content if needed
    if (id === 'ireland') renderIrelandTeams();
    if (id === 'provinces') renderProvinces();
    if (id === 'clubs') renderClubs();
    if (id === 'tournaments') renderTournaments();
    if (id === 'planning') renderPlanning();
    if (id === 'europe') renderEurope();
    if (id === 'world') renderWorld();
    // consent is static
    if (id === 'account') renderAccount();

    // Track analytics (if consent given)
    trackEvent('tab', id);
  }

  function trackEvent(cat, act) {
    // placeholder — no external analytics; could be wired later
  }

  // ── Search / filter ──────────────────────────────────────────────────
  function bindSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (searchClear) searchClear.style.display = q ? 'inline-block' : 'none';
      onSearch(q);
    });
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
      });
    }
  }

  function onSearch(q) {
    // filter team cards, club rows, tournament rows across all tabs
    $$('.team-card').forEach(function (el) {
      var txt = (el.getAttribute('data-name') || '').toLowerCase();
      el.style.display = txt.indexOf(q) !== -1 && !q ? '' : (q ? (txt.indexOf(q) !== -1 ? '' : 'none') : '');
    });
    $$('.club-row').forEach(function (el) {
      var txt = (el.getAttribute('data-name') || '').toLowerCase();
      el.style.display = txt.indexOf(q) !== -1 && !q ? '' : (q ? (txt.indexOf(q) !== -1 ? '' : 'none') : '');
    });
    $$('.tournament-row').forEach(function (el) {
      var txt = (el.getAttribute('data-name') || '').toLowerCase();
      el.style.display = txt.indexOf(q) !== -1 && !q ? '' : (q ? (txt.indexOf(q) !== -1 ? '' : 'none') : '');
    });
  }

  // ── Flappy Rugby show badge (appearance) ─────────────────────────
  function bindFlappyShowBadge() {
    if (flappyStartBtn) {
      flappyStartBtn.addEventListener('click', function () {
        showFlappyGame(true);
      });
      // Also wire the flappy-showing element
      var fs = $('#flappy-showing');
      if (fs) {
        fs.addEventListener('click', function () { showFlappyGame(true); });
      }
    }
    // Also wire any element with data-flappy-start
    $$('[data-flappy-start]').forEach(function (el) {
      el.addEventListener('click', function () { showFlappyGame(true); });
    });
  }

  // ── Flappy Rugby mini-game ──────────────────────────────────────────
  function showFlappyGame(visible) {
    if (!document.getElementById('flappy-overlay')) return;
    var overlay = document.getElementById('flappy-overlay');
    var gameover = document.getElementById('flappy-gameover');
    if (!overlay) return;
    overlay.style.display = visible ? 'flex' : 'none';
    if (gameover) gameover.style.display = 'none';
    if (visible) {
      // Kill any running loop first
      if (flappyCtx) {
        flappyCtx = null;
      }
      // Start loop after a tiny delay so the DOM repaints
      setTimeout(function () {
        initFlappy();
      }, 50);
    }
  }

  // ── Flappy game state ────────────────────────────────────────────────
  var flappyCanvas = null;
  var flappyCtx = null;
  var flappy = null;
  var flappyAnimId = null;
  var flappyPipeTimer = null;
  var flappyGravity = 0.45;
  var flappyFlapPower = -7.5;
  var flappyPipeGap = 145;
  var flappyPipeSpeed = 2.6;
  var flappyPipeFreq = 110; // frames between pipes (tune per device)
  var flappyPipeTimerCount = 0;
  var flappyScore = 0;
  var flappyHighScore = 0;
  var flappyGameOver = false;
  var flappyFrame = 0;
  var flappyWingPhase = 0; // wing flap animation phase
  var flappyBaseWingIndex = 0;
  var flappyPaused = false;

  function initFlappy() {
    var canvas = document.getElementById('flappy-canvas');
    if (!canvas) {
      // Try the id used in the gameover block
      canvas = document.getElementById('flappy-gameover-canvas');
    }
    if (!canvas) return;
    canvas.width = 340;
    canvas.height = 460;
    var ctx = canvas.getContext('2d');
    flappyCanvas = canvas;
    flappyCtx = ctx;
    flappy = {
      x: 70,
      y: 200,
      vy: 0,
      r: 17,
      wing: 0,
      rotation: 0,
    };
    flappyScore = 0;
    flappyGameOver = false;
    flappyPipeTimerCount = 0;
    flappyFrame = 0;
    flappyHighScore = 0;
    highScoreEl = $('#flappy-high-score');
    scoreEl = $('#flappy-score');
    if (highScoreEl) highScoreEl.textContent = 'Best: 0';
    if (scoreEl) scoreEl.textContent = '0';
    if (gameoverEl) gameoverEl.style.display = 'none';

    // Clear any old pipes
    var oldPipes = $$('[data-flappy-pipe]');
    oldPipes.forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });

    // Create pipe container
    var container = document.getElementById('flappy-pipes');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flappy-pipes';
      container.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; pointer-events:none;';
      canvas.parentNode.style.position = 'relative';
      canvas.parentNode.appendChild(container);
    }
    // Clear existing pipes
    var existing = $$('[data-flappy-pipe]');
    existing.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });

    // Remove old score popup
    var sp = document.getElementById('flappy-score-popup');
    if (sp) sp.remove();

    // Wire controls: tap/click/space
    canvas.removeEventListener('click', onFlappyTap);
    canvas.removeEventListener('touchstart', onFlappyTouch);
    window.removeEventListener('keydown', onFlappyKeydown);
    window.removeEventListener('keyup', onFlappyKeyup);
    canvas.addEventListener('click', onFlappyTap);
    canvas.addEventListener('touchstart', onFlappyTouch, { passive: true });
    window.addEventListener('keydown', onFlappyKeydown);
    window.addEventListener('keyup', onFlappyKeyup);

    // Hide start overlay after first interaction handled below
    var startOverlay = document.getElementById('flappy-start-overlay');
    if (startOverlay) startOverlay.style.display = 'none';

    // Draw first frame
    drawFlappy();
    // Start loop
    if (flappyAnimId) cancelAnimationFrame(flappyAnimId);
    flappyLoop();
    // Pipe timer
    if (flappyPipeTimer) clearInterval(flappyPipeTimer);
    flappyPipeTimer = setInterval(flappySpawnPipe, 1000);
    flappyPipeTimerCount = 0;
  }

  function onFlappyTap(e) {
    e.preventDefault();
    if (flappyGameOver) {
      // Restart
      if (flappyCtx) flappyCtx.clearRect(0, 0, flappyCanvas.width, flappyCanvas.height);
      initFlappy();
      return;
    }
    flapFlappy();
  }

  function onFlappyTouch(e) {
    e.preventDefault();
    if (flappyGameOver) {
      if (flappyCtx) flappyCtx.clearRect(0, 0, flappyCanvas.width, flappyCanvas.height);
      initFlappy();
      return;
    }
    flapFlappy();
  }

  function onFlappyKeydown(e) {
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (flappyGameOver) {
        if (flappyCtx) flappyCtx.clearRect(0, 0, flappyCanvas.width, flappyCanvas.height);
        initFlappy();
        return;
      }
      flapFlappy();
    }
  }

  function onFlappyKeyup(e) {
    // nothing
  }

  function flapFlappy() {
    if (!flappy || flappyGameOver) return;
    flappy.vy = flappyFlapPower;
    flappy.wing = 1; // trigger wing animation
    flappyWingPhase = 0;
  }

  function flappySpawnPipe() {
    if (!flappyCanvas) return;
    if (flappyGameOver) return;
    if (flappyPaused) return;

    var canvas = flappyCanvas;
    var minTop = 60;
    var maxTop = canvas.height - flappyPipeGap - 80;
    var top = minTop + Math.random() * (maxTop - minTop);
    var x = canvas.width + 20;
    var w = 16;

    var topEl = document.createElement('div');
    topEl.setAttribute('data-flappy-pipe', '');
    topEl.style.cssText =
      'position:absolute; left:' + x + 'px; top:0; width:' + w + 'px; height:' + top + 'px; ' +
      'background: linear-gradient(90deg, #7cb342, #558b2f); border-radius:4px 4px 0 0; ' +
      'box-shadow: 0 0 6px rgba(0,0,0,0.15);';
    var container = document.getElementById('flappy-pipes');
    if (container) container.appendChild(topEl);

    var bottomEl = document.createElement('div');
    bottomEl.setAttribute('data-flappy-pipe', '');
    bottomEl.style.cssText =
      'position:absolute; left:' + x + 'px; top:' + (top + flappyPipeGap) + 'px; width:' + w + 'px; ' +
      'height:' + (canvas.height - top - flappyPipeGap) + 'px; ' +
      'background: linear-gradient(90deg, #7cb342, #558b2f); border-radius:4px 4px 0 0; ' +
      'box-shadow: 0 0 6px rgba(0,0,0,0.15);';
    if (container) container.appendChild(bottomEl);

    // Gap indicator
    var capTop = document.createElement('div');
    capTop.setAttribute('data-flappy-pipe', '');
    capTop.style.cssText =
      'position:absolute; left:' + (x) + 'px; top:' + (top - 8) + 'px; width:' + (w + 6) + 'px; height:8px; ' +
      'background:#558b2f; border-radius:2px 2px 0 0;';
    if (container) container.appendChild(capTop);

    var capBot = document.createElement('div');
    capBot.setAttribute('data-flappy-pipe', '');
    capBot.style.cssText =
      'position:absolute; left:' + (x) + 'px; top:' + (top + flappyPipeGap) + 'px; width:' + (w + 6) + 'px; height:8px; ' +
      'background:#558b2f; border-radius:0 0 2px 2px;';
    if (container) container.appendChild(capBot);
  }

  function flappyLoop() {
    if (!flappy || !flappyCanvas) {
      if (flappyAnimId) cancelAnimationFrame(flappyAnimId);
      return;
    }
    flappyFrame++;

    if (!flappyGameOver) {
      // gravity
      flappy.vy += flappyGravity;
      flappy.y += flappy.vy;

      // rotation
      flappy.rotation = Math.max(-0.5, Math.min(1.2, flappy.vy * 0.06));

      // wing animation
      if (flappy.wing > 0) {
        flappyWingPhase += 0.35;
        flappy.wing = Math.max(0, flappy.wing - 0.02);
        flappyBaseWingIndex = Math.floor(flappyWingPhase) % 3;
      } else {
        // hover wing micro
        flappyBaseWingIndex = flappyFrame % 60 < 30 ? 0 : 1;
      }

      // pipe collision (DOM-based)
      var pipes = $$('[data-flappy-pipe]');
      var hit = false;
      var pipeData = [];
      pipes.forEach(function (el) {
        var st = window.getComputedStyle(el);
        var l = parseFloat(st.left);
        var t = parseFloat(st.top);
        var w = parseFloat(st.width);
        var h = parseFloat(st.height);
        if (isNaN(l) || isNaN(t) || isNaN(w) || isNaN(h)) return;
        // treat as rect
        if (el.getAttribute('data-pipe-top')) {
          pipeData.push({ x: l, y: t, w: w, h: h, top: true });
        } else if (el.getAttribute('data-pipe-bottom')) {
          pipeData.push({ x: l, y: t, w: w, h: h, top: false });
        } else {
          // generic pipe piece
          pipeData.push({ x: l, y: t, w: w, h: h, top: null });
        }
      });

      var ball = { x: flappy.x, y: flappy.y, r: flappy.r };
      for (var i = 0; i < pipeData.length; i++) {
        var p = pipeData[i];
        if (rectCircleOverlap(p, ball)) {
          hit = true;
          break;
        }
      }

      if (hit) {
        gameOverFlappy();
        return;
      }

      // Scoring: if ball passes a top pipe's right edge
      for (var j = 0; j < pipeData.length; j++) {
        var p = pipeData[j];
        if (!p.top) continue;
        if (p.x + p.w >= ball.x && p.x + p.w - 2 < ball.x + ball.r) {
          // passed
        }
        if (p.x + p.w < ball.x - ball.r && !p.scored) {
          p.scored = true;
          flappyScore++;
          if (scoreEl) scoreEl.textContent = String(flappyScore);
          // popup
          var popup = document.createElement('div');
          popup.id = 'flappy-score-popup';
          popup.textContent = '+' + flappyScore;
          popup.style.cssText =
            'position:absolute; left:' + (p.x + 20) + 'px; top:' + (p.y + 4) + 'px; ' +
            'color:#fff; font-size:18px; font-weight:700; pointer-events:none; ' +
            'text-shadow: 0 2px 6px rgba(0,0,0,0.4);';
          var container = document.getElementById('flappy-pipes');
          if (container) container.appendChild(popup);
          setTimeout(function () { if (popup.parentNode) popup.parentNode.removeChild(popup); }, 600);
        }
      }

      // Move pipes
      pipes.forEach(function (el) {
        var left = parseFloat(el.style.left) - flappyPipeSpeed;
        if (left < -40) {
          if (el.parentNode) el.parentNode.removeChild(el);
        } else {
          el.style.left = left + 'px';
        }
      });

      // Wing display
      if (wingEl) {
        wingEl.style.transform = 'rotate(' + (flappyBaseWingIndex === 1 ? '12deg' : (flappyBaseWingIndex === 2 ? '-8deg' : '0deg')) + ')';
      }

    } else {
      // game over gravity
      if (flappy) {
        flappy.vy += flappyGravity * 0.7;
        flappy.y += flappy.vy;
        flappy.rotation = Math.min(Math.PI / 2, flappy.rotation + 0.04);
      }
    }

    drawFlappy();

    if (flappyGameOver && flappy && flappy.y > flappyCanvas.height + 50) {
      // show gameover after falling off
      showFlappyGameOver(true);
      // Stop loop
      if (flappyAnimId) cancelAnimationFrame(flappyAnimId);
      flappyAnimId = null;
      return;
    }

    flappyAnimId = requestAnimationFrame(flappyLoop);
  }

  function rectCircleOverlap(r, c) {
    var cx = c.x, cy = c.y, cr = c.r;
    var rx = r.x, ry = r.y, rw = r.w, rh = r.h;
    var closestX = Math.max(rx, Math.min(cx, rx + rw));
    var closestY = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - closestX;
    var dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  function drawFlappy() {
    if (!flappyCtx || !flappyCanvas) return;
    var ctx = flappyCtx;
    var w = flappyCanvas.width, h = flappyCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Sky gradient
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#bcd9b6');
    sky.addColorStop(1, '#e8f5e0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(0, h - 40, w, 40);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, h - 40, w, 4);

    // Clouds
    drawCloud(ctx, 40, 50, 0.9);
    drawCloud(ctx, 200, 35, 1.1);
    drawCloud(ctx, 280, 70, 0.7);

    // Ball
    if (flappy) {
      drawRugbyBall(ctx, flappy.x, flappy.y, flappy.r, flappy.rotation, flappyBaseWingIndex);
    }

    // Score in canvas (fallback)
    if (scoreEl && scoreEl.textContent) {
      // already on DOM
    }
  }

  function drawCloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y - 5 * s, 14 * s, 0, Math.PI * 2);
    ctx.arc(x + 40 * s, y, 17 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y + 5 * s, 15 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRugbyBall(ctx, x, y, r, rot, wingIdx) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // shadow
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Body ellipse
    var rw = r * 1.45;
    var rh = r * 0.92;
    var grad = ctx.createRadialGradient(-rw * 0.2, -rh * 0.2, 2, 0, 0, rw);
    grad.addColorStop(0, '#f5edd6');
    grad.addColorStop(0.6, '#e7d7a8');
    grad.addColorStop(1, '#c9b678');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#a8885a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Seam
    ctx.strokeStyle = '#b89a5e';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rw * 0.85, rh * 0.7, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Laces
    ctx.strokeStyle = '#8a6f3a';
    ctx.lineWidth = 1.6;
    for (var i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 6, -rh * 0.5);
      ctx.lineTo(i * 6, rh * 0.5);
      ctx.stroke();
    }

    // Wings
    ctx.fillStyle = '#16722e';
    ctx.strokeStyle = '#0f5a1f';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;

    var wingFlap = (wingIdx === 1) ? 0.6 : (wingIdx === 2 ? -0.35 : 0.15);
    // Left wing
    ctx.save();
    ctx.translate(-rw - 4, -rh * 0.2);
    ctx.rotate(-0.4 + wingFlap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -12, -20, 2);
    ctx.quadraticCurveTo(-14, 8, 0, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.translate(rw + 4, -rh * 0.2);
    ctx.rotate(0.4 - wingFlap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, -12, 20, 2);
    ctx.quadraticCurveTo(14, 8, 0, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Wing highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.save();
    ctx.translate(-rw - 6, -rh * 0.35);
    ctx.rotate(-0.4 + wingFlap);
    ctx.beginPath();
    ctx.ellipse(-6, 0, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(rw + 6, -rh * 0.35);
    ctx.rotate(0.4 - wingFlap);
    ctx.beginPath();
    ctx.ellipse(6, 0, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function gameOverFlappy() {
    if (flappyGameOver) return;
    flappyGameOver = true;
    if (flappy) flappy.vy = -2;
    // stop spawning
    if (flappyPipeTimer) clearInterval(flappyPipeTimer);
    // allow loop to finish current frame then stop
  }

  function showFlappyGameOver(show) {
    if (!gameoverEl) return;
    gameoverEl.style.display = show ? 'flex' : 'none';
    if (show) {
      if (flappyScore > flappyHighScore) {
        flappyHighScore = flappyScore;
        if (highScoreEl) highScoreEl.textContent = 'Best: ' + flappyHighScore;
      }
      if (scoreEl) scoreEl.textContent = String(flappyScore);
      if (highScoreEl) highScoreEl.textContent = 'Best: ' + flappyHighScore;
      var restartMsg = textFor(currentLocale, 'flappyRestart') || 'Tap to restart';
      if (restartMsgEl) restartMsgEl.textContent = restartMsg;
    } else {
      if (scoreEl) scoreEl.textContent = '0';
      if (highScoreEl) highScoreEl.textContent = 'Best: ' + flappyHighScore;
    }
  }

  // ── DOM refs for flappy ─────────────────────────────────────────────
  var wingEl = null;
  var scoreEl = null;
  var highScoreEl = null;
  var gameoverEl = null;
  var restartMsgEl = null;

  function cacheFlappyRefs() {
    wingEl = $('#flappy-wing');
    scoreEl = $('#flappy-score');
    highScoreEl = $('#flappy-high-score');
    gameoverEl = $('#flappy-gameover');
    restartMsgEl = $('#flappy-restart-msg');
  }
  cacheFlappyRefs();

  // ── Ireland Teams ────────────────────────────────────────────────────
  function renderIrelandTeams() {
    var container = $('#irish-team-list');
    if (!container || !data) return;
    container.innerHTML = '';
    var teams = data.teams && data.teams.ireland ? data.teams.ireland : [];
    if (!teams.length) {
      container.innerHTML = '<p class="small">No teams loaded.</p>';
      return;
    }
    teams.forEach(function (team) {
      var card = document.createElement('div');
      card.className = 'team-card' + (team.featured ? ' featured' : '');
      card.setAttribute('data-name', team.name || '');
      var badgeHtml = '';
      if (team.badge) {
        badgeHtml = '<span class="badge important">' + escapeHtml(team.badge) + '</span>';
      }
      var pubStr = team.pubMatch ? '🟢 ' + (team.pubMatch === true ? getText(currentLocale, 'pubGood') || 'Great pub pick' : escapeHtml(team.pubMatch)) : '';
      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:start;">' +
          '<h3 style="margin:0; font-size:15px;">' + escapeHtml(team.name) + badgeHtml + '</h3>' +
          '<span class="badge">' + escapeHtml(team.code || '') + '</span>' +
        '</div>' +
        '<div style="font-size:13px; color:#555;">' + (team.desc ? escapeHtml(team.desc) : '') + '</div>' +
        (pubStr ? '<p style="font-size:12.5px; margin-top:6px;">' + pubStr + '</p>' : '');
      container.appendChild(card);
    });
  }

  // ── Provinces ────────────────────────────────────────────────────────
  function renderProvinces() {
    var container = $('#province-list');
    if (!container || !data) return;
    container.innerHTML = '';
    var provs = data.provinces || [];
    if (!provs.length) {
      container.innerHTML = '<p class="small">No provinces yet.</p>';
      return;
    }
    provs.forEach(function (p) {
      var el = document.createElement('div');
      el.className = 'card';
      el.setAttribute('data-name', p.name || '');
      el.innerHTML =
        '<h3>' + escapeHtml(p.name) + '</h3>' +
        '<p>' + (p.desc ? escapeHtml(p.desc) : '') + '</p>' +
        '<p class="small">Arena: ' + (p.arena ? escapeHtml(p.arena) : '') + '</p>';
      container.appendChild(el);
    });
  }

  // ── Clubs ────────────────────────────────────────────────────────────
  function renderClubs() {
    var container = $('#club-list');
    if (!container || !data) return;
    if (!container.nodeName) return;
    container.innerHTML = '';
    var clubs = data.clubs || [];
    if (!clubs.length) {
      container.innerHTML = '<p class="small">No clubs yet.</p>';
      return;
    }
    clubs.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'club-row';
      li.setAttribute('data-name', c.name || '');
      li.innerHTML =
        '<strong>' + escapeHtml(c.name) + '</strong>' +
        (c.city ? ' · ' + escapeHtml(c.city) : '') +
        '<br><span class="small">' + (c.division ? escapeHtml(c.division) : '') + '</span>';
      container.appendChild(li);
    });
  }

  // ── Tournaments ──────────────────────────────────────────────────────
  function renderTournaments() {
    var container = $('.tournament-list');
    if (!container || !data) return;
    // Find the one with class tournament-list (there's one per tab)
    var wraps = $$('.tournament-list');
    if (!wraps.length) return;
    var activeWrap = null;
    Array.prototype.forEach.call(wraps, function (w) {
      if (w.style.display !== 'none') activeWrap = w;
    });
    if (!activeWrap) activeWrap = wraps[0];
    activeWrap.innerHTML = '';
    var turs = data.tournaments || [];
    if (!turs.length) {
      activeWrap.innerHTML = '<p class="small">No tournaments yet.</p>';
      return;
    }
    turs.forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'card blue tournament-row';
      row.setAttribute('data-name', t.name || '');
      var pubStr = t.pubMatch ? '🟢 ' + (t.pubMatch === true ? getText(currentLocale, 'pubGood') || 'Great pub pick' : escapeHtml(t.pubMatch)) : '';
      row.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:start;">' +
          '<h3 style="margin:0; font-size:15px;">' + escapeHtml(t.name) + '</h3>' +
        '</div>' +
        '<p class="small">' + (t.desc ? escapeHtml(t.desc) : '') + '</p>' +
        '<p class="small" style="margin-top:4px;">' + (t.season ? escapeHtml(t.season) : '') + '</p>' +
        (pubStr ? '<p style="font-size:12.5px; margin-top:4px;">' + pubStr + '</p>' : '');
      activeWrap.appendChild(row);
    });
  }

  // ── Europe ───────────────────────────────────────────────────────────
  function renderEurope() {
    var el = $('#section-europe');
    if (!el || !data) return;
    var html = '';
    var euroTeams = data.europe && data.europe.teams ? data.europe.teams : [];
    if (euroTeams.length) {
      html += '<div class="badge-row">' + euroTeams.map(function (t) {
        return '<span class="badge">' + escapeHtml(t) + '</span>';
      }).join('') + '</div>';
    }
    var euroText = data.europe && data.europe.text ? data.europe.text : '';
    if (euroText) {
      html += '<p>' + escapeHtml(euroText) + '</p>';
    }
    var euroList = data.europe && data.europe.list ? data.europe.list : [];
    if (euroList.length) {
      html += '<ul>' + euroList.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join('') + '</ul>';
    }
    if (!html) html = '<p class="small">No Europe content.</p>';
    el.innerHTML = html;
  }

  // ── World ────────────────────────────────────────────────────────────
  function renderWorld() {
    var el = $('#section-world');
    if (!el || !data) return;
    var html = '';
    var worldTeams = data.world && data.world.teams ? data.world.teams : [];
    if (worldTeams.length) {
      html += '<div class="badge-row">' + worldTeams.map(function (t) {
        return '<span class="badge">' + escapeHtml(t) + '</span>';
      }).join('') + '</div>';
    }
    var worldText = data.world && data.world.text ? data.world.text : '';
    if (worldText) {
      html += '<p>' + escapeHtml(worldText) + '</p>';
    }
    var worldList = data.world && data.world.list ? data.world.list : [];
    if (worldList.length) {
      html += '<ul>' + worldList.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join('') + '</ul>';
    }
    var tzInfo = data.worldTimezones ? Object.keys(data.worldTimezones).slice(0, 30).map(function (k) {
      var v = data.worldTimezones[k];
      var label = v.label || k;
      var off = v.offset ? (v.offset >= 0 ? '+' : '') + v.offset : '';
      return '<li><strong>' + escapeHtml(label) + '</strong> — UTC' + off + '</li>';
    }).join('') : '';
    if (tzInfo) {
      html += '<h3>' + (getText(currentLocale, 'worldTimezones') || 'World time zones') + '</h3><ul>' + tzInfo + '</ul>';
    }
    if (!html) html = '<p class="small">No world content.</p>';
    el.innerHTML = html;
  }

  // ── Planning ─────────────────────────────────────────────────────────
  var planningData = [];

  function renderPlanning() {
    var grid = $('#plan-grid');
    if (!grid) return;
    if (!planningData.length) {
      grid.innerHTML =
        '<p class="small" style="padding:8px 0;">No one added yet — tap + Add person to start your group.</p>';
      return;
    }
    grid.innerHTML = '';
    planningData.forEach(function (row, i) {
      var div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '8px';
      div.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<strong>' + escapeHtml(row.name || '') + '</strong>' +
          '<button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; margin:0;" data-plan-remove="' + i + '">Remove</button>' +
        '</div>' +
        '<p class="small">Watching: ' + (row.watching ? escapeHtml(row.watching) : '') + '</p>' +
        '<p class="small">Notes: ' + (row.notes ? escapeHtml(row.notes) : '') + '</p>';
      grid.appendChild(div);
    });
    // bind remove buttons
    $$('[data-plan-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-plan-remove'), 10);
        if (!isNaN(idx) && planningData[idx]) {
          planningData.splice(idx, 1);
          renderPlanning();
          savePlanning();
        }
      });
    });
  }

  function savePlanning() {
    try {
      localStorage.setItem('rugbywatch-planning', JSON.stringify(planningData));
    } catch (e) {}
  }

  function loadPlanning() {
    try {
      var s = localStorage.getItem('watchrugby-planning');
      if (s) planningData = JSON.parse(s);
    } catch (e) {
      planningData = [];
    }
  }

  // ── Account / consent ────────────────────────────────────────────────
  function renderAccount() {
    // static
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getText(locale, key) {
    var l = data && data.locales && data.locales[locale] ? data.locales[locale] : null;
    if (!l) return null;
    var dict = l.dict || {};
    return dict[key] || null;
  }

  // ── Render all tabs on locale change ────────────────────────────────
  function renderAllTabs() {
    if (!data) return;
    // Re-render content for each visible/active tab
    if (data.teams && data.teams.ireland) renderIrelandTeams();
    if (data.provinces) renderProvinces();
    if (data.clubs) renderClubs();
    if (data.tournaments) renderTournaments();
    if (data.europe) renderEurope();
    if (data.world) renderWorld();
    if (planningData.length) renderPlanning();
    showLocaleIndicator(currentLocale);
    // Also update any dynamic text that uses currentLocale dict
    updateDynamicText();
  }

  function updateDynamicText() {
    // Update any element that has data-i18n attribute
    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var txt = textFor(currentLocale, key);
      if (txt) el.textContent = txt;
    });
    // Update search placeholder if present
    if (searchInput) {
      var ph = textFor(currentLocale, 'searchTeams');
      if (ph) searchInput.setAttribute('placeholder', ph);
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────
  loadPlanning();

})();
