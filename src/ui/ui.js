import { TOWERS, PROGRAMMES, ACTIONS, ECONOMY, IMPACT } from '../sim/catalog.js';
import { TARGET_MODES, SUPPLY_CHAIN_ID } from '../sim/game.js';
import { HOURS } from '../sim/waves.js';
import { ORG_LIST, ORGS } from '../sim/orgs.js';
import { advise } from './advisor.js';
import { ICON, ORG_ART, TOOL_ROLE } from './icons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => `$${Math.round(n)}k`;
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
const DIFF_LABEL = { startup: 'Easy', midcap: 'Medium', enterprise: 'Hard' };
const short = (v, fallback) => (v && v.shortName) || fallback;
const PROG_ORDER = ['scanner', 'scanner2', 'intel', 'discovery', 'soc1', 'soc2', 'mfa', 'backups', 'vetting', 'awareness', 'retainer', 'briefing'];
const TOWER_ORDER = ['ndr', 'ips', 'waf', 'honeytoken', 'wall'];

export class UI {
  constructor(app) {
    this.app = app;
    this.tool = null;
    this.selection = null;
    this.lastLogLen = 0;
    this.advisorOn = true;
    this.lastSaid = null; this.lastSaidAt = -1e9;
    this.buildPalette();
    $('b-pause').onclick = () => app.togglePause();
    for (const b of document.querySelectorAll('#topbar .spd')) b.onclick = () => app.setSpeed(+b.dataset.speed);
    $('b-help').onclick = () => this.showHelp();
    $('b-advisor').onclick = () => { this.advisorOn = !this.advisorOn; $('advisor').classList.toggle('collapsed', !this.advisorOn); $('b-advisor').textContent = this.advisorOn ? 'hide' : 'show'; };
  }

  // ---------- start ----------
  showStart(model) {
    const el = $('start');
    const diffOf = (o) => (o.difficultyLabel || DIFF_LABEL[o.id]).toLowerCase();
    el.innerHTML = `<div class="start-vignette"></div><div class="start-scan"></div><div class="start-wrap">
      <div class="start-head">
        <div class="eyebrow">A Zero Day Clock game · one real day of internet exploitation · ${esc(model.day)}</div>
        <h1 class="title"><span class="t1">Defend</span> <span class="t2">The World</span></h1>
        <p class="tagline">Be the CISO for one day against ${model.totalIps.toLocaleString()} real attacking sources. Your company sets the difficulty.</p>
      </div>
      <div class="org-cards">${ORG_LIST.map((o) => `<button class="org-card diff-${diffOf(o)}" data-org="${o.id}">
          <div class="oc-preview"><div class="oc-art">${ORG_ART[o.id]}</div><img class="oc-img" alt="" /><div class="oc-shade"></div><div class="oc-diff">${esc(o.difficultyLabel || DIFF_LABEL[o.id])}</div></div>
          <div class="oc-body">
            <div class="oc-name">${esc(o.name)}</div>
            <div class="oc-tag">${esc(o.tagline.split(',')[0])}</div>
            <div class="oc-stats"><span title="systems">${ICON.systems}<b>${o.assets.length}</b></span><span title="starting budget">${ICON.budget}<b>$${o.budget}k</b></span><span title="income per hour">${ICON.income}<b>+$${o.income}k/h</b></span></div>
            <div class="oc-go">${ICON.play} Play</div>
          </div>
        </button>`).join('')}</div>
      <div class="start-foot">
        <button class="link" id="s-adv">advanced</button>
        <span id="s-advbox" class="hidden"><label>seed <input id="s-seed" value="${Math.floor(Math.random() * 9000) + 1000}" size="6" /></label> same company + seed = the same day</span>
        <span class="sep">·</span>
        <button class="link" id="s-help">how it works</button>
        <span class="sep">·</span>
        <span class="src">Data: Shadowserver Foundation honeypots, ${esc(model.day)}</span>
      </div>
    </div>`;
    for (const c of el.querySelectorAll('.org-card')) {
      c.onclick = () => {
        const org = c.dataset.org;
        const seedEl = $('s-seed');
        this.app.start({ org, difficulty: ORGS[org].difficulty ?? 1, seed: seedEl ? seedEl.value : String(Math.floor(Math.random() * 9000) + 1000) });
      };
      // Subtle 3D tilt following the cursor.
      c.onmousemove = (e) => { const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; c.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-6px) scale(1.02)`; };
      c.onmouseleave = () => { c.style.transform = ''; };
    }
    $('s-adv').onclick = () => $('s-advbox').classList.toggle('hidden');
    $('s-help').onclick = () => this.showHelp();
    el.classList.remove('hidden');
    this.loadPreviews(el);
  }
  // Real 3D previews of each company's map, if the render layer offers them. Lazy, cached,
  // and silently falls back to the vector illustration.
  loadPreviews(el) {
    if (typeof this.app.renderPreview !== 'function') return;
    this.previews = this.previews || {};
    let delay = 350;
    for (const card of el.querySelectorAll('.org-card')) {
      const org = card.dataset.org; const img = card.querySelector('.oc-img');
      const apply = (url) => { if (!url || !img) return; img.src = url; img.onload = () => card.classList.add('has-preview'); };
      if (this.previews[org]) { apply(this.previews[org]); continue; }
      setTimeout(async () => {
        try {
          const out = this.app.renderPreview(org, 420, 236);
          const url = out && typeof out.then === 'function' ? await out : out;
          if (typeof url === 'string' && url.startsWith('data:')) { this.previews[org] = url; apply(url); }
        } catch { /* keep the illustration */ }
      }, delay);
      delay += 250;
    }
  }

  // Called by the app right after a game is created.
  afterStart() {
    if (ls.get('dtw.tutorialSeen') !== '1') this.showTutorial(true);
  }

  // ---------- tutorial ----------
  showTutorial(firstTime = false) {
    const el = $('tutorial');
    const panels = [
      { t: 'Sources arrive from the uplinks', d: 'Each one walks to the system it is aiming at.', svg: `<svg viewBox="0 0 220 120"><rect x="6" y="20" width="10" height="80" rx="2" fill="#ff5a50" opacity=".6"/><g fill="#8e8e96"><circle cx="40" cy="40" r="5"/><circle cx="70" cy="62" r="5"/><circle cx="100" cy="50" r="5"/></g><path d="M16 45h30M45 45l25 17 30-12 60 0" stroke="#555" stroke-dasharray="4 3" fill="none"/><rect x="170" y="35" width="34" height="30" rx="3" fill="#2a2a30" stroke="#777"/><rect x="176" y="41" width="22" height="4" fill="#d8d8e0"/><rect x="176" y="49" width="22" height="4" fill="#d8d8e0"/></svg>` },
      { t: 'You cannot see what they are', d: 'Grey = unknown. A sensor in range names the exploit.', svg: `<svg viewBox="0 0 220 120"><circle cx="110" cy="70" r="44" fill="#d8d8e0" opacity=".08" stroke="#d8d8e0" stroke-dasharray="4 3"/><path d="M110 70V30" stroke="#d8d8e0"/><path d="M100 32h20" stroke="#d8d8e0" stroke-width="3"/><circle cx="40" cy="60" r="6" fill="#5c5c62"/><circle cx="90" cy="82" r="6" fill="#ff3b30"/><text x="82" y="102" fill="#ff5a50" font-size="9" font-family="JetBrains Mono, monospace">Fortinet FortiOS</text><circle cx="140" cy="60" r="6" fill="#8e8e96"/><text x="130" y="48" fill="#8e8e96" font-size="9" font-family="JetBrains Mono, monospace">not yours</text></svg>` },
      { t: 'Find what is exploitable, then fix it', d: 'Scan. Patch it, or put a WAF (web) or IPS (appliance) in front.', svg: `<svg viewBox="0 0 220 120"><rect x="20" y="40" width="40" height="40" rx="3" fill="#2a2a30" stroke="#ffb547" stroke-width="2"/><text x="24" y="98" fill="#ffb547" font-size="9" font-family="Inter, sans-serif">exploitable</text><path d="M70 60h30" stroke="#777"/><path d="m95 55 6 5-6 5" stroke="#777" fill="none"/><rect x="110" y="40" width="40" height="40" rx="3" fill="#2a2a30" stroke="#63d68a" stroke-width="2"/><path d="m120 60 7 7 14-14" stroke="#63d68a" stroke-width="3" fill="none"/><text x="118" y="98" fill="#63d68a" font-size="9" font-family="Inter, sans-serif">patched</text><path d="M165 80a18 18 0 0 1 36 0z" fill="#ff5a50" opacity=".25" stroke="#ff5a50"/><text x="168" y="98" fill="#ff5a50" font-size="9" font-family="Inter, sans-serif">WAF / IPS</text></svg>` },
      { t: 'Some attacks arrive as trusted updates', d: 'A supply-chain attack lands inside with no attacker walking in. Vet your supply chain.', svg: `<svg viewBox="0 0 220 120"><rect x="20" y="30" width="46" height="34" rx="3" fill="#2a2a30" stroke="#777"/><text x="22" y="76" fill="#8a8a8a" font-size="8" font-family="Inter, sans-serif">vendor update</text><path d="M66 47h52" stroke="#ffb547" stroke-dasharray="4 3"/><path d="m113 42 6 5-6 5" stroke="#ffb547" fill="none"/><rect x="124" y="28" width="40" height="40" rx="3" fill="#2a2a30" stroke="#ff5a50" stroke-width="2"/><rect x="130" y="36" width="28" height="4" fill="#d8d8e0"/><rect x="130" y="44" width="28" height="4" fill="#d8d8e0"/><path d="m132 60 6-6M132 54l6 6" stroke="#ff5a50" stroke-width="2"/><text x="120" y="80" fill="#ff5a50" font-size="8" font-family="Inter, sans-serif">internal system</text><path d="M172 48 200 48" stroke="#63d68a"/><path d="M182 30 200 34v10c0 6-4 10-9 12-5-2-9-6-9-12V34z" fill="#172a1e" stroke="#63d68a"/><path d="m186 41 3 3 6-6" stroke="#63d68a" fill="none"/><text x="168" y="100" fill="#63d68a" font-size="8" font-family="Inter, sans-serif">vetting blocks it</text></svg>` },
      { t: 'Keep business impact under 100', d: 'Compromises cost; so does downtime. The advisor tells you what to do next.', svg: `<svg viewBox="0 0 220 120"><rect x="20" y="50" width="180" height="16" rx="8" fill="#222" stroke="#333"/><rect x="20" y="50" width="70" height="16" rx="8" fill="#ff5a50"/><text x="20" y="42" fill="#8a8a8a" font-size="9" font-family="Inter, sans-serif">BUSINESS IMPACT</text><text x="170" y="42" fill="#ff5a50" font-size="10" font-family="JetBrains Mono, monospace">39 / 100</text><rect x="20" y="78" width="180" height="26" rx="4" fill="#141414" stroke="#333"/><rect x="20" y="78" width="3" height="26" fill="#ffb547"/><text x="30" y="95" fill="#f2f2f2" font-size="9" font-family="Inter, sans-serif">Mail server is exploitable. Patch it now.</text></svg>` },
    ];
    let i = 0;
    const render = () => {
      const p = panels[i];
      el.innerHTML = `<div class="tut">
        <div class="tut-art">${p.svg}</div>
        <div class="tut-step">${panels.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <h2>${esc(p.t)}</h2><p>${esc(p.d)}</p>
        <div class="tut-btns"><button class="link" id="tut-skip">Skip</button><button class="primary" id="tut-next">${i < panels.length - 1 ? 'Next' : 'Got it'}</button></div>
      </div>`;
      $('tut-next').onclick = () => { if (i < panels.length - 1) { i++; render(); } else close(); };
      $('tut-skip').onclick = close;
    };
    const close = () => { el.classList.add('hidden'); ls.set('dtw.tutorialSeen', '1'); if (firstTime) this.app.paused = false; };
    if (firstTime) this.app.paused = true;
    render();
    el.classList.remove('hidden');
  }

  // ---------- end ----------
  showEnd(game) {
    const c = game.scorecard();
    const el = $('end');
    const score = c.score ?? Math.round(((c.hoursSurvived / 24) * 4000 + (100 - c.impact) * 40) * (c.orgMultiplier ?? 1));
    const rank = c.rank ?? (score >= 7000 ? 'Board-ready' : score >= 5000 ? 'Solid operator' : score >= 3000 ? 'Survived' : 'Breached');
    const org = game.org;
    const fmt = (n, d = 0) => (n == null ? '-' : Number(n).toFixed(d));
    el.innerHTML = `<div class="end-wrap">
      <div class="end-top">
        <div class="end-org">${ORG_ART[org.id]}<div><div class="oc-name">${esc(org.name)}</div><div class="oc-diff diff-${(org.difficultyLabel || DIFF_LABEL[org.id]).toLowerCase()}">${esc(org.difficultyLabel || DIFF_LABEL[org.id])}</div></div></div>
        <div class="end-score"><div class="score-n">${score.toLocaleString()}</div><div class="score-l">score</div></div>
        <div class="end-grade"><div class="grade">${c.grade}</div><div class="rank">${esc(rank)}</div></div>
      </div>
      <div class="end-impact"><span>${ICON.impact} business impact</span><div class="bar big"><div class="fill" style="width:${Math.min(100, c.impact)}%"></div></div><b class="mono">${fmt(c.impact, 0)} / 100</b></div>
      <div class="end-stats">
        <div>${ICON.hour}<b>${c.hoursSurvived}</b><span>hours survived</span></div>
        <div>${ICON.skull}<b>${c.compromises}</b><span>compromised</span></div>
        <div>${ICON.blocked}<b>${c.blocked}</b><span>sources blocked</span></div>
        <div>${ICON.patched}<b>${c.patched}</b><span>patches</span></div>
      </div>
      ${(c.supplyEvents || c.supplyBlocked) ? `<div class="end-supply"><span class="chip supply">${ICON.supply} supply chain</span> ${c.supplyBlocked || 0} blocked · ${c.supplyEvents || 0} landed</div>` : ''}
      <div class="end-btns"><button id="e-again" class="primary">Play again</button><button id="e-same">Same company</button><button class="link" id="e-details">details</button></div>
      <div id="e-detailbox" class="hidden end-details">
        <div class="row"><span>seed</span><b class="mono">${game.seed}</b></div>
        <div class="row"><span>spent / available</span><b class="mono">${money(c.spent)} / ${money(c.spent + c.budgetLeft)}</b></div>
        <div class="row"><span>exploits that landed</span><b class="mono">${c.exploitsLanded}</b></div>
        <div class="row"><span>probes against patched or offline systems</span><b class="mono">${c.probesRepelled}</b></div>
        <div class="row"><span>lateral moves stopped</span><b class="mono">${c.lateralBlocked}</b></div>
        <div class="row"><span>caught by honey tokens</span><b class="mono">${c.trapped || 0}</b></div>
        <div class="row"><span>supply-chain events blocked / landed</span><b class="mono">${c.supplyBlocked || 0} / ${c.supplyEvents || 0}</b></div>
        <div class="row"><span>mean time to restore</span><b class="mono">${c.mttrHours == null ? '-' : fmt(c.mttrHours, 1) + ' h'}</b></div>
        <div class="row"><span>mean exposure before patch</span><b class="mono">${c.meanPatchDelayHours == null ? '-' : fmt(c.meanPatchDelayHours, 1) + ' h'}</b></div>
        <div class="row"><span>planned downtime / hours compromised</span><b class="mono">${fmt(c.downtimeHours, 1)} h / ${fmt(c.compromisedHours, 1)} h</b></div>
        <div class="row"><span>lost to traffic</span><b class="mono">$${Math.round(c.trafficCost || 0)}k</b></div>
        ${c.killsByType && Object.keys(c.killsByType).length ? `<div class="row"><span>blocked by</span><b class="mono">${Object.entries(c.killsByType).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')}</b></div>` : ''}
        ${c.stillVulnerable.length ? `<div class="row warn"><span>still exploitable at the end</span><b>${esc(c.stillVulnerable.join(', '))}</b></div>` : ''}
        ${c.undiscovered.length ? `<div class="row"><span>never found</span><b>${esc(c.undiscovered.join(', '))}</b></div>` : ''}
      </div>
    </div>`;
    $('e-again').onclick = () => location.reload();
    $('e-same').onclick = () => { el.classList.add('hidden'); this.app.restart(); };
    $('e-details').onclick = () => $('e-detailbox').classList.toggle('hidden');
    el.classList.remove('hidden');
  }

  // ---------- help ----------
  showHelp() {
    const el = $('help');
    const day = esc(this.app.model.day);
    el.innerHTML = `<div class="panel help">
      <button class="close link" style="float:right">close</button>
      <div class="eyebrow">How it works</div>
      <h1 style="font-size:22px">Defend The World</h1>
      <div class="help-cols">
        <div><h4>${ICON.intel} Data (Shadowserver, ${day})</h4><ul>
          <li>Every vulnerability, vendor and product on the map was in the Shadowserver honeypot feed that day.</li>
          <li>Attackers per vulnerability follow its unique source IPs; toughness is attempts per source.</li>
          <li>Which of your systems can be hit is a match between your product lines and the day's rows.</li>
          <li>CVSS, KEV, ransomware and descriptions come from the Zero Day Clock registry.</li></ul></div>
        <div><h4>${ICON.wall} Game (authored)</h4><ul>
          <li>The hourly ramp, surges and campaign shifts. IP addresses are synthetic.</li>
          <li>Which matching systems are unpatched (seeded), mid-day exploit chains, shadow IT.</li>
          <li>"Assumed EOL" and "no fix until" rules; prices, timings, impact, lateral movement.</li>
          <li>Company choice sets the difficulty; the score is comparable across companies.</li></ul></div>
      </div>
      <div class="help-grid">
        <div>${ICON.ndr}<b>Identify</b><span>Grey sources are unknown. An NDR sensor names them; an IPS on the first hit.</span></div>
        <div>${ICON.honeytoken}<b>Honey tokens</b><span>Fake credentials. The first source to touch one is caught; then it re-arms.</span></div>
        <div>${ICON.supply}<b>Supply chain</b><span>A malicious update lands inside with no attacker walking in. Vetting blocks it.</span></div>
        <div>${ICON.scanner}<b>Scan</b><span>Every system reads "unknown" until the scanner looks at it.</span></div>
        <div>${ICON.patched}<b>Patch</b><span>A change window, offline. Emergency is faster, fails 15-25%.</span></div>
        <div>${ICON.waf}<b>WAF vs IPS</b><span>WAF stops web exploits; IPS stops appliance, VPN and router exploits.</span></div>
        <div>${ICON.lock}<b>Isolate</b><span>$3k ticket, 30 s minimum. The business overrides after two hours.</span></div>
        <div>${ICON.skull}<b>Compromise</b><span>Seeds lateral movement. Cost doubles every hour. Respond, ideally with the patch.</span></div>
        <div>${ICON.engineer}<b>Engineers</b><span>One job at a time each. SOC shifts add engineers.</span></div>
        <div>${ICON.impact}<b>Impact 100</b><span>Ends the day. Downtime costs by revenue; ransomware costs double without backups.</span></div>
      </div>
      <h4>Keys</h4>
      <p style="color:var(--muted);font-size:12px">The strip above the log is your estate: engineers (lit when busy), programmes (an arc while rolling out), equipment per type with levels, system health, and money. Verdicts float over a building whenever a source reaches it: hit, compromised, not exploitable, patched, offline, blocked.</p>
      <p><span class="kbd">1</span>-<span class="kbd">5</span> tools · <span class="kbd">P</span> programmes · <span class="kbd">U</span> upgrade · <span class="kbd">X</span> sell · <span class="kbd">T</span> IPS targeting · <span class="kbd">Esc</span> cancel · <span class="kbd">Space</span> pause · <span class="kbd">Enter</span> start hour · <span class="kbd">+</span>/<span class="kbd">-</span> speed · <span class="kbd">WASD</span> pan · <span class="kbd">Q</span>/<span class="kbd">E</span> rotate · <span class="kbd">R</span>/<span class="kbd">F</span> tilt · wheel zoom</p>
      <div class="legend"><span><i style="background:#5c5c62"></i>unidentified</span><span><i style="background:#8e8e96"></i>not your stack</span><span><i style="background:#d98c85"></i>your product</span><span><i style="background:#ff3b30"></i>can hurt you</span><span><i style="background:#ffb547"></i>exploitable (known)</span></div>
      <div style="margin-top:12px;display:flex;gap:10px"><button id="h-tut">Show tutorial</button><span style="color:var(--muted);font-size:11px;align-self:center">Code and data: the game/ folder of the Zero Day Clock v2 repository.</span></div>
    </div>`;
    el.querySelector('.close').onclick = () => el.classList.add('hidden');
    $('h-tut').onclick = () => { el.classList.add('hidden'); this.showTutorial(false); };
    el.classList.remove('hidden');
  }

  // ---------- palette ----------
  buildPalette() {
    const el = $('palette');
    el.innerHTML = '';
    for (const t of TOWER_ORDER.map((id) => TOWERS[id]).filter(Boolean)) {
      const d = document.createElement('div');
      d.className = 'tool'; d.dataset.tool = t.id;
      d.innerHTML = `<span class="key">${t.hotkey}</span><span class="ic ic-${t.id}">${ICON[t.id]}</span><span class="nm">${esc(t.name)}<small>${esc(TOOL_ROLE[t.id] || '')}</small></span><span class="cost">$${t.cost}k</span>`;
      d.onclick = () => this.selectTool(this.tool === t.id ? null : t.id);
      d.title = t.blurb;
      el.appendChild(d);
    }
    const p = document.createElement('div');
    p.className = 'tool prog'; p.innerHTML = `<span class="key">P</span><span class="ic">${ICON.soc1}</span><span class="nm">Programmes &amp; staffing<small>people, not boxes</small></span>`;
    p.onclick = () => this.showProgrammes();
    el.appendChild(p);
    const b = document.createElement('div'); b.className = 'tool-blurb'; b.id = 'tool-blurb'; el.appendChild(b);
  }
  selectTool(id) {
    this.tool = id;
    for (const d of document.querySelectorAll('#palette .tool[data-tool]')) d.classList.toggle('on', d.dataset.tool === id);
    $('tool-blurb').textContent = id ? TOWERS[id].blurb : '';
    $('hint').textContent = id ? `Click a free cell to place ${TOWERS[id].name}. Right-click or Esc to cancel.` : '';
    if (id) this.select(null);
  }
  refreshPalette(g) {
    for (const d of document.querySelectorAll('#palette .tool[data-tool]')) d.classList.toggle('off', g.budget < TOWERS[d.dataset.tool].cost);
  }

  // ---------- programmes ----------
  showProgrammes() {
    const g = this.app.game; if (!g) return;
    const el = $('programmes');
    const render = () => {
      const tiles = PROG_ORDER.filter((id) => PROGRAMMES[id] && !PROGRAMMES[id].perAsset).map((id) => {
        const p = PROGRAMMES[id];
        const owned = g.bought(id); const active = g.has(id); const locked = p.requires && !g.bought(p.requires);
        const from = g.activeFrom.get(id);
        let state = 'available', foot = `<button data-buy="${id}" ${g.budget < p.cost ? 'disabled' : ''}>Fund</button>`;
        if (owned && active) { state = 'owned'; foot = `<span class="st ok">${ICON.check} in place</span>`; }
        else if (owned) { const done = Math.max(0, Math.min(1, 1 - (from - g.hour - (g.phase === 'wave' ? Math.min(1, g.phaseTimer / ECONOMY.waveSeconds) : 0)) / (p.deployHours || 1))); state = 'rolling'; foot = `<span class="st roll">rolling out · ${hh(from)}</span><div class="pbar"><div style="width:${Math.round(done * 100)}%"></div></div>`; }
        else if (locked) { state = 'locked'; foot = `<span class="st lock">${ICON.lock} needs ${esc(PROGRAMMES[p.requires].name)}</span>`; }
        const line = p.blurb.split('. ')[0].replace(/\.$/, '') + '.';
        return `<div class="ptile ${state}" title="${esc(p.blurb)}"><div class="pic">${ICON[id] || ICON.briefing}</div><div class="pn">${esc(p.name)}</div><div class="pc">${owned ? '' : `$${p.cost}k`}${!owned && p.deployHours ? `<small>${p.deployHours}h rollout</small>` : ''}</div><div class="pb">${esc(line)}</div><div class="pf">${foot}</div></div>`;
      }).join('');
      el.innerHTML = `<div class="panel progpanel"><button class="close link" style="float:right">close</button><div class="eyebrow">Programmes &amp; staffing</div><div class="prog-head"><span class="mono">${money(g.budget)}</span> budget · ${this.engineerIcons(g)} <span class="muted">EDR is bought per system: select a server on the map.</span></div><div class="ptiles">${tiles}</div></div>`;
      el.querySelector('.close').onclick = () => el.classList.add('hidden');
      for (const b of el.querySelectorAll('[data-buy]')) b.onclick = () => { const r = g.buy(b.dataset.buy); this.toast(r.ok ? `${PROGRAMMES[b.dataset.buy].name} funded.` : r.reason, !r.ok); if (r.ok) this.app.audio.event('buy', { id: b.dataset.buy }); render(); };
    };
    render();
    el.classList.remove('hidden');
  }
  engineerIcons(g) {
    const n = g.concurrency(); const busy = g.activeJobs();
    return `<span class="engs" title="${busy} of ${n} engineers busy">${Array.from({ length: n }, (_, i) => `<i class="${i < busy ? 'busy' : ''}">${ICON.engineer}</i>`).join('')}</span>`;
  }

  // ---------- estate rail: everything the CISO owns, always on screen ----------
  renderRail(g, force = false) {
    const el = $('rail'); if (!el) return;
    const now = performance.now();
    if (!force && this.lastRailAt && now - this.lastRailAt < 500) return;
    this.lastRailAt = now;
    const inv = g.inventory();
    const jobs = g.jobs.filter((j) => j.kind !== 'scan');
    const JOB = { patch: 'patching', ir: 'responding', replace: 'replacing', edr: 'EDR' };
    const people = Array.from({ length: inv.engineers }, (_, i) => {
      const j = jobs[i]; const a = j ? g.asset(j.assetId) : null;
      return `<i class="${j ? 'busy' : ''}" title="${j && a ? `${JOB[j.kind] || j.kind} ${esc(a.name)} · ${Math.ceil(j.remaining)}s` : 'available'}">${ICON.engineer}${j ? `<small>${esc(JOB[j.kind] || j.kind)}</small>` : ''}</i>`;
    }).join('');
    const progs = PROG_ORDER.filter((id) => g.bought(id)).map((id) => {
      const active = g.has(id); const from = g.activeFrom.get(id); const p = PROGRAMMES[id];
      const done = active ? 100 : Math.round(100 * Math.max(0, Math.min(1, 1 - (from - g.hour) / (p.deployHours || 1))));
      return `<i class="pi ${active ? '' : 'roll'}" title="${esc(p.name)}${active ? '' : ` · from ${hh(from)}`}" style="--p:${done}">${ICON[id] || ICON.briefing}</i>`;
    }).join('') || '<span class="none">no programmes</span>';
    const equip = TOWER_ORDER.filter((id) => id !== 'wall').map((id) => {
      const e = inv.towers[id] || { count: 0, levels: [0, 0, 0], blocked: 0, revealed: 0 };
      const def = TOWERS[id];
      const dots = def.levels.map((_, i) => `<i class="${e.levels[i] ? 'on' : ''}" title="L${i + 1}: ${e.levels[i] || 0}">${e.levels[i] ? e.levels[i] : ''}</i>`).join('');
      const meta = id === 'ndr' ? `${e.revealed} id` : id === 'honeytoken' ? `${e.revealed} caught` : `${e.blocked} blocked`;
      return `<div class="eq ${e.count ? '' : 'empty'}" title="${esc(def.name)}: ${e.count} · ${meta}"><span class="ic ic-${id}">${ICON[id]}</span><b>${e.count}</b><span class="dots">${dots}</span></div>`;
    }).join('') + `<div class="eq ${inv.walls ? '' : 'empty'}" title="Segments: ${inv.walls}"><span class="ic ic-wall">${ICON.wall}</span><b>${inv.walls}</b></div>`;
    const A = inv.assets; const undiscovered = A.total - A.discovered;
    const seg = (n, cls, label) => (n ? `<span class="${cls}" style="flex:${n}" title="${label}: ${n}"></span>` : '');
    const systems = `<div class="sbar" title="${A.ok} operating · ${A.compromised} compromised · ${A.isolated} offline · ${A.maintenance} in change">${seg(A.ok, 'ok', 'operating')}${seg(A.compromised, 'comp', 'compromised')}${seg(A.isolated, 'iso', 'offline')}${seg(A.maintenance, 'mnt', 'change / replace / down')}</div>
      <div class="skpi"><span title="operating" class="ok"><b>${A.ok}</b>ok</span><span title="compromised" class="${A.compromised ? 'bad' : ''}"><b>${A.compromised}</b>hit</span><span title="known exploitable" class="${A.knownExploitable ? 'bad' : ''}"><b>${A.knownExploitable}</b>expl.</span><span title="unscanned" class="${A.unscanned ? 'warn' : ''}"><b>${A.unscanned}</b>unscanned</span>${undiscovered ? `<span title="not in inventory" class="warn"><b>${undiscovered}</b>unknown</span>` : ''}</div>`;
    el.innerHTML = `
      <div class="rg org"><span class="oi">${ICON.systems}</span><div><b>${esc(g.org.name)}</b><small>${inv.busy} of ${inv.engineers} busy</small></div><span class="engs">${people}</span></div>
      <div class="rg progs"><small>programmes</small><span class="pis">${progs}</span></div>
      <div class="rg equipment"><small>equipment</small><span class="eqs">${equip}</span></div>
      <div class="rg systems"><small>systems · ${A.total}</small>${systems}</div>
      <div class="rg money"><small>money</small><span class="mrow"><b class="mono">${money(inv.budget)}</b><i>+${money(inv.income)}/h</i><i class="spent">${money(inv.spent)} spent</i></span></div>`;
  }

  // ---------- selection ----------
  select(sel) { this.selection = sel; this.renderSide(); }
  renderSide() {
    const g = this.app.game; const el = $('side');
    const s = this.selection;
    if (!s || !g) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (s.kind === 'asset') el.innerHTML = this.assetPanel(g, g.asset(s.id));
    else if (s.kind === 'tower') { const t = g.towers.find((x) => x.id === s.id); if (!t) { this.select(null); return; } el.innerHTML = this.towerPanel(g, t); }
    else if (s.kind === 'wall') el.innerHTML = `<button class="close link" data-act="close">close</button><h3>${ICON.wall} Firewall segment</h3><div class="sub">${s.x},${s.y} · blocks one cell</div><div class="actions"><button data-act="unwall">Remove (+$${Math.round(TOWERS.wall.cost * TOWERS.wall.sell)}k)</button></div>`;
    else if (s.kind === 'attacker') { const a = g.attackers.find((x) => x.id === s.id); if (!a) { this.select(null); return; } el.innerHTML = this.attackerPanel(g, a); }
    for (const b of el.querySelectorAll('[data-act]')) b.onclick = () => this.act(b.dataset.act, b.dataset);
  }
  vulnCard(g, vid, a) {
    const v = g.vuln(vid);
    if (!v) return `<div class="vuln"><span class="id">${esc(vid)}</span></div>`;
    const fh = g.fixHour(v.id);
    const chips = [
      v.kev ? '<span class="chip red">KEV</span>' : '',
      v.ransomware ? `<span class="chip red">${ICON.skull} ransomware</span>` : '',
      v.cvss ? `<span class="chip ${v.cvss >= 9 ? 'red' : v.cvss >= 7 ? 'amber' : ''}">${v.scoreBasis === 'cvss' ? 'CVSS' : 'score'} ${v.cvss}</span>` : '<span class="chip">sev. assumed</span>',
      v.web ? `<span class="chip web">${ICON.web} web · WAF</span>` : `<span class="chip appl">${ICON.appliance} appliance · IPS</span>`,
      v.patchable ? '' : '<span class="chip amber">assumed EOL</span>',
      fh !== null ? `<span class="chip amber">no fix until ${hh(fh)}</span>` : '',
    ].join('');
    return `<div class="vuln"><div class="vn">${esc(short(v, v.id))}</div><div class="id">${esc(v.id)}</div><div class="chips">${chips}</div><div class="meta">${v.ips} sources · ${v.connections.toLocaleString()} attempts${a && a.hits ? ` · ${a.hits} probes here` : ''}</div></div>`;
  }
  assetPanel(g, a) {
    if (!a.discovered) return `<button class="close link" data-act="close">close</button><h3>Unmanaged system</h3><div class="sub">Not in your inventory. You cannot act on it until you know what it is.</div><div class="actions"><button data-act="discovery" ${g.bought('discovery') || g.budget < PROGRAMMES.discovery.cost ? 'disabled' : ''}>${ICON.discovery} Asset discovery ($${PROGRAMMES.discovery.cost}k)</button></div>`;
    const stateChip = { ok: '<span class="chip green">operating</span>', compromised: '<span class="chip red">COMPROMISED</span>', responding: '<span class="chip amber">incident response</span>', isolated: '<span class="chip blue">offline</span>', maintenance: '<span class="chip amber">change window</span>', replacing: '<span class="chip amber">being replaced</span>', down: '<span class="chip red">DOWN · failed change</span>' }[a.state] || '';
    let vulnBlock;
    if (a.knownVulns === null) vulnBlock = `<div class="row"><span class="k">exploitable?</span><span class="muted">unknown · no scan yet</span></div>`;
    else if (a.knownVulns.size === 0) vulnBlock = `<div class="row"><span class="k">exploitable?</span><span style="color:var(--green)">clean · ${esc(a.scanClock || '')}${a.scanStale ? ' <span class="chip amber">stale</span>' : ''}</span></div>`;
    else vulnBlock = `<div class="row"><span class="k">exploitable?</span><span style="color:var(--accent)">YES · ${esc(a.scanClock || '')}${a.scanStale ? ' (stale)' : ''}</span></div>` + [...a.knownVulns].map((vid) => this.vulnCard(g, vid, a)).join('');
    const feed = a.threats.length ? `${a.threats.reduce((s, v) => s + v.ips, 0)} sources · ${a.threats.length} CVEs` : 'none';
    const job = a.job ? `<div class="row"><span class="k">${esc(a.job.kind === 'ir' ? 'incident response' : a.job.kind)}${a.job.vulnId ? ' ' + esc(a.job.vulnId) : ''}</span><span class="mono">${Math.ceil(a.job.remaining)}s</span></div><div class="job"><div class="f" style="width:${(100 * (1 - a.job.remaining / a.job.total)).toFixed(0)}%"></div></div>` : '';
    const actions = [];
    const busy = g.activeJobs() >= g.concurrency();
    if (a.state === 'compromised') {
      const p0 = g.irPlan(a, false), p1 = g.irPlan(a, true);
      actions.push(`<button class="primary" data-act="respond" ${busy ? 'title="All engineers busy"' : ''}>Respond · $${p0.cost}k · ${Math.round(p0.seconds * g.jobSpeed())}s${g.has('backups') ? '' : ' (rebuild)'}</button>`);
      if (p1.patchVulns.length) actions.push(`<button class="primary" data-act="respondPatch">Respond + patch · $${p1.cost}k · ${Math.round(p1.seconds * g.jobSpeed())}s</button>`);
      else if (a.vulns.size) actions.push(`<span class="chip amber">a restore brings the hole back: no fix yet</span>`);
    }
    if (a.knownVulns && a.state === 'ok') for (const vid of a.knownVulns) {
      const v = g.vuln(vid);
      const fh = g.fixHour(vid);
      if (v && !v.patchable) actions.push(`<button data-act="replace">Replace device · $${ACTIONS.replaceCost(a)}k · ${Math.round(ACTIONS.replaceSeconds * g.jobSpeed())}s offline</button>`);
      else if (fh !== null) actions.push(`<span class="chip amber">no fix until ${hh(fh)}: isolate, segment or WAF/IPS</span>`);
      else {
        const cab = g.businessHours() && a.crit === 3 && a.revenue > 0 && !g.bought('soc2') ? ACTIONS.cabDelaySeconds : 0;
        actions.push(`<button class="primary" data-act="patch" data-vid="${esc(vid)}">${ICON.patched} Patch · $${ACTIONS.patchCost(a)}k · ${Math.round((ACTIONS.patchSeconds(a) + cab) * g.jobSpeed())}s${cab ? ' (CAB)' : ''}</button>`);
        actions.push(`<button data-act="epatch" data-vid="${esc(vid)}" title="${a.appliance ? 25 : 15}% chance the change fails: the system goes DOWN, still exploitable">Emergency · $${Math.round(ACTIONS.patchCost(a) * ACTIONS.emergencyMultiplier)}k · ${Math.round(ACTIONS.patchSeconds(a) * ACTIONS.emergencySecondsFactor * g.jobSpeed())}s · ${a.appliance ? 25 : 15}% fail</button>`);
      }
    }
    if (a.state === 'ok') actions.push(`<button data-act="isolate" title="Change ticket $${ACTIONS.isolateCost}k. Offline at least ${ACTIONS.isolateMinSeconds}s.${a.revenue >= 3 ? ' The business forces it back after two hours.' : ''}">${ICON.lock} Take offline · $${ACTIONS.isolateCost}k${a.revenue ? ` · -$${a.revenue}k/h` : ''}</button>`);
    if (a.state === 'isolated') { const left = Math.ceil(ACTIONS.isolateMinSeconds - a.isolatedFor); actions.push(`<button data-act="restore" ${left > 0 ? 'disabled' : ''}>Bring back online${left > 0 ? ` (${left}s)` : ''}</button>`); if (a.revenue >= 3) actions.push(`<span class="chip amber">offline ${(a.isolatedFor / IMPACT.secondsPerHour).toFixed(1)}h of 2h tolerated</span>`); }
    if (a.canEdr && !a.edr && a.state !== 'compromised' && !(a.job && a.job.kind === 'edr')) actions.push(`<button data-act="edr">${ICON.edr} EDR · $${PROGRAMMES.edr.cost}k · ${Math.round(PROGRAMMES.edr.seconds * g.jobSpeed())}s</button>`);
    return `<button class="close link" data-act="close">close</button><h3>${esc(a.name)}</h3><div class="sub">${esc(a.product)}</div>
      <div class="chips">${stateChip}<span class="chip">${a.exposed ? 'internet-facing' : 'internal'}</span><span class="chip">crit ${'●'.repeat(a.crit)}${'○'.repeat(3 - a.crit)}</span>${a.appliance ? '<span class="chip">appliance</span>' : ''}${a.edr ? '<span class="chip green">EDR</span>' : ''}${a.shadow ? '<span class="chip amber">was shadow IT</span>' : ''}</div>
      <div class="irow"><span title="integrity">${ICON.check}<b class="mono">${Math.round(a.integrity)}%</b></span><span title="revenue per hour">${ICON.income}<b class="mono">$${a.revenue}k/h</b></span><span title="vendor match in today's feed">${ICON.intel}<b class="mono">${feed}</b></span></div>
      ${vulnBlock}${job}
      ${a.compromisedBy === SUPPLY_CHAIN_ID ? `<div class="row"><span class="k">compromised via</span><span><span class="chip supply">${ICON.supply} supply chain</span> a malicious ${esc(a.product.split(/[ /]/)[0])} update</span></div>` : a.compromisedBy ? `<div class="row"><span class="k">compromised via</span><span class="mono" style="color:var(--accent)">${esc(a.compromisedBy)}</span></div>` : ''}
      <div class="actions">${actions.join('')}</div>`;
  }
  towerPanel(g, t) {
    const def = TOWERS[t.type]; const lv = def.levels[t.level]; const next = def.levels[t.level + 1];
    const rows = [`<div class="row"><span class="k">level</span><span class="mono">${t.level + 1} / ${def.levels.length}</span></div>`, `<div class="row"><span class="k">range</span><span class="mono">${g.towerRange(t).toFixed(1)} cells</span></div>`];
    if (lv.damage) rows.push(`<div class="row"><span class="k">blocking</span><span class="mono">${lv.damage} / ${lv.interval}s</span></div>`);
    if (lv.slow) rows.push(`<div class="row"><span class="k">slows web exploits to</span><span class="mono">${Math.round(lv.slow * 100)}%</span></div>`);
    if (t.type === 'ndr') rows.push(`<div class="row"><span class="k">sources identified</span><span class="mono">${t.revealed || 0}</span></div>`);
    if (t.type === 'honeytoken') {
      rows.push(`<div class="row"><span class="k">sources caught</span><span class="mono">${t.revealed || 0}</span></div>`);
      if (t.cooldown > 0) rows.push(`<div class="row"><span class="k">re-arming</span><span class="mono" style="color:var(--amber)">${Math.ceil(t.cooldown)}s</span></div><div class="rearm"><div style="width:${Math.round(100 * (1 - t.cooldown / lv.cooldown))}%"></div></div>`);
      else rows.push(`<div class="row"><span class="k">trap</span><span style="color:var(--green)">armed · catches the next source in range</span></div>`);
    }
    if (lv.damage || lv.dot) rows.push(`<div class="row"><span class="k">sources blocked</span><span class="mono">${t.blocked}</span></div>`);
    if (t.type === 'ips') rows.push(`<div class="row"><span class="k">targeting (T)</span><span class="modes">${TARGET_MODES.map((m) => `<button class="link ${t.mode === m ? 'on' : ''}" data-act="mode" data-mode="${m}">${m}</button>`).join('')}</span></div>`);
    const actions = [];
    if (next) actions.push(`<button class="primary" data-act="upgrade" ${g.budget < lv.upgrade ? 'disabled' : ''}>Upgrade · $${lv.upgrade}k (U)<small>${esc(next.note)}${next.range ? ` · range ${next.range}` : ''}</small></button>`);
    actions.push(`<button data-act="sell">Decommission (X) · refund 60%</button>`);
    return `<button class="close link" data-act="close">close</button><h3><span class="ic ic-${t.type}">${ICON[t.type]}</span> ${esc(def.name)}</h3><div class="sub">${esc(lv.note)} · at ${t.x},${t.y}</div><div class="chips"><span class="chip">${esc(TOOL_ROLE[t.type])}</span></div>${rows.join('')}<div class="actions">${actions.join('')}</div>`;
  }
  attackerPanel(g, a) {
    const i = g.attackerIntel(a);
    const target = i.target;
    const heading = target ? (target.discovered ? esc(target.name) : 'an unmanaged system') : '-';
    if (!a.revealed) return `<button class="close link" data-act="close">close</button><h3>Unidentified source</h3><div class="sub mono">${esc(a.ip)}${a.boss ? ' · persistent' : ''}</div><div class="row"><span class="k">heading for</span><span>${heading}</span></div><p class="muted" style="font-size:11.5px">No sensor has seen this traffic yet. An NDR sensor in range names the exploit; an IPS names it on the first hit.</p>`;
    const levelText = { danger: 'CAN COMPROMISE ITS TARGET', stack: 'your product · target status unknown', 'stack-clean': 'your product · target is patched', noise: 'not a product you run', unknown: '' }[i.level];
    return `<button class="close link" data-act="close">close</button><h3>${esc(i.v ? short(i.v, a.vuln) : a.vuln)}</h3><div class="sub mono">${esc(a.ip)} · ${a.kind === 'lateral' ? 'lateral movement' : 'external'}${a.boss ? ' · PERSISTENT' : ''}</div>
      <div class="chips"><span class="chip ${i.level === 'danger' ? 'red' : ''}">${esc(levelText)}</span></div>
      <div class="row"><span class="k">heading for</span><span>${heading}</span></div>
      <div class="row"><span class="k">remaining</span><span class="mono">${Math.max(0, Math.round(a.hp))} / ${a.maxHp}</span></div>
      ${i.v ? this.vulnCard(g, a.vuln) : ''}`;
  }
  act(act, d) {
    const g = this.app.game; const s = this.selection; if (!g || !s) return;
    let r = { ok: true };
    switch (act) {
      case 'close': this.select(null); return;
      case 'respond': r = g.respond(s.id, false); break;
      case 'respondPatch': r = g.respond(s.id, true); break;
      case 'mode': r = g.setMode(s.id, d.mode); break;
      case 'patch': r = g.patch(s.id, d.vid, false); break;
      case 'epatch': r = g.patch(s.id, d.vid, true); break;
      case 'replace': r = g.replace(s.id); break;
      case 'isolate': r = g.isolate(s.id, true); break;
      case 'restore': r = g.isolate(s.id, false); break;
      case 'edr': r = g.installEdr(s.id); break;
      case 'discovery': r = g.buy('discovery'); break;
      case 'upgrade': r = g.upgrade(s.id); if (r.ok) this.app.rebuildTowers(); break;
      case 'sell': r = g.sell(s.id); if (r.ok) { this.app.rebuildTowers(); this.select(null); return; } break;
      case 'unwall': r = g.removeWall(s.x, s.y); if (r.ok) { this.app.rebuildTowers(); this.select(null); return; } break;
    }
    if (!r.ok) { this.toast(r.reason, true); this.app.audio.event('refused'); } else this.app.audio.event('action', { act });
    this.renderSide();
  }

  // ---------- periodic ----------
  toast(text, bad = false) {
    const el = $('toast'); el.textContent = text; el.classList.toggle('bad', bad); el.classList.remove('hidden');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => el.classList.add('hidden'), 2600);
  }
  refresh(g, paused, speed) {
    $('t-org').textContent = g.org.name;
    $('t-clock').textContent = g.clock();
    const w = g.waves[g.hour];
    $('t-hour').textContent = `${Math.min(24, g.hour)} / 24 ${g.phase === 'prep' ? `· next in ${Math.ceil(g.phaseTimer)}s` : g.phase === 'wave' && w ? `· ${g.attackers.length} on map · ${Math.max(0, w.attackers.length - g.spawnCursor)} to come` : g.phase === 'final' ? `· ${g.attackers.length} clearing` : ''}`;
    $('t-budget').textContent = money(g.budget);
    $('t-impact').style.width = `${Math.min(100, g.impact)}%`;
    $('t-impact-n').textContent = g.impact.toFixed(0);
    $('b-pause').innerHTML = paused ? ICON.play : ICON.pause;
    $('b-pause').classList.toggle('on', paused);
    for (const b of document.querySelectorAll('#topbar .spd')) b.classList.toggle('on', +b.dataset.speed === speed);
    this.refreshPalette(g);
    this.renderRail(g);
    if (g.events.length !== this.lastLogLen || this.lastLogFirst !== g.events[0]) {
      $('log').innerHTML = g.events.slice(-7).map((e) => `<div class="e ${e.level}${/malicious .* update|Supply-chain|compromised \w+ update/i.test(e.text) ? ' supply' : ''}"><span class="t">${esc(e.clock)}</span>${esc(e.text)}</div>`).join('');
      this.lastLogLen = g.events.length; this.lastLogFirst = g.events[0];
    }
    this.renderWave(g);
    if (this.advisorOn) {
      const tips = advise(g);
      const k = tips.map((t) => t.text).join('|');
      if (k !== this.lastAdvice) {
        this.lastAdvice = k;
        $('advice').innerHTML = tips.map((t, i) => `<div class="tip ${t.kind}" data-i="${i}"><b>${esc(t.text)}</b>${t.detail ? `<span class="detail">${esc(t.detail)}</span>` : ''}</div>`).join('') || '<div class="tip info"><b>Nothing urgent. Watch the uplinks.</b></div>';
        for (const d of $('advice').querySelectorAll('.tip')) d.onclick = () => { const t = tips[+d.dataset.i]; if (t && t.assetId) this.app.focusAsset(t.assetId); d.classList.toggle('open'); };
        const top = tips[0];
        const now = performance.now();
        if (top && top.text !== this.lastSaid && now - this.lastSaidAt > 8000 && !paused) { this.lastSaid = top.text; this.lastSaidAt = now; try { this.app.audio.say(top.text); } catch { /* no audio */ } }
      }
    }
    if (this.selection) this.renderSide();
  }
  renderWave(g) {
    const el = $('wavebox');
    const w = g.previewWave(g.phase === 'prep' ? g.hour : Math.min(23, g.hour + (g.phase === 'wave' ? 1 : 0)));
    const nextHour = g.phase === 'prep' ? g.hour : g.hour + 1;
    const k = `${g.phase}|${g.hour}|${w ? w.rows.map((r) => r.relevance + r.n).join('') : 'x'}|${g.phase === 'prep' ? Math.ceil(g.phaseTimer) + '|' + (g.attackers.length ? 'busy' : 'clear') : ''}`;
    if (k === this.lastWaveKey) return;
    this.lastWaveKey = k;
    const strip = `<div class="strip">${Array.from({ length: HOURS }, (_, h) => { const wv = g.waves[h]; const fv = g.vuln(wv.featured); return `<span class="${h < g.hour ? 'past' : h === g.hour ? 'now' : ''} ${wv.surge ? 'surge' : ''} ${wv.campaign ? 'camp' : ''}" title="${hh(h)} · ${wv.n} sources${g.bought('intel') && fv ? ' · ' + esc(short(fv, fv.id)) : ''}${wv.surge ? ' · surge' : ''}${wv.campaign ? ' · campaign' : ''}"></span>`; }).join('')}</div>`;
    let body;
    if (g.phase === 'final') body = `<div class="big">Last sources clearing</div>`;
    else if (!w) body = `<div class="big">${hh(nextHour)}</div><div class="muted" style="font-size:11.5px;margin-top:4px">${ICON.intel} No threat intel. The Shadowserver report ($${PROGRAMMES.intel.cost}k, Programmes) previews every hour.</div>${strip}`;
    else body = `<div class="big">${hh(w.hour)} · ${w.n} sources${w.surge ? ` <span class="chip red">${ICON.star} surge</span>` : ''}${w.campaign ? ' <span class="chip red">campaign</span>' : ''}</div><div class="rows">${w.rows.slice(0, 7).map((r) => `<div class="r ${r.relevance}"><span class="n">${r.n}x</span><span class="nm">${esc(short(r.vuln, r.vuln.id))}${r.boss ? ' ★' : ''}<small>${esc(r.vuln.id)}</small></span><span class="tg">${esc(r.targets.length ? '→ ' + r.targets.map((a) => a.name).join(', ') : '')}</span></div>`).join('')}${w.rows.length > 7 ? `<div class="r"><span class="n"></span><span class="nm">… ${w.rows.length - 7} more</span></div>` : ''}</div>${strip}<div class="legend-mini"><i class="d"></i>exploitable <i class="s"></i>your product <i class="g"></i>other · ★ surge ▲ campaign</div>`;
    const bonus = g.attackers.length ? 0 : Math.round(Math.min(g.phaseTimer, ECONOMY.prepSeconds) * ECONOMY.earlyCallBonusPerSecond);
    const early = g.phase === 'prep' && g.hour > 0 ? `<button class="early primary" id="b-early">${ICON.play} Start hour${bonus ? ` · +$${bonus}k` : ''} · ${Math.ceil(g.phaseTimer)}s</button>` : g.phase === 'prep' ? `<button class="early primary" id="b-early">${ICON.play} Begin the day · ${Math.ceil(g.phaseTimer)}s</button>` : '';
    el.innerHTML = `<div class="hd"><span>NEXT HOUR</span><span title="Yesterday's real distribution, used as a preview of the authored hours">${g.bought('intel') ? 'yesterday\'s report · preview' : 'no intel'}</span></div>${body}${early}`;
    const b = document.getElementById('b-early'); if (b) b.onclick = () => { const r = this.app.game.startHourEarly(); if (r.ok) this.app.audio.event('early'); };
  }
}
