/**
 * Rugby Watch — app.js
 * Drives the worldwide Irish rugby web app.
 * - Builds team/tournament/club lists from data.json
 * - Locale-aware time conversion and pub watchability
 * - GDPR consent for ads
 * - Group planning grid (localStorage)
 * - AdMob placeholders
 * - World teams and tournaments
 */

(function () {
  'use strict';

  const TABS = document.querySelectorAll('.tab');
  const SECTIONS = {
    home: document.getElementById('section-home'),
    ireland: document.getElementById('section-ireland'),
    provinces: document.getElementById('section-provinces'),
    clubs: document.getElementById('section-clubs'),
    tournaments: document.getElementById('section-tournaments'),
    europe: document.getElementById('section-europe'),
    world: document.getElementById('section-world'),
    planning: document.getElementById('section-planning'),
    privacy: document.getElementById('section-privacy'),
  };

  // ── Tab switching ───────────────────────────────────────
  function switchTab(tabId) {
    TABS.forEach(t => {
      const isActive = t.dataset.tab === tabId;
      t.classList.toggle('active', isActive);
    });
    Object.entries(SECTIONS).forEach(([id, el]) => {
      if (el) el.classList.toggle('active', id === tabId);
    });
  }

  TABS.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ── Load data ───────────────────────────────────────────
  const DATA = {};

  function loadData() {
    if (Object.keys(DATA).length > 0) return Promise.resolve(DATA);
    return fetch('/js/data.json')
      .then(r => r.json())
      .then(json => {
        Object.assign(DATA, json);
        return json;
      })
      .catch(() => {
        console.warn('data.json fetch failed, using inline fallback');
        return inlineFallback();
      });
  }

  function inlineFallback() {
    return {
      teams: {
        'ireland-mens': { name: "Ireland Men's Senior", short: 'Ireland Men', group: 'Ireland National Teams', competitions: ['Six Nations','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'Aviva Stadium, Dublin', pubNote: 'Ireland home games at Aviva are pub-friendly. Away Six Nations games kick off midday–evening Irish time.', featured: true },
        'ireland-womens': { name: "Ireland Women's Senior", short: 'Ireland Women', group: 'Ireland National Teams', competitions: ["Women's Six Nations","Women's Rugby World Cup"], homeStadium: 'Various', pubNote: "Women's Six Nations kick off midday–evening Irish time.", featured: true },
        'ireland-u20-mens': { name: 'Ireland U20 Men', short: 'Ireland U20 Men', group: 'Ireland National Teams', competitions: ['U20 Six Nations'], homeStadium: 'Various', pubNote: 'U20 Six Nations kick off midday–evening Irish time.', featured: true },
        'ireland-sevens': { name: 'Ireland Sevens', short: 'Ireland Sevens', group: 'Ireland National Teams', competitions: ['Sevens World Series','Sevens World Cup'], homeStadium: 'Various', pubNote: 'Dublin Sevens is pub-friendly. Away stops in Europe are morning Irish time.', featured: true },
        'south-africa-mens': { name: "South Africa Men's Senior", short: 'South Africa', group: 'World National Teams', union: 'SARU', competitions: ['Rugby Championship','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'Green and Gold', pubNote: 'Springboks play in the Rugby Championship — evening local kick-offs are morning Irish time.', featured: false },
        'new-zealand-mens': { name: "New Zealand Men's Senior", short: 'New Zealand', group: 'World National Teams', union: 'NZR', competitions: ['Rugby Championship','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'All Blacks (Black)', pubNote: 'All Blacks play in the Rugby Championship — evening local kick-offs are morning Irish time.', featured: false },
        'australia-mens': { name: "Australia Men's Senior", short: 'Australia', group: 'World National Teams', union: 'ARU', competitions: ['Rugby Championship','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'Green and Gold', pubNote: 'Wallabies play in the Rugby Championship — evening local (east coast) = morning Irish time.', featured: false },
        'argentina-mens': { name: "Argentina Men's Senior", short: 'Argentina', group: 'World National Teams', union: 'UAR', competitions: ['Rugby Championship','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'White with blue (Los Pumas)', pubNote: 'Los Pumas play in the Rugby Championship — evening local = early morning Irish time.', featured: false },
        'france-mens': { name: "France Men's Senior", short: 'France', group: 'World National Teams', union: 'FFR', competitions: ['Six Nations','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'Blue, white, red', pubNote: 'France in Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).', featured: false },
        'england-mens': { name: "England Men's Senior", short: 'England', group: 'World National Teams', union: 'RFU', competitions: ['Six Nations','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'White', pubNote: 'England in Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).', featured: false },
        'scotland-mens': { name: "Scotland Men's Senior", short: 'Scotland', group: 'World National Teams', union: 'SRU', competitions: ['Six Nations','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'Blue', pubNote: 'Scotland in Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).', featured: false },
        'wales-mens': { name: "Wales Men's Senior", short: 'Wales', group: 'World National Teams', union: 'WRU', competitions: ['Six Nations','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'Red', pubNote: 'Wales in Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).', featured: false },
        'italy-mens': { name: "Italy Men's Senior", short: 'Italy', group: 'World National Teams', union: 'FIR', competitions: ['Six Nations','Autumn Internationals','Summer Tour','Rugby World Cup'], homeStadium: 'various', jersey: 'Blue (Azzurri)', pubNote: 'Italy in Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).', featured: false },
        'japan-mens': { name: "Japan Men's Senior", short: 'Australia', group: 'World National Teams', union: 'Japan rugby-football union', competitions: ['Japan rugby league','Autumn Internationals','Rugby World Cup'], homeStadium: 'various', jersey: 'Red', pubNote: 'Japan is 8–9 hours ahead of Ireland — morning Irish time for evening local kick-offs.', featured: false },
        'georgia-mens': { name: "Georgia Men's Senior", short: 'Georgia', group: 'World National Teams', union: 'Georgia rugby union', competitions: ['Rugby Europe Championship','Autumn Internationals','Rugby World Cup'], homeStadium: 'various', jersey: 'White with red', pubNote: 'Georgia is 2–3 hours ahead of Ireland — morning Irish time for evening local kick-offs.', featured: false },
        'fiji-mens': { name: "Fiji Men's Senior", short: 'Fiji', group: 'World National Teams', union: 'RFC', competitions: ['Pacific Nations Cup','Autumn Internationals','Rugby World Cup','Sevens World Series'], homeStadium: 'various', jersey: 'White with black', pubNote: 'Fiji is 10–12 hours ahead of Ireland — early morning Irish time for evening local kick-offs.', featured: false },
        'samoa-mens': { name: "Samoa Men's Senior", short: 'Samoa', group: 'World National Teams', union: 'SRU', competitions: ['Pacific Nations Cup','Autumn Internationals','Rugby World Cup','Sevens World Series'], homeStadium: 'various', jersey: 'Red with blue', pubNote: 'Samoa is 10–12 hours ahead of Ireland — early morning Irish time for evening local kick-offs.', featured: false },
        'tonga-mens': { name: "Tonga Men's Senior", short: 'Tonga', group: 'World National Teams', union: 'Tonga rugby union', competitions: ['Pacific Nations Cup','Autumn Internationals','Rugby World Cup','Sevens World Series'], homeStadium: 'various', jersey: 'Red with white', pubNote: 'Tonga is 10–12 hours ahead of Ireland — early morning Irish time for evening local kick-offs.', featured: false },
        'england-womens': { name: "England Women's Senior", short: 'England Women', group: "World Women's Teams", union: 'RFU', competitions: ["Women's Six Nations","Women's Rugby World Cup"], homeStadium: 'various', jersey: 'White', pubNote: "England Women in Women's Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).", featured: false },
        'france-womens': { name: "France Women's Senior", short: 'France Women', group: "World Women's Teams", union: 'FFR', competitions: ["Women's Six Nations","Women's Rugby World Cup"], homeStadium: 'various', jersey: 'Blue', pubNote: "France Women in Women's Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).", featured: false },
        'scotland-womens': { name: "Scotland Women's Senior", short: 'Scotland Women', group: "World Women's Teams", union: 'SRU', competitions: ["Women's Six Nations","Women's Rugby World Cup"], homeStadium: 'various', jersey: 'Blue', pubNote: "Scotland Women in Women's Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).", featured: false },
        'wales-womens': { name: "Wales Women's Senior", short: 'Wales Women', group: "World Women's Teams", union: 'WRU', competitions: ["Women's Six Nations","Women's Rugby World Cup"], homeStadium: 'various', jersey: 'Red', pubNote: "Wales Women in Women's Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).", featured: false },
        'italy-womens': { name: "Italy Women's Senior", short: 'Italy Women', group: "World Women's Teams", union: 'FIR', competitions: ["Women's Six Nations","Women's Rugby World Cup"], homeStadium: 'various', jersey: 'Blue', pubNote: "Italy Women in Women's Six Nations — away games in Ireland kick off midday–evening Irish time (pub-friendly).", featured: false },
        'new-zealand-womens': { name: "New Zealand Women's Senior", short: 'New Zealand Women', group: "World Women's Teams", union: 'NZR', competitions: ["Women's Rugby World Cup","Women's Pacific Nations Cup"], homeStadium: 'various', jersey: 'Black (Black Ferns)', pubNote: 'Black Ferns — evening local kick-offs are morning Irish time.', featured: false },
        'australia-womens': { name: "Australia Women's Senior", short: 'Australia Women', group: "World Women's Teams", union: 'ARU', competitions: ["Women's Rugby World Cup","Women's Pacific Nations Cup"], homeStadium: 'various', jersey: 'Green and Gold (Wallaroos)', pubNote: 'Wallaroos — evening local (east coast) = morning Irish time.', featured: false },
        'south-africa-womens': { name: "South Africa Women's Senior", short: 'South Africa Women', group: "World Women's Teams", union: 'SARU', competitions: ["Women's Rugby World Cup","Women's Pacific Nations Cup"], homeStadium: 'various', jersey: 'Green and Gold (Springbok Women)', pubNote: 'Springbok Women — evening local kick-offs are morning Irish time.', featured: false },
        'argentina-womens': { name: "Argentina Women's Senior", short: 'Argentina Women', group: "World Women's Teams", union: 'UAR', competitions: ["Women's Rugby World Cup","Women's South American Championship"], homeStadium: 'various', jersey: 'White with blue (Las Pumas)', pubNote: 'Las Pumas — evening local kick-offs are early morning Irish time.', featured: false }
      },
      provinces: {
        'leinster': { name: 'Leinster', short: 'Leinster', group: 'Provinces', competitions: ['United Rugby Championship','European Champions Cup','European Challenge Cup','Leinster Senior Cup'], homeStadium: 'Aviva Stadium, Dublin', pubNote: 'Leinster home games at Aviva are pub-friendly. European away games in France/England/Italy/Scotland/Wales kick off in Irish afternoon — pub-friendly.' },
        'munster': { name: 'Munster', short: 'Munster', group: 'Provinces', competitions: ['United Rugby Championship','European Champions Cup','European Challenge Cup','Munster Senior Cup'], homeStadium: 'Thomond Park, Limerick', pubNote: 'Munster home games at Thomond Park are pub-friendly. European away games kick off in Irish afternoon.' },
        'ulster': { name: 'Ulster', short: 'Ulster', group: 'Provinces', competitions: ['United Rugby Championship','European Champions Cup','European Challenge Cup','Ulster Senior Cup'], homeStadium: 'Kingspan Stadium, Belfast', pubNote: 'Ulster home games at Ravenhill are pub-friendly. European away games kick off in Irish afternoon.' },
        'connacht': { name: 'Connacht', short: 'Connacht', group: 'Provinces', competitions: ['United Rugby Championship','European Champions Cup','European Challenge Cup','Connacht Senior Cup'], homeStadium: 'Atlantic Park, Galway', pubNote: 'Connacht home games at Atlantic Park are pub-friendly. European away games kick off in Irish afternoon.' }
      },
      clubs: [
        { name: "St Mary's College RFC", province: 'Leinster', tier: 'AIL Tier 1' },
        { name: 'Blackrock College RFC', province: 'Leinster', tier: 'AIL Tier 1' },
        { name: 'UCD RFC', province: 'Leinster', tier: 'AIL Tier 1' },
        { name: 'Garryowen RFC', province: 'Munster', tier: 'AIL Tier 1' },
        { name: 'UCC RFC', province: 'Munster', tier: 'AIL Tier 1' },
        { name: 'City of Derry RFC', province: 'Ulster', tier: 'AIL Tier 1' },
        { name: 'Galway Corinthians RFC', province: 'Connacht', tier: 'AIL Tier 1' }
      ],
      tournaments: {
        'six-nations': { name: 'Six Nations', short: 'Six Nations', group: 'Tournaments', teams: ['Ireland','England','France','Italy','Scotland','Wales'], pubNote: 'Away games kick off midday–evening Irish time — pub-friendly. Home games at Aviva are pub-friendly.' },
        'rugby-world-cup': { name: 'Rugby World Cup', short: 'RWC', group: 'Tournaments', pubNote: 'Pool games against Southern Hemisphere touring sides = morning Irish time (watch at home, meet later). Final 2027 Sydney ~9am Irish time.' },
        'urc': { name: 'United Rugby Championship', short: 'URC', group: 'Tournaments', pubNote: 'Most URC games kick off in Irish time. Away games in South Africa/Argentina = early morning Irish time.' },
        'european-champions-cup': { name: 'European Champions Cup', short: 'Champions Cup', group: 'Tournaments', pubNote: 'Away games in Western Europe = morning Irish time — pub-friendly if up early. Final usually evening Irish time.' },
        'european-challenge-cup': { name: 'European Challenge Cup', short: 'Challenge Cup', group: 'Tournaments', pubNote: 'Similar to Champions Cup — morning Irish time for Western Europe away games.' },
        'rugby-championship': { name: 'Rugby Championship', short: 'Rugby Championship', group: 'World Tournaments', teams: ['New Zealand','South Africa','Australia','Argentina'], pubNote: 'Southern Hemisphere tournament — evening local kick-offs are early morning Irish time. Watch at home, meet later.' },
        'pacific-nations-cup': { name: 'Pacific Nations Cup', short: 'Pacific Nations Cup', group: 'World Tournaments', teams: ['Fiji','Samoa','Tonga','Japan'], pubNote: 'Pacific teams — evening local kick-offs are early morning Irish time. Watch at home, meet later.' },
        'rugby-europe-championship': { name: 'Rugby Europe Championship', short: 'Rugby Europe Championship', group: 'World Tournaments', teams: ['Georgia','Romania','Spain','Portugal'], pubNote: 'Eastern European teams — evening local kick-offs are morning Irish time (1–3 hours ahead).' }
      }
    };
  }

  // ── Locale detection ────────────────────────────────────
  let userLocale = 'en-IE';
  let userTimeZone = 'Europe/Dublin';

  function detectLocale() {
    try {
      const lang = navigator.language || navigator.userLanguage || 'en-IE';
      userLocale = lang;

      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz.length > 0) {
        userTimeZone = tz;
      } else {
        userTimeZone = 'Europe/Dublin';
      }
    } catch (e) {
      userLocale = 'en-IE';
      userTimeZone = 'Europe/Dublin';
    }
  }

  // ── Time conversion ─────────────────────────────────────
  function toUserTime(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const parts = formatter.formatToParts(d);
      const hour = parts.find(p => p.type === 'hour')?.value || '12';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      const weekday = parts.find(p => p.type === 'weekday')?.value || '';

      return {
        date: `${month} ${day}`,
        time: `${hour}:${minute} ${dayPeriod}`,
        full: `${weekday} ${month} ${day}, ${hour}:${minute} ${dayPeriod}`,
        hour24: parseInt(hour, 10) + (dayPeriod.toUpperCase() === 'PM' && parseInt(hour, 10) !== 12 ? 12 : 0),
        locale: userLocale,
        timezone: userTimeZone,
      };
    } catch (e) {
      return null;
    }
  }

  function formatUserTime(isoString) {
    return toUserTime(isoString);
  }

  function toIrishTime(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();

    const isDST = isIrishDST(year, day, month);
    const offsetMinutes = isDST ? 60 : 0;
    const irishMs = d.getTime() + (offsetMinutes * 60000);
    const irishDate = new Date(irishMs);

    try {
      const formatter = new Intl.DateTimeFormat('en-IE', {
        timeZone: 'Europe/Dublin',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const parts = formatter.formatToParts(irishDate);
      const hour = parts.find(p => p.type === 'hour')?.value || '12';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';

      return {
        date: irishDate.toISOString().split('T')[0],
        time: `${hour}:${minute} ${dayPeriod}`,
        full: `${irishDate.toISOString().split('T')[0]} ${hour}:${minute} ${dayPeriod}`,
        hour24: parseInt(hour, 10) + (dayPeriod.toUpperCase() === 'PM' && parseInt(hour, 10) !== 12 ? 12 : 0),
      };
    } catch (e) {
      return null;
    }
  }

  function isIrishDST(year, day, month) {
    if (month < 2 || month > 9) return false;
    if (month > 2 && month < 9) return true;

    if (month === 2) {
      const lastDayMarch = new Date(Date.UTC(year, 3, 0));
      const lastSunMarchDay = lastDayMarch.getUTCDay();
      const lastSunMarch = lastDayMarch.getUTCDate() - (lastSunMarchDay === 0 ? 0 : lastSunMarchDay);
      return day >= lastSunMarch;
    }

    if (month === 9) {
      const lastDayOct = new Date(Date.UTC(year, 10, 0));
      const lastSunOctDay = lastDayOct.getUTCDay();
      const lastSunOct = lastDayOct.getUTCDate() - (lastSunOctDay === 0 ? 0 : lastSunOctDay);
      return day <= lastSunOct;
    }

    return false;
  }

  // ── Locale-relative watchability ────────────────────────
  function pubWatchability(userTimeStr) {
    const m = userTimeStr.match(/(\d+):(\d+) (AM|PM)/i);
    if (!m) return { label: 'Check time', tag: 'tag-warn' };

    let hour = parseInt(m[1], 10);
    if (m[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (m[3].toUpperCase() === 'AM' && hour === 12) hour = 0;

    const hour24 = hour;

    if (hour24 >= 11 && hour24 < 23) {
      return { label: 'Pub-friendly', tag: 'tag-yes' };
    } else if (hour24 >= 7 && hour24 < 11) {
      return { label: 'Early — pub if opens early', tag: 'tag-warn' };
    } else {
      return { label: 'Too early — home watch', tag: 'tag-no' };
    }
  }

  function pubWatchabilityIrish(irishTimeStr) {
    const m = irishTimeStr.match(/(\d+):(\d+) (am|pm)/i);
    if (!m) return { label: 'Check time', tag: 'tag-warn' };

    let hour = parseInt(m[1], 10);
    if (m[3].toLowerCase() === 'pm' && hour !== 12) hour += 12;
    if (m[3].toLowerCase() === 'am' && hour === 12) hour = 0;

    if (hour >= 11 && hour < 23) {
      return { label: 'Pub-friendly', tag: 'tag-yes' };
    } else if (hour >= 7 && hour < 11) {
      return { label: 'Early — pub if opens early', tag: 'tag-warn' };
    } else {
      return { label: 'Too early — home watch', tag: 'tag-no' };
    }
  }

  // ── Render locale indicator ─────────────────────────────
  function renderLocaleIndicator() {
    const container = document.getElementById('locale-indicator');
    if (!container) return;

    const lang = userLocale.split('-')[0].toUpperCase();
    const tz = userTimeZone.split('/').pop().replace(/_/g, ' ');

    container.innerHTML = `
      <div class="locale-badge">
        <span class="locale-lang">${lang}</span>
        <span class="locale-sep">·</span>
        <span class="locale-tz">${tz}</span>
      </div>
      <div class="locale-label">Times shown in your local timezone</div>
    `;
  }

  // ── Render timezone converter ───────────────────────────
  function renderTimezoneConverter() {
    const container = document.getElementById('timezone-converter');
    if (!container) return;

    const zones = DATA.worldTimezones?.zones || [];

    let html = `
      <div class="converter-header">
        <h3>Timezone converter</h3>
        <p class="small">Kick-off times are shown in <strong>your local timezone</strong> (${userTimeZone.split('/').pop().replace(/_/g, ' ')}). Use this reference to see how local kick-offs translate to Irish time for pub watchability.</p>
      </div>
      <div class="tz-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Offset vs Irish time</th>
              <th>Pub watchability</th>
            </tr>
          </thead>
          <tbody>
    `;

    zones.forEach(z => {
      const offsetClean = z.offset.replace(/^[/+]/, '');
      let watchability = 'Check time';
      let tagClass = 'tag-warn';

      if (offsetClean.includes('+00') || offsetClean.includes('+01')) {
        watchability = 'Pub-friendly (afternoon/evening)';
        tagClass = 'tag-yes';
      } else if (offsetClean.includes('+02') || offsetClean.includes('+03')) {
        watchability = 'Pub-friendly if up early, or home watch';
        tagClass = 'tag-warn';
      } else if (offsetClean.includes('+04') || offsetClean.includes('+08') || offsetClean.includes('+09')) {
        watchability = 'Early morning Irish — home watch, meet later';
        tagClass = 'tag-no';
      } else if (offsetClean.includes('+12') || offsetClean.includes('+13') || offsetClean.includes('+14')) {
        watchability = 'Early morning Irish — home watch, meet later';
        tagClass = 'tag-no';
      } else if (offsetClean.includes('-03')) {
        watchability = 'Morning Irish — pub if opens early';
        tagClass = 'tag-warn';
      }

      html += `
            <tr>
              <td>${z.region}</td>
              <td>${z.offset}</td>
              <td><span class="tag ${tagClass}">${watchability}</span></td>
            </tr>
          `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <p class="small" style="margin-top:8px;">Your locale: <strong>${userLocale}</strong> · Your timezone: <strong>${userTimeZone}</strong>. Kick-off times in the app are shown in your local time. Pub watchability is assessed relative to your local clock — a 6pm kick-off in your timezone is pub-friendly wherever you are.</p>
    `;

    container.innerHTML = html;
  }

  // ── Render team list ────────────────────────────────────
  function renderIrishTeams() {
    const container = document.getElementById('irish-team-list');
    if (!container) return;
    container.innerHTML = '';

    const groups = ['Ireland National Teams'];
    const teams = DATA.teams || {};

    groups.forEach(groupName => {
      const items = Object.entries(teams)
        .filter(([k, v]) => v.group === groupName)
        .sort((a, b) => a[1].name.localeCompare(b[1].name));

      if (items.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.style.marginBottom = '14px';

      const groupTitle = document.createElement('h3');
      groupTitle.style.margin = '0 0 8px 0';
      groupTitle.style.color = '#16722e';
      groupTitle.style.fontSize = '15px';
      groupTitle.textContent = groupName;
      groupDiv.appendChild(groupTitle);

      items.forEach(([key, team]) => {
        const row = document.createElement('div');
        row.className = team.featured ? 'team-card featured' : 'team-card';
        row.style.background = '#fff';
        row.style.borderRadius = '10px';
        row.style.padding = '10px 12px';
        row.style.marginBottom = '8px';
        row.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        if (team.featured) {
          row.style.borderLeft = '4px solid #16722e';
        }

        const nameEl = document.createElement('div');
        nameEl.style.fontSize = '15px';
        nameEl.style.fontWeight = '600';
        nameEl.style.color = '#16722e';
        nameEl.textContent = team.name;
        if (team.featured) {
          nameEl.innerHTML += ' <span class="badge important">Featured</span>';
        }

        const compEl = document.createElement('div');
        compEl.style.fontSize = '12.5px';
        compEl.style.color = '#666';
        compEl.style.marginBottom = '6px';
        compEl.textContent = team.competitions.join(' · ');

        const homeEl = document.createElement('div');
        homeEl.style.fontSize = '12.5px';
        homeEl.style.color = '#666';
        homeEl.textContent = 'Home: ' + (team.homeStadium || 'Various');

        const pubEl = document.createElement('div');
        pubEl.style.fontSize = '12.5px';
        pubEl.style.color = '#16722e';
        pubEl.style.fontWeight = '500';
        pubEl.style.marginTop = '4px';
        pubEl.textContent = 'Pub watchability: ' + (team.pubNote || 'See tournament notes');

        row.appendChild(nameEl);
        row.appendChild(compEl);
        row.appendChild(homeEl);
        row.appendChild(pubEl);
        groupDiv.appendChild(row);
      });

      container.appendChild(groupDiv);
    });
  }

  // ── Render world teams ──────────────────────────────────
  function renderWorldTeams() {
    const container = document.getElementById('world-team-list');
    if (!container) return;
    container.innerHTML = '';

    const worldGroups = [
      'World National Teams',
      "World Women's Teams",
    ];
    const teams = DATA.teams || {};

    worldGroups.forEach(groupName => {
      const items = Object.entries(teams)
        .filter(([k, v]) => v.group === groupName)
        .sort((a, b) => a[1].name.localeCompare(b[1].name));

      if (items.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.style.marginBottom = '14px';

      const groupTitle = document.createElement('h3');
      groupTitle.style.margin = '0 0 8px 0';
      groupTitle.style.color = '#1f3864';
      groupTitle.style.fontSize = '15px';
      groupTitle.textContent = groupName.replace('World ', '');
      groupDiv.appendChild(groupTitle);

      items.forEach(([key, team]) => {
        const row = document.createElement('div');
        row.className = 'team-card';
        row.style.background = '#fff';
        row.style.borderRadius = '10px';
        row.style.padding = '10px 12px';
        row.style.marginBottom = '8px';
        row.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        row.style.borderLeft = '4px solid #1f3864';

        const nameEl = document.createElement('div');
        nameEl.style.fontSize = '15px';
        nameEl.style.fontWeight = '600';
        nameEl.style.color = '#1f3864';
        nameEl.textContent = team.name;

        if (team.union) {
          const unionEl = document.createElement('div');
          unionEl.style.fontSize = '11.5px';
          unionEl.style.color = '#999';
          unionEl.style.marginBottom = '4px';
          unionEl.textContent = 'Union: ' + team.union;
          row.appendChild(unionEl);
        }

        const compEl = document.createElement('div');
        compEl.style.fontSize = '12.5px';
        compEl.style.color = '#666';
        compEl.style.marginBottom = '6px';
        compEl.textContent = team.competitions.join(' · ');

        const homeEl = document.createElement('div');
        homeEl.style.fontSize = '12.5px';
        homeEl.style.color = '#666';
        homeEl.textContent = 'Home: ' + (team.homeStadium || 'Various');
        if (team.jersey) {
          homeEl.textContent += ' · Jersey: ' + team.jersey;
        }

        const pubEl = document.createElement('div');
        pubEl.style.fontSize = '12.5px';
        pubEl.style.color = '#16722e';
        pubEl.style.fontWeight = '500';
        pubEl.style.marginTop = '4px';
        pubEl.textContent = 'Pub watchability: ' + (team.pubNote || 'See tournament notes');

        row.appendChild(nameEl);
        row.appendChild(compEl);
        row.appendChild(homeEl);
        row.appendChild(pubEl);
        groupDiv.appendChild(row);
      });

      container.appendChild(groupDiv);
    });
  }

  // ── Render provinces ────────────────────────────────────
  function renderProvinces() {
    const container = document.getElementById('province-list');
    if (!container) return;
    container.innerHTML = '';

    const items = Object.entries(DATA.provinces || {})
      .sort((a, b) => a[1].name.localeCompare(b[1].name));

    items.forEach(([key, prov]) => {
      const row = document.createElement('div');
      row.className = 'team-card';
      row.style.background = '#fff';
      row.style.borderRadius = '10px';
      row.style.padding = '10px 12px';
      row.style.marginBottom = '8px';
      row.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';

      const nameEl = document.createElement('div');
      nameEl.style.fontSize = '15px';
      nameEl.style.fontWeight = '600';
      nameEl.style.color = '#16722e';
      nameEl.textContent = prov.name;

      const compEl = document.createElement('div');
      compEl.style.fontSize = '12.5px';
      compEl.style.color = '#666';
      compEl.style.marginBottom = '6px';
      compEl.textContent = prov.competitions.join(' · ');

      const homeEl = document.createElement('div');
      homeEl.style.fontSize = '12.5px';
      homeEl.style.color = '#666';
      homeEl.textContent = 'Home: ' + (prov.homeStadium || 'Various');

      const pubEl = document.createElement('div');
      pubEl.style.fontSize = '12.5px';
      pubEl.style.color = '#16722e';
      pubEl.style.fontWeight = '500';
      pubEl.style.marginTop = '4px';
      pubEl.textContent = 'Pub watchability: ' + (prov.pubNote || 'See tournament notes');

      row.appendChild(nameEl);
      row.appendChild(compEl);
      row.appendChild(homeEl);
      row.appendChild(pubEl);
      container.appendChild(row);
    });
  }

  // ── Render clubs ────────────────────────────────────────
  function renderClubs() {
    const container = document.getElementById('club-list');
    if (!container) return;
    container.innerHTML = '';

    const items = (DATA.clubs || []).sort((a, b) => {
      if (a.province !== b.province) return a.province.localeCompare(b.province);
      return a.name.localeCompare(b.name);
    });

    if (items.length === 0) {
      container.innerHTML = '<p class="small">No clubs loaded.</p>';
      return;
    }

    const ul = document.createElement('ul');
    items.forEach(club => {
      const li = document.createElement('li');
      li.style.fontSize = '13.5px';
      li.style.marginBottom = '4px';
      li.style.listStyle = 'none';
      li.innerHTML = `<strong>${club.name}</strong> <span style="color:#666;">· ${club.province} · ${club.tier}</span>`;
      ul.appendChild(li);
    });
    container.appendChild(ul);

    const search = document.getElementById('club-search');
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        const filtered = items.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.province.toLowerCase().includes(q)
        );
        ul.innerHTML = '';
        if (filtered.length === 0) {
          const li = document.createElement('li');
          li.style.fontSize = '13px';
          li.style.color = '#666';
          li.textContent = 'No clubs matching "' + q + '"';
          ul.appendChild(li);
        } else {
          filtered.forEach(c => {
            const li = document.createElement('li');
            li.style.fontSize = '13.5px';
            li.style.marginBottom = '4px';
            li.style.listStyle = 'none';
            li.innerHTML = `<strong>${c.name}</strong> <span style="color:#666;">· ${c.province} · ${c.tier}</span>`;
            ul.appendChild(li);
          });
        }
      });
    }
  }

  // ── Render tournaments ──────────────────────────────────
  function renderTournaments() {
    const container = document.getElementById('section-tournaments');
    if (!container) return;

    const existing = container.querySelector('.tournament-list');
    if (existing) existing.remove();

    const list = document.createElement('div');
    list.className = 'tournament-list';

    const items = Object.entries(DATA.tournaments || {})
      .sort((a, b) => a[1].name.localeCompare(b[1].name));

    items.forEach(([key, t]) => {
      const card = document.createElement('div');
      card.className = t.group === 'World Tournaments' ? 'card blue' : 'card green';
      card.style.marginBottom = '8px';

      const nameEl = document.createElement('h3');
      nameEl.style.margin = '0 0 4px 0';
      nameEl.style.color = t.group === 'World Tournaments' ? '#1f3864' : '#16722e';
      nameEl.style.fontSize = '15px';
      nameEl.textContent = t.name;

      const shortEl = document.createElement('div');
      shortEl.style.fontSize = '12.5px';
      shortEl.style.color = '#666';
      shortEl.style.marginBottom = '6px';
      shortEl.textContent = (t.short || t.name) + ' · ' + (t.group || 'Tournaments');

      const descEl = document.createElement('p');
      descEl.style.fontSize = '13px';
      descEl.style.margin = '0 0 6px 0';
      if (t.teams) {
        descEl.textContent = 'Teams: ' + (Array.isArray(t.teams) ? t.teams.join(', ') : t.teams);
      } else if (t.season) {
        descEl.textContent = (t.season || '');
      } else {
        descEl.textContent = t.pubNote || '';
      }

      const pubEl = document.createElement('p');
      pubEl.style.fontSize = '13px';
      pubEl.style.color = t.group === 'World Tournaments' ? '#1f3864' : '#16722e';
      pubEl.style.fontWeight = '500';
      pubEl.style.margin = '0';
      pubEl.textContent = 'Pub watchability: ' + (t.pubNote || 'See team notes');

      card.appendChild(nameEl);
      card.appendChild(shortEl);
      card.appendChild(descEl);
      card.appendChild(pubEl);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  // ── GDPR Consent ────────────────────────────────────────
  const CONSENT_KEY = 'rugbywatch_consent';
  let consent = null;

  function loadConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (raw === 'accept' || raw === 'reject') {
        consent = raw;
      }
      return consent;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(val) {
    try {
      localStorage.setItem(CONSENT_KEY, val);
      consent = val;
    } catch (e) { /* ignore */ }
  }

  function renderConsentUI() {
    const box = document.querySelector('.consent-box');
    if (!box) return;

    if (consent === 'accept') {
      box.innerHTML = `
        <h3 style="color:#1f6b1f; margin:0 0 8px 0; font-size:15px;">✓ Non-essential adverts accepted</h3>
        <p style="font-size:13px; margin-bottom:12px;">You've allowed non-essential adverts to support the app. You can change this at any time.</p>
        <button class="btn btn-outline btn-block" id="toggle-consent-btn">Change advert preference</button>
      `;
      const btn = document.getElementById('toggle-consent-btn');
      if (btn) btn.addEventListener('click', () => showConsentDialog());
    } else if (consent === 'reject') {
      box.innerHTML = `
        <h3 style="color:#c00000; margin:0 0 8px 0; font-size:15px;">✕ Non-essential adverts rejected</h3>
        <p style="font-size:13px; margin-bottom:12px;">Non-essential adverts are off. Only essential service adverts, where required by law, will appear. You can change this at any time.</p>
        <button class="btn btn-outline btn-block" id="toggle-consent-btn">Change advert preference</button>
      `;
      const btn = document.getElementById('toggle-consent-btn');
      if (btn) btn.addEventListener('click', () => showConsentDialog());
    } else {
      showConsentDialog();
    }
  }

  function showConsentDialog() {
    const existing = document.querySelector('.consent-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.className = 'consent-dialog';
    dialog.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; top: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000; padding: 20px;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: white; border-radius: 14px; padding: 20px; max-width: 400px; width: 100%;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    `;

    card.innerHTML = `
      <h3 style="color:#16722e; margin:0 0 8px 0; font-size:16px;">Adverts &amp; your privacy</h3>
      <p style="font-size:13.5px; color:#444; margin-bottom:12px;">Rugby Watch is a free app supported by adverts. Before we show you non-essential adverts, you can choose:</p>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
        <label class="consent-opt" style="display:flex; align-items:center; gap:10px; padding:10px; background:white; border:1px solid #bbb; border-radius:8px; cursor:pointer; font-size:13.5px;">
          <input type="radio" name="consent" value="accept" id="accept-opt" style="width:18px; height:18px; accent-color:#16722e;">
          <span><strong>Accept non-essential adverts</strong><br><span style="font-size:12px; color:#666;">Allow personalised/non-essential adverts to support the app</span></span>
        </label>
        <label class="consent-opt" style="display:flex; align-items:center; gap:10px; padding:10px; background:white; border:1px solid #bbb; border-radius:8px; cursor:pointer; font-size:13.5px;">
          <input type="radio" name="consent" value="reject" id="reject-opt" checked style="width:18px; height:18px; accent-color:#16722e;">
          <span><strong>Reject non-essential adverts</strong><br><span style="font-size:12px; color:#666;">Only essential service adverts, where required by law</span></span>
        </label>
      </div>
      <div style="font-size:12px; color:#666; border-top:1px solid #ccc; padding-top:8px; margin-bottom:14px;">
        Your choice is saved on this device only. You can change it in the app at any time.
      </div>
      <button class="btn btn-primary btn-block" id="consent-ok" style="width:100%; padding:12px; font-size:14px;">Save choice</button>
    `;

    dialog.appendChild(card);
    document.body.appendChild(dialog);

    document.getElementById('consent-ok').addEventListener('click', () => {
      const selected = dialog.querySelector('input[name="consent"]:checked');
      if (!selected) {
        alert('Please choose an option.');
        return;
      }
      saveConsent(selected.value);
      dialog.remove();
      renderConsentUI();
      loadAds();
    });
  }

  // ── Ads (placeholder — real AdMob integration) ────────
  function loadAds() {
    if (consent === 'reject') {
      hideAdSlots();
      return;
    }
    showAdPlaceholders();
  }

  function showAdPlaceholders() {
    const existing = document.querySelector('.ad-banner-placeholder');
    if (!existing) {
      const banner = document.createElement('div');
      banner.className = 'ad-banner-placeholder';
      banner.style.cssText = `
        position: fixed; bottom: 0; left: 0; right: 0;
        background: #f0f0f0; border-top: 1px solid #ccc;
        height: 50px; display: flex; align-items: center; justify-content: center;
        font-size: 11px; color: #999; z-index: 50;
      `;
      banner.textContent = 'AdMob banner — placeholder (real AdMob ad loads here)';
      document.body.appendChild(banner);
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (consent === 'accept') {
          showInterstitialPlaceholder();
        }
      });
    });
  }

  function hideAdSlots() {
    const banner = document.querySelector('.ad-banner-placeholder');
    if (banner) banner.remove();
  }

  function showInterstitialPlaceholder() {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      background: #1f3864; color: white; padding: 8px 16px; border-radius: 20px;
      font-size: 12px; opacity: 0.9; z-index: 200;
    `;
    toast.textContent = 'AdMob interstitial — placeholder';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ── Group planning ──────────────────────────────────────
  const PLAN_KEY = 'rugbywatch_plan';
  let plan = [];

  function loadPlan() {
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (raw) {
        plan = JSON.parse(raw);
        if (!Array.isArray(plan)) plan = [];
      }
    } catch (e) { plan = []; }
    return plan;
  }

  function savePlan() {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch (e) { /* ignore */ }
  }

  function renderPlan() {
    const grid = document.getElementById('plan-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (plan.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding:20px; color:#666; font-size:13px; background:#fafafa; border-radius:8px; border:1px dashed #ccc;">
          No one added yet. Tap "+ Add person" to start the list.
        </div>`;
      return;
    }

    plan.forEach((row, i) => {
      const div = document.createElement('div');

      const isWide = window.innerWidth >= 600;
      div.style.display = 'grid';
      div.style.gridTemplateColumns = isWide ? '1fr 1fr 1fr 1fr' : '1fr 1fr';
      div.style.gap = '8px';
      div.style.marginBottom = '8px';
      div.style.alignItems = 'start';

      const fields = [
        { label: 'Name', key: 'name', placeholder: 'Your name' },
        { label: 'Which Ireland games', key: 'sixnations', placeholder: 'e.g. All Ireland games, England & France…' },
        { label: 'RWC interest', key: 'rwc', placeholder: 'e.g. Pool games, final, not interested…' },
        { label: 'Notes', key: 'notes', placeholder: 'Pub preference, travel…' }
      ];

      fields.forEach(f => {
        const label = document.createElement('span');
        label.style.cssText = 'font-size:11px; font-weight:600; color:#666; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:2px; display:block;';
        label.textContent = f.label;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = f.placeholder;
        input.value = row[f.key] || '';
        input.style.cssText = 'width:100%; padding:10px; border:1px solid #bbb; border-radius:8px; font-size:13px; background:white;';
        input.addEventListener('input', () => {
          row[f.key] = input.value;
          savePlan();
        });

        div.appendChild(label);
        div.appendChild(input);
      });

      grid.appendChild(div);
    });
  }

  function addRow() {
    plan.push({ name: '', sixnations: '', rwc: '', notes: '' });
    savePlan();
    renderPlan();

    const rows = document.querySelectorAll('#plan-grid > div');
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const firstInput = lastRow.querySelector('input');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 200);
      }
    }
  }

  function clearAll() {
    if (plan.length === 0) return;
    if (!confirm("Clear everyone from the list? This can't be undone.")) return;
    plan = [];
    savePlan();
    renderPlan();
  }

  // ── Initialize ──────────────────────────────────────────
  function init() {
    detectLocale();
    renderLocaleIndicator();
    renderTimezoneConverter();

    TABS.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    loadData().then(() => {
      renderIrishTeams();
      renderProvinces();
      renderClubs();
      renderTournaments();
      renderWorldTeams();
    });

    loadConsent();
    renderConsentUI();

    if (consent !== 'reject') {
      loadAds();
    }

    loadPlan();
    renderPlan();

    const addBtn = document.getElementById('btn-add-row');
    const clearBtn = document.getElementById('btn-clear');
    if (addBtn) addBtn.addEventListener('click', addRow);
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
