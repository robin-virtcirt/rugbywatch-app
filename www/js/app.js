/**
 * Rugby Watch — app.js
 * One app, both stores. Locale-aware timezone conversion, pub watchability
 * relative to user's clock, language selector, Ireland featured alongside
 * worldwide teams/tournaments, GDPR consent, planning grid, Flappy Rugby.
 *
 * Source of truth: www/js/data.json  (locales block primary; top-level
 * teams/tournaments/provinces/clubs are English fallbacks).
 */
"use strict";

var http       = require("http");
var fs         = require("fs");
var DATA_RAW   = require("./www/js/data.json");
var data       = DATA_RAW;

var SERVER_PORT = 3977;
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":  "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};
var DOC_ROOT = __dirname + "/www";

function extOf(path) { var i = path.lastIndexOf("."); return i >= 0 ? path.slice(i).toLowerCase() : ""; }
function contentTypeFor(path) { return MIME[extOf(path)] || "application/octet-stream"; }
function tryStat(p) { try { return fs.statSync(p); } catch(e) { return null; } }

function corsHeaders(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, Accept, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return true; }
  return false;
}

function serveFile(path, contentType, req, res) {
  var stat = tryStat(path);
  if (!stat) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); return; }
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  fs.createReadStream(path).pipe(res);
}

function serve(req, res) {
  var uri = (req.url || "/").split("?")[0];
  if (corsHeaders(req, res)) return;
  if (uri === "/" || uri === "/index.html") {
    serveFile(DOC_ROOT + "/index.html", "text/html; charset=utf-8", req, res);
    return;
  }
  var filePath = DOC_ROOT + uri;
  var stat = tryStat(filePath);
  if (!stat) {
    var altPath = DOC_ROOT + uri + ".html";
    stat = tryStat(altPath);
    if (stat) { serveFile(altPath, "text/html; charset=utf-8", req, res); return; }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found: " + uri);
    return;
  }
  res.writeHead(200, {
    "Content-Type": contentTypeFor(filePath),
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  var fstream = null;
  try { fstream = fs.createReadStream(filePath); } catch(e) {
    res.writeHead(500, { "Content-Type": "text/plain" }); res.end("Internal server error"); return;
  }
  fstream.on("error", function() { res.writeHead(500); res.end(); });
  fstream.pipe(res);
}

function bootServer() {
  http.createServer(serve).listen(SERVER_PORT, function() {
    console.log("Rugby Watch dev server listening on http://localhost:" + SERVER_PORT);
  });
}

// ---- locale helpers ----
var currentLocale = "en";
var currentDict = data.locales.en.dict;
var currentTeams = data.locales.en.teams || {};
var currentTournaments = data.locales.en.tournaments || {};
var currentProvinces = data.locales.en.provinces || {};
var currentClubs = data.locales.en.clubs || [];
var cachedTZ = null;

function preferredLocale() {
  var nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav && nav.language) {
    var code = nav.language.toLowerCase();
    if (data.locales[code]) return code;
    if (code.startsWith("en")) return "en";
    if (code.startsWith("cy")) return "cy";
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("es")) return "es";
    if (code.startsWith("it")) return "it";
    if (code.startsWith("de")) return "de";
    if (code.startsWith("pt")) return "pt";
    if (code.startsWith("ja")) return "ja";
  }
  return "en";
}

function detectLocale() {
  try {
    var dtf = new Intl.DateTimeFormat();
    var opts = dtf.resolvedOptions();
    cachedTZ = opts.timeZone || "Europe/Dublin";
  } catch(e) { cachedTZ = "Europe/Dublin"; }
  var nav = typeof navigator !== "undefined" ? navigator : null;
  var newLocale = preferredLocale();
  if (newLocale !== currentLocale) setLocale(newLocale);
}

function setLocale(code) {
  if (!data.locales[code]) return;
  currentLocale = code;
  currentDict = data.locales[code].dict || {};
  currentTeams = data.locales[code].teams || {};
  currentTournaments = data.locales[code].tournaments || {};
  currentProvinces = data.locales[code].provinces || {};
  currentClubs = data.locales[code].clubs || [];
  localStorage.setItem("rw-locale", code);
}

function localeField(obj, key, fallback) {
  if (!obj) return fallback;
  var v = obj[key];
  return (v !== undefined && v !== "") ? v : fallback;
}
function localeTeamDisplay(teamId) {
  if (currentTeams[teamId]) return currentTeams[teamId].name || data.teams[teamId].name;
  if (data.teams[teamId]) return data.teams[teamId].name;
  return teamId;
}
function localeTournamentDisplay(tid) {
  if (currentTournaments && currentTournaments[tid]) return currentTournaments[tid].name || data.tournaments[tid].name;
  if (data.tournaments && data.tournaments[tid]) return data.tournaments[tid].name;
  return tid;
}
function localeProvinceDisplay(code) {
  if (currentProvinces[code]) return currentProvinces[code].name || data.provinces[code].name;
  if (data.provinces[code]) return data.provinces[code].name;
  return code;
}

function t(key) {
  if (currentDict[key] !== undefined) return currentDict[key];
  if (data.locales.en && data.locales.en.dict[key] !== undefined) return data.locales.en.dict[key];
  return key;
}

// ---- timezone conversion ----
function toUserTime(text, tz) {
  if (!text) return "";
  tz = tz || cachedTZ || "Europe/Dublin";
  try {
    var parser = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "2-digit", minute: "2-digit",
      second: "2-digit", hour12: false
    });
    var iso = text.replace(/Z$/, "");
    var d = new Date(iso);
    if (isNaN(d.getTime())) return text;
    return parser.format(d);
  } catch(e) { return text; }
}

function toUserTimeSlot(dateStr, timeStr, tz) {
  tz = tz || cachedTZ || "Europe/Dublin";
  if (!dateStr || !timeStr) return "";
  try {
    var combined = dateStr + "T" + timeStr + ":00";
    var d = new Date(combined);
    if (isNaN(d.getTime())) return dateStr + " " + timeStr;
    var parser = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short"
    });
    return parser.format(d);
  } catch(e) { return dateStr + " " + timeStr; }
}

function pubWatchability(timeStr) {
  if (!timeStr) return t("watch.unknown");
  var h = parseInt(timeStr, 10);
  if (isNaN(h)) return t("watch.unknown");
  if (h >= 16 && h <= 22) return t("watch.pub");
  if (h >= 12 && h < 16) return t("watch.early");
  if (h >= 8 && h < 12) return t("watch.tooearly");
  return t("watch.unknown");
}

// ---- rendered HTML cache ----
var rendered = {};

// ---- locale indicator ----
function localeFlag(code) {
  var flags = { en:"🏴", cy:"🏴", fr:"🇫🇷", es:"🇪🇸", it:"🇮🇹", de:"🇩🇪", pt:"🇵🇹", ja:"🇯🇵" };
  return flags[code] || "🏉";
}

function renderLocaleSelector() {
  var sel = '<select id="locale-selector" aria-label="Language">';
  Object.keys(data.locales).forEach(function(code) {
    var l = data.locales[code];
    var label = (l && l.label) ? l.label : code;
    var selAttr = (code === currentLocale) ? ' selected="selected"' : "";
    sel += '<option value="' + code + '"' + selAttr + '>' + label + '</option>';
  });
  sel += "</select>";
  return sel;
}

function renderLocaleIndicator() {
  var el = document.getElementById("locale-indicator");
  if (!el) return;
  var tzLabel = cachedTZ ? cachedTZ.replace(/_/g, " ") : "Europe/Dublin";
  var localeLabel = currentLocale.toUpperCase();
  var flag = localeFlag(currentLocale);
  el.innerHTML =
    '<div class="locale-indicator">' +
      '<span class="locale-flag">' + flag + '</span>' +
      '<span class="locale-code">' + localeLabel + '</span>' +
      '<span class="locale-sep">·</span>' +
      '<span class="locale-tz">' + tzLabel + '</span>' +
    "</div>";
}

// ---- home ----
function renderHome() {
  var html =
    '<div class="section" id="section-home">' +
      '<h2>' + t("home.title") + "</h2>" +
      '<p class="section-intro">' + t("home.intro") + "</p>" +
      '<div class="badge-row">' +
        '<span class="badge">' + t("badge.sixnations") + "</span>" +
        '<span class="badge">' + t("badge.rwc") + "</span>" +
        '<span class="badge">' + t("badge.urc") + "</span>" +
        '<span class="badge">' + t("badge.champions") + "</span>" +
        '<span class="badge">' + t("badge.challenge") + "</span>" +
        '<span class="badge">' + t("badge.provinces") + "</span>" +
        '<span class="badge important">' + t("badge.timezone") + "</span>" +
      "</div>" +
      '<div id="what-list"></div>' +
      '<div class="card">' +
        '<h3>' + t("home.pub.h3") + "</h3>" +
        '<p>' + t("home.pub.p1") + "</p>" +
        '<p>' + t("home.pub.p2") + "</p>" +
      "</div>" +
      '<div class="card warn">' +
        '<h3>' + t("home.datanote.h3") + "</h3>" +
        '<p>' + t("home.datanote.p") + "</p>" +
      "</div>" +
      '<div class="card green">' +
        '<h3>' + t("home.privacy.h3") + "</h3>" +
        '<p>' + t("home.privacy.p") + "</p>" +
      "</div>" +
    "</div>";
  rendered["home"] = html;
}

// ---- world teams ----
function renderWorldTeams() {
  var html = '<div class="section" id="section-world">' +
    '<h2>' + t("section.world.title") + '</h2>' +
    '<p class="section-intro">' + t("section.world.intro") + '</p>' +
    '<div class="world-teams-group">';

  Object.keys(data.teams).forEach(function(id) {
    var team = data.teams[id];
    if (!team) return;
    var displayed = localeTeamDisplay(id);
    var short = localeField(currentTeams[id], "short", localeField(team, "short", ""));
    var union = localeField(currentTeams[id], "union", localeField(team, "union", ""));
    var jersey = localeField(currentTeams[id], "jersey", localeField(team, "jersey", ""));
    var pubNote = (currentTeams[id] && currentTeams[id].pubNote) ? currentTeams[id].pubNote : (team.pubNote || "");
    var featured = team.featured ? " featured" : "";
    var badge = team.featured ? '<span class="badge badge-featured">' + t("badge.featured") + '</span>' : "";

    html += '<div class="team-card' + featured + '">' +
      '<div class="team-header">' +
        '<div class="team-flag">🏉</div>' +
        '<div class="team-meta">' +
          '<span class="team-name">' + displayed + '</span>' +
          (short ? '<span class="team-short">' + short + '</span>' : "") +
        '</div>' +
        badge +
      '</div>' +
      '<div class="team-detail">' +
        (union ? '<div class="team-row"><span class="row-label">' + t("team.union") + ':</span> <span>' + union + '</span></div>' : "") +
        (jersey ? '<div class="team-row"><span class="row-label">' + t("team.jersey") + ':</span> <span>' + jersey + '</span></div>' : "") +
        '<div class="team-pub">' + pubNote + '</div>' +
      '</div>' +
    '</div>';
  });

  html += "</div></div>";
  rendered["world"] = html;
}

// ---- timezone converter ----
function renderTimezoneConverter() {
  var tz = cachedTZ || "Europe/Dublin";
  var intro = t("tzconverter.intro");
  var foot = t("tzconverter.foot").replace("{locale}", currentLocale.toUpperCase()).replace("{tz}", tz);

  var regions = [
    { name: "Europe/Dublin",     label: "Ireland (Dublin)" },
    { name: "Europe/London",     label: "UK (London)" },
    { name: "Europe/Paris",      label: "France (Paris)" },
    { name: "Europe/Madrid",     label: "Spain (Madrid)" },
    { name: "Europe/Rome",       label: "Italy (Rome)" },
    { name: "Europe/Berlin",     label: "Germany (Berlin)" },
    { name: "Europe/Lisbon",     label: "Portugal (Lisbon)" },
    { name: "Europe/Warsaw",     label: "Poland (Warsaw)" },
    { name: "Europe/Prague",     label: "Czech (Prague)" },
    { name: "Europe/Amsterdam",  label: "Netherlands (Amsterdam)" },
    { name: "Europe/Brussels",   label: "Belgium (Brussels)" },
    { name: "Europe/Stockholm",  label: "Sweden (Stockholm)" },
    { name: "Europe/Oslo",       label: "Norway (Oslo)" },
    { name: "Europe/Copenhagen", label: "Denmark (Copenhagen)" },
    { name: "Europe/Helsinki",   label: "Finland (Helsinki)" },
    { name: "Europe/Athens",     label: "Greece (Athens)" },
    { name: "Europe/Istanbul",   label: "Turkey (Istanbul)" },
    { name: "Europe/Riga",       label: "Latvia (Riga)" },
    { name: "Europe/Vilnius",    label: "Lithuania (Vilnius)" },
    { name: "Europe/Sofia",      label: "Bulgaria (Sofia)" },
    { name: "Europe/Bucharest",  label: "Romania (Bucharest)" },
    { name: "Europe/Budapest",   label: "Hungary (Budapest)" },
    { name: "Europe/Zagreb",     label: "Croatia (Zagreb)" },
    { name: "Europe/Ljubljana",  label: "Slovenia (Ljubljana)" },
    { name: "Europe/Sarajevo",   label: "Bosnia (Sarajevo)" },
    { name: "Europe/Minsk",      label: "Belarus (Minsk)" },
    { name: "Europe/Kiev",       label: "Ukraine (Kiev)" },
    { name: "America/New_York",      label: "USA (New York)" },
    { name: "America/Chicago",       label: "USA (Chicago)" },
    { name: "America/Denver",        label: "USA (Denver)" },
    { name: "America/Los_Angeles",   label: "USA (Los Angeles)" },
    { name: "America/Anchorage",     label: "USA (Anchorage)" },
    { name: "America/Honolulu",      label: "USA (Honolulu)" },
    { name: "Pacific/Auckland",      label: "New Zealand (Auckland)" },
    { name: "Pacific/Chatham",       label: "New Zealand (Chatham)" },
    { name: "Australia/Sydney",      label: "Australia (Sydney)" },
    { name: "Australia/Melbourne",   label: "Australia (Melbourne)" },
    { name: "Australia/Brisbane",    label: "Australia (Brisbane)" },
    { name: "Australia/Perth",       label: "Australia (Perth)" },
    { name: "Australia/Adelaide",    label: "Australia (Adelaide)" },
    { name: "Australia/Darwin",      label: "Australia (Darwin)" },
    { name: "Asia/Tokyo",            label: "Japan (Tokyo)" },
    { name: "Asia/Osaka",            label: "Japan (Osaka)" },
    { name: "Asia/Seoul",            label: "South Korea (Seoul)" },
    { name: "Asia/Shanghai",         label: "China (Shanghai)" },
    { name: "Asia/Hong_Kong",        label: "Hong Kong" }
  ];

  var rows = [];
  regions.forEach(function(r) {
    var kickOff16 = toUserTimeSlot("2026-03-15", "16:00", r.name);
    var kickOff19 = toUserTimeSlot("2026-03-15", "19:00", r.name);
    var watch16 = pubWatchability(kickOff16);
    var watch19 = pubWatchability(kickOff19);
    var watchCombined = watch16 === watch19 ? watch16 : (watch16 + " / " + watch19);
    if (!kickOff16) watchCombined = t("watch.unknown");
    rows.push("<tr>" +
      '<td class="tz-region">' + r.label + "</td>" +
      '<td class="tz-names">' + r.name + "</td>" +
      '<td class="tz-kick16">' + kickOff16 + "</td>" +
      '<td class="tz-kick19">' + kickOff19 + "</td>" +
      '<td class="tz-watch">' + watchCombined + "</td>" +
    "</tr>");
  });

  var bodyRows = rows.join("");
  rendered["tz"] =
    '<div class="section" id="section-tz-converter">' +
      '<h2>' + t("tzconverter.title") + "</h2>" +
      '<p class="section-intro">' + intro + "</p>" +
      '<p>Your locale: ' + currentLocale.toUpperCase() + ' · Your timezone: ' + tz + '</p>' +
      '<table class="tz-table">' +
        '<thead><tr>' +
          '<th>' + t("tzconverter.region") + '</th>' +
          '<th>Region name</th>' +
          '<th>16:00 local → your TZ</th>' +
          '<th>19:00 local → your TZ</th>' +
          '<th>' + t("tzconverter.watchability") + '</th>' +
        "</tr></thead>" +
        '<tbody>' + bodyRows + "</tbody>" +
      "</table>" +
      '<div class="tz-table-foot">' + foot + "</div>" +
    "</div>";
}

// ---- tab navigation ----
function switchTab(tabId) {
  Object.keys(rendered).forEach(function(k) {
    var el = document.getElementById("section-" + k);
    if (el) el.classList.remove("active");
  });
  var target = document.getElementById("section-" + tabId);
  if (target) target.classList.add("active");
  document.querySelectorAll(".tab-bar .tab").forEach(function(t) {
    t.classList.toggle("active", t.getAttribute("data-tab") === tabId);
  });
  window.scrollTo(0, 0);
}

// ---- club list ----
function renderClubs() {
  var container = document.getElementById("clubs-section");
  if (!container) return;
  var clubList = data.clubs || [];
  var pubNote18 = pubWatchability(toUserTime("18:00", cachedTZ));

  var rows = clubList.map(function(club) {
    var provinceName = localeProvinceDisplay(club.province);
    return "<tr>" +
      '<td class="club-name">' + club.name + "</td>" +
      '<td class="club-province">' + provinceName + "</td>" +
      '<td class="club-tier">' + club.tier + "</td>" +
    "</tr>";
  }).join("");

  container.innerHTML =
    '<h2>' + t("section.clubs.title") + "</h2>" +
    '<p class="section-intro">' + t("section.clubs.intro") + "</p>" +
    (clubList.length ? "" : '<p class="clubs-empty">' + t("clubs.none") + "</p>") +
    '<table class="club-table">' +
      '<thead><tr><th>' + t("team.home") + '</th><th>Province</th><th>Tier</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    "</table>" +
    '<div class="club-pub-note">' +
      t("home.pub.p1").replace(/18:00/, pubNote18) +
    "</div>";
}

// ---- tournaments list ----
function renderTournaments() {
  var container = document.getElementById("tournaments-section");
  if (!container) return;
  var series = [
    { id: "sixnations", nameKey: "tournament.sixnations" },
    { id: "rwc",       nameKey: "tournament.rwc" },
    { id: "urc",       nameKey: "tournament.urc" },
    { id: "champions", nameKey: "tournament.champions" },
    { id: "challenge", nameKey: "tournament.challenge" }
  ];
  var cells = series.map(function(s) {
    var label = t(s.nameKey);
    var detail = t(s.nameKey + ".detail");
    return '<div class="tournament-cell">' +
             '<h3>' + label + "</h3>" +
             '<p>' + detail + "</p>" +
           "</div>";
  });
  container.innerHTML = '<h2>' + t("section.tournaments.title") + "</h2>" +
    '<p class="section-intro">' + t("section.tournaments.intro") + '</p>' +
    '<div class="tournaments-grid">' + cells.join("") + "</div>";
}

// ---- app header / TOC ----
function renderAppHeader() {
  var container = document.getElementById("app-toc");
  if (!container) return;
  var tabs = [
    { id: "home",        label: t("tab.home") },
    { id: "ireland",     label: t("tab.ireland") },
    { id: "provinces",   label: t("tab.provinces") },
    { id: "clubs",       label: t("tab.clubs"),      noteKey: "section.clubs.intro" },
    { id: "tournaments", label: t("tab.tournaments") },
    { id: "europe",      label: t("tab.europe") },
    { id: "world",       label: t("tab.world") },
    { id: "planning",    label: t("tab.planning") },
    { id: "privacy",     label: t("tab.privacy") }
  ];
  container.innerHTML = tabs.map(function(tab) {
    var extra = tab.noteKey ? "<p class=\"toc-note\">" + t(tab.noteKey) + "</p>" : "";
    return '<button class="toc-item" data-tab="' + tab.id + '">' +
      '<span class="toc-label">' + tab.label + '</span>' + extra + "</button>";
  }).join("");
}

// ---- rebuild home "what we cover" list ----
function rebuildHomeWhat() {
  var whatList = document.getElementById("what-list");
  if (!whatList) return;
  var items = [
    "<li>" + t("home.what.ireland") + "</li>",
    "<li>" + t("home.what.provinces") + "</li>",
    "<li>" + t("home.what.clubs") + "</li>",
    "<li>" + t("home.what.tournaments") + "</li>",
    "<li>" + t("home.what.europe") + "</li>",
    "<li>" + t("home.what.world") + "</li>",
    "<li>" + t("home.what.planning") + "</li>"
  ];
  whatList.innerHTML = items.join("");
}

// ---- consent section ----
function renderConsent() {
  var container = document.getElementById("consent-section");
  if (!container) return;
  var denied = localStorage.getItem("rw-pub") === "denied";
  var accepted = localStorage.getItem("rw-pub") === "accepted";
  container.innerHTML =
    '<div class="consent-section' + (denied ? " consent-denied" : (accepted ? " consent-accepted" : " consent-pending")) + '">' +
      '<h2>' + t("consent.title") + "</h2>" +
      '<p class="section-intro">' + t("consent.intro") + "</p>" +
      '<div class="consent-options">' +
        '<button class="consent-btn" id="consent-accept">' +
          '<span class="consent-btn-label">' + t("consent.accept") + '</span>' +
          '<span class="consent-btn-desc">' + t("consent.accept.desc") + '</span>' +
        "</button>" +
        '<button class="consent-btn" id="consent-reject">' +
          '<span class="consent-btn-label">' + t("consent.reject") + '</span>' +
          '<span class="consent-btn-desc">' + t("consent.reject.desc") + '</span>' +
        "</button>" +
      "</div>" +
      (denied
        ? '<div class="consent-status"><span class="consent-status-icon">✕</span> ' + t("consent.rejected") + '<br><span class="consent-status-desc">' + t("consent.rejected.desc") + '</span></div>'
        : (accepted
          ? '<div class="consent-status"><span class="consent-status-icon">✓</span> ' + t("consent.accepted") + '<br><span class="consent-status-desc">' + t("consent.accepted.desc") + '</span></div>'
          : "")) +
      '<button class="consent-change-btn" id="consent-change" style="display:' + (denied || accepted ? "inline-block" : "none") + '\">' + t("consent.change") + "</button>" +
    "</div>";

  var acceptBtn = document.getElementById("consent-accept");
  if (acceptBtn) acceptBtn.addEventListener("click", function() {
    localStorage.setItem("rw-pub", "accepted");
    renderConsent();
    applyPubDenialState();
  });
  var rejectBtn = document.getElementById("consent-reject");
  if (rejectBtn) rejectBtn.addEventListener("click", function() {
    localStorage.setItem("rw-pub", "denied");
    renderConsent();
    applyPubDenialState();
  });
  var changeBtn = document.getElementById("consent-change");
  if (changeBtn) changeBtn.addEventListener("click", function() { renderConsent(); });
}

// ---- data note ----
function renderDataNote() {
  var container = document.getElementById("data-note");
  if (!container) return;
  container.innerHTML =
    '<div class="data-note">' +
      '<h3>' + t("home.datanote.h3") + "</h3>" +
      '<p>' + t("home.datanote.p") + "</p>" +
    "</div>";
}

// ---- privacy section ----
function renderPrivacy() {
  var container = document.getElementById("privacy-section");
  if (!container) return;
  container.innerHTML =
    '<div class="privacy-section">' +
      '<h2>' + t("section.privacy.title") + "</h2>" +
      '<p class="section-intro">' + t("section.privacy.intro") + "</p>" +
      '<div class="privacy-links"><a href="/www/privacy.html" class="privacy-link">' + t("section.privacy.title") + '</a></div>' +
    "</div>";
}

// ---- planning section ----
function renderPlanning() {
  var container = document.getElementById("planning-section");
  if (!container) return;
  var people = [];
  try {
    var raw = localStorage.getItem("rw-planning");
    if (raw) people = JSON.parse(raw);
  } catch(e) { people = []; }

  var items = people.map(function(p, idx) {
    return '<div class="planning-row">' +
      '<div class="planning-name">' + (p.name || "???") + "</div>" +
      '<div class="planning-sixnations">' + (p.sixnations || "") + ' <span class="planning-tag">' + t("planning.field.sixnations") + '</span></div>' +
      '<div class="planning-rwc">' + (p.rwc || "") + ' <span class="planning-tag">' + t("planning.field.rwc") + '</span></div>' +
      '<div class="planning-notes">' + (p.notes || "") + ' <span class="planning-tag">' + t("planning.field.notes") + '</span></div>' +
      '<button class="planning-remove" data-idx="' + idx + '">✕</button>' +
    "</div>";
  }).join("");

  var emptyMsg = "<p class=\"planning-empty\">" + t("planning.empty") + "</p>";

  container.innerHTML =
    '<div class="planning-section">' +
      '<h2>' + t("section.planning.title") + "</h2>" +
      '<p class="section-intro">' + t("section.planning.intro") + "</p>" +
      '<form id="planning-form" class="planning-form">' +
        '<div class="planning-row planning-add-row">' +
          '<input class="planning-input" name="name" placeholder="' + t("planning.field.name.ph") + '">' +
          '<input class="planning-input" name="sixnations" placeholder="' + t("planning.field.sixnations.ph") + '">' +
          '<input class="planning-input" name="rwc" placeholder="' + t("planning.field.rwc.ph") + '">' +
          '<input class="planning-input" name="notes" placeholder="' + t("planning.field.notes.ph") + '">' +
          '<button class="planning-add-btn" type="submit">+ ' + t("planning.field.name") + "</button>" +
        "</div>" +
      "</form>" +
      (people.length ? "<div class=\"planning-list\">" + items + "</div>" : emptyMsg) +
      '<button class="planning-clear-btn" id="planning-clear" style="display:' + (people.length ? "inline-block" : "none") + '">Clear all</button>' +
    "</div>";

  var form = document.getElementById("planning-form");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      var fd = new FormData(form);
      var name = fd.get("name");
      var sixnations = fd.get("sixnations");
      var rwc = fd.get("rwc");
      var notes = fd.get("notes");
      if (!name || !name.trim()) return;
      people.push({ name: name.trim(), sixnations: sixnations.trim(), rwc: rwc.trim(), notes: notes.trim() });
      try { localStorage.setItem("rw-planning", JSON.stringify(people)); } catch(e) {}
      renderPlanning();
    });
  }
  var clearBtn = document.getElementById("planning-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function() {
      if (!confirm(t("planning.clear.confirm"))) return;
      people = [];
      try { localStorage.setItem("rw-planning", JSON.stringify(people)); } catch(e) {}
      renderPlanning();
    });
  }
  document.querySelectorAll(".planning-remove").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var idx = parseInt(btn.getAttribute("data-idx"), 10);
      if (isNaN(idx)) return;
      people.splice(idx, 1);
      try { localStorage.setItem("rw-planning", JSON.stringify(people)); } catch(e) {}
      renderPlanning();
    });
  });
}

// ---- pub denial state ----
function applyPubDenialState() {
  var denied = localStorage.getItem("rw-pub") === "denied";
  document.querySelectorAll(".pub-banner, .pub-banner-anchored").forEach(function(el) {
    el.style.display = denied ? "none" : "";
  });
  document.querySelectorAll(".home-pub-note, .pub-note-inline").forEach(function(el) {
    if (denied) { el.style.opacity = "0.4"; el.title = "Ad/monetisation restricted by user consent"; }
    else { el.style.opacity = ""; el.title = ""; }
  });
  var adBanner = document.getElementById("ad-mobile-banner");
  if (adBanner) adBanner.style.display = denied ? "none" : "";
  var interstitial = document.getElementById("ad-interstitial-slot");
  if (interstitial) interstitial.style.display = denied ? "none" : "";
}

// ---- detect pub consent from localStorage ----
function detectPubOption() {
  try {
    if (localStorage.getItem("rw-pub") === "denied") {
      document.querySelectorAll(".pub-banner").forEach(function(el) { el.style.display = "none"; });
    }
  } catch(e) {}
}

// ---- main setup ----
function setup() {
  detectLocale();
  detectPubOption();
  var knewLocale = localStorage.getItem("rw-locale");
  if (knewLocale && data.locales[knewLocale]) setLocale(knewLocale);

  var sel = document.getElementById("locale-selector");
  if (sel) {
    sel.value = currentLocale;
    sel.addEventListener("change", function(e) {
      setLocale(e.target.value);
      renderWorldTeams();
      renderTimezoneConverter();
      rebuildHomeWhat();
      renderClubs();
      renderTournaments();
      renderLocaleIndicator();
      renderAppHeader();
      renderConsent();
      renderPlanning();
      renderDataNote();
      renderPrivacy();
    });
  }

  renderLocaleIndicator();
  renderAppHeader();
  if (!rendered["home"]) renderHome();
  if (!rendered["world"]) renderWorldTeams();
  if (!rendered["tz"]) renderTimezoneConverter();
  if (!rendered["clubs"]) renderClubs();
  if (!rendered["tournaments"]) renderTournaments();
  if (!rendered["consent"]) renderConsent();
  if (!rendered["planning"]) renderPlanning();
  if (!rendered["data-note"]) renderDataNote();
  if (!rendered["privacy"]) renderPrivacy();
  rebuildHomeWhat();
}

// ---- tab click handlers ----
function bindTabs() {
  document.querySelectorAll(".tab-bar .tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      var tabId = tab.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
    });
  });
  document.querySelectorAll(".toc-item").forEach(function(item) {
    item.addEventListener("click", function() {
      var tabId = item.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
    });
  });
}

// ---- Flappy Rugby (silly mini-game) ----
function flappyInit() {
  var canvas = document.getElementById("flappy-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  var overlay = document.getElementById("flappy-overlay");
  var gameover = document.getElementById("flappy-gameover");
  var scoreEl = document.getElementById("flappy-score");
  var startBtn = document.getElementById("flappy-start");
  var restartBtn = document.getElementById("flappy-restart");

  var state = "idle";
  var bird = { x: 60, y: H / 2, r: 14, vy: 0, rot: 0 };
  var g = 0.45;
  var flapV = -7.2;
  var pipes = [];
  var pipeGap = 130;
  var pipeWidth = 38;
  var pipeSpeed = 2.6;
  var spawnInterval = 95;
  var frame = 0;
  var score = 0;
  var highScore = 0;
  try { highScore = parseInt(localStorage.getItem("rw-flappy-high"), 10) || 0; } catch(e) {}
  var deaths = 0;
  var maxDeaths = 3;
  var wingFlap = 0;

  var BODY = "#16722e";
  var BODY_DARK = "#0f5a1f";
  var BALL_WHITE = "#f5f5f0";
  var POST_RED = "#c0392b";
  var POST_WHITE = "#ffffff";
  var SKY_TOP = "#87CEEB";
  var SKY_BOT = "#cce6f0";
  var GROUND = "#6b8e4e";

  function reset() {
    bird.y = H / 2;
    bird.vy = 0;
    bird.rot = 0;
    pipes = [];
    frame = 0;
    score = 0;
    deaths = 0;
    state = "playing";
    overlay.style.display = "none";
    gameover.style.display = "none";
    if (scoreEl) scoreEl.textContent = "Score: 0";
  }

  function flap() {
    if (state !== "playing") return;
    bird.vy = flapV;
    wingFlap = 0;
  }

  function drawBall(cx, cy, r, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.35, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = BODY;
    ctx.fill();
    ctx.strokeStyle = BODY_DARK;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = BALL_WHITE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, 0);
    ctx.quadraticCurveTo(0, -r * 0.6, r * 1.2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, 0);
    ctx.quadraticCurveTo(0, r * 0.6, r * 1.2, 0);
    ctx.stroke();

    var wingUp = Math.sin(wingFlap * 0.4) * 0.45 + 0.5;
    ctx.fillStyle = "#e8a030";
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.3);
    ctx.quadraticCurveTo(-r * 1.7, -r * 0.8 - wingUp * r * 0.5, -r * 1.1, -r * 0.1);
    ctx.quadraticCurveTo(-r * 1.5, r * 0.1, -r * 0.5, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#b87810";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.3);
    ctx.quadraticCurveTo(r * 1.7, -r * 0.8 - wingUp * r * 0.5, r * 1.1, -r * 0.1);
    ctx.quadraticCurveTo(r * 1.5, r * 0.1, r * 0.5, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.25, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.3, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e8a030";
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.15);
    ctx.lineTo(r * 1.0, -r * 0.05);
    ctx.lineTo(r * 0.7, r * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawPipe(topH) {
    var px = W - pipeWidth;
    ctx.fillStyle = BODY;
    ctx.fillRect(px, 0, pipeWidth, topH);
    ctx.strokeStyle = BODY_DARK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, 0, pipeWidth, topH);
    ctx.fillStyle = POST_WHITE;
    ctx.fillRect(px - 2, topH - 10, pipeWidth + 4, 6);

    var botY = topH + pipeGap;
    var botH = H - botY;
    ctx.fillStyle = BODY;
    ctx.fillRect(px, botY, pipeWidth, botH);
    ctx.strokeStyle = BODY_DARK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, botY, pipeWidth, botH);
    ctx.fillStyle = POST_WHITE;
    ctx.fillRect(px - 2, botY, pipeWidth + 4, 6);

    ctx.fillStyle = POST_RED;
    ctx.fillRect(px + pipeWidth - 6, 0, 6, 14);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + pipeWidth - 4, 3, 2, 6);
  }

  function drawBackground() {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(1, SKY_BOT);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (var i = 0; i < 3; i++) {
      var cx = (i * 130 + frame * 0.2) % (W + 100) - 50;
      var cy = 40 + i * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 30, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 20, cy + 5, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = GROUND;
    ctx.fillRect(0, H - 20, W, 20);
    ctx.strokeStyle = "#4a6b30";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H - 20);
    ctx.lineTo(W, H - 20);
    ctx.stroke();
    ctx.strokeStyle = "#3a5a20";
    for (var i = 0; i < 12; i++) {
      var gx = i * 30 + (frame * 0.5) % 30;
      ctx.beginPath();
      ctx.moveTo(gx, H - 20);
      ctx.lineTo(gx - 3, H - 26);
      ctx.moveTo(gx + 5, H - 20);
      ctx.lineTo(gx + 8, H - 27);
      ctx.stroke();
    }
  }

  function drawPosts() {
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 3;
    var postX = W - 80;
    ctx.beginPath();
    ctx.moveTo(postX, 20); ctx.lineTo(postX, 70);
    ctx.moveTo(postX - 15, 20); ctx.lineTo(postX + 15, 20);
    ctx.stroke();
    postX = W - 160;
    ctx.beginPath();
    ctx.moveTo(postX, 15); ctx.lineTo(postX, 65);
    ctx.moveTo(postX - 12, 15); ctx.lineTo(postX + 12, 15);
    ctx.stroke();
  }

  function draw() {
    drawBackground();
    drawPosts();
    pipes.forEach(function(p) { drawPipe(p.topH); });
    wingFlap++;
    drawBall(bird.x, bird.y, bird.r, bird.rot);

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Score: " + score, W / 2, 20);

    for (var i = 0; i < maxDeaths; i++) {
      ctx.fillStyle = i < deaths ? "#c0392b" : "#888";
      ctx.beginPath();
      ctx.arc(16 + i * 22, 15, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function update() {
    if (state !== "playing") return;
    frame++;
    bird.vy += g;
    bird.y += bird.vy;
    bird.rot += bird.vy * 0.04;
    bird.rot = Math.max(-0.5, Math.min(1.2, bird.rot));

    if (frame % spawnInterval === 0) {
      var minTop = 40;
      var maxTop = H - pipeGap - 60;
      var topH = minTop + Math.random() * (maxTop - minTop);
      pipes.push({ x: W, topH: topH, scored: false });
    }

    pipes.forEach(function(p) { p.x -= pipeSpeed; });
    pipes = pipes.filter(function(p) { return p.x + pipeWidth > -10; });

    var hit = false;
    if (bird.y + bird.r > H - 20 || bird.y - bird.r < 0) hit = true;

    pipes.forEach(function(p) {
      var bx = bird.x, by = bird.y, br = bird.r;
      var px = p.x, pw = pipeWidth;
      var topH = p.topH;
      var botY = topH + pipeGap;
      if (bx + br > px && bx - br < px + pw) {
        if (by - br < topH) hit = true;
        if (by + br > botY) hit = true;
      }
      if (!p.scored && p.x + pw < bx - br) {
        p.scored = true;
        score++;
        if (scoreEl) scoreEl.textContent = "Score: " + score;
      }
    });

    if (hit) {
      deaths++;
      if (deaths >= maxDeaths) {
        state = "over";
        if (score > highScore) {
          highScore = score;
          try { localStorage.setItem("rw-flappy-high", String(highScore)); } catch(e) {}
        }
        if (scoreEl) scoreEl.textContent = "Score: " + score + " (best: " + highScore + ")";
        overlay.style.display = "none";
        gameover.style.display = "block";
      } else {
        bird.y = H / 2;
        bird.vy = 0;
        bird.rot = 0;
      }
    }
  }

  function loop() {
    if (state === "playing") update();
    draw();
    requestAnimationFrame(loop);
  }

  function onFlap(e) {
    if (e) e.preventDefault();
    if (state === "idle" || state === "over") { reset(); return; }
    flap();
  }
  canvas.addEventListener("mousedown", onFlap);
  canvas.addEventListener("touchstart", onFlap, { passive: false });
  document.addEventListener("keydown", function(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      onFlap();
    }
  });
  if (startBtn) startBtn.addEventListener("click", function(e) { e.preventDefault(); reset(); });
  if (restartBtn) restartBtn.addEventListener("click", function(e) { e.preventDefault(); reset(); });

  state = "idle";
  loop();
}

// ---- boot ----
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function() {
    setup();
    flappyInit();
    document.addEventListener("visibilitychange", function() {
      if (!document.hidden) {
        detectLocale();
        renderLocaleIndicator();
        renderWorldTeams();
        renderTimezoneConverter();
        rebuildHomeWhat();
      }
    });
  });
}

// Expose helpers for tests
module.exports = {
  renderAll: setup,
  switchTab: switchTab,
  setLocale: setLocale,
  currentLocale: function() { return currentLocale; },
  currentDict: function() { return currentDict; },
  applyPubDenialState: applyPubDenialState,
  detectLocale: detectLocale,
  detectPubOption: detectPubOption,
  toUserTime: toUserTime,
  toUserTimeSlot: toUserTimeSlot,
  pubWatchability: pubWatchability,
  localeFlag: localeFlag,
  buildTimeZoneTable: null,
  pubWatchabilityForLabel: null
};

// Boot the server when run directly
if (require.main === module) {
  bootServer();
}
