import { ORGS } from '../sim/orgs.js';
import { isMobileDevice } from '../mobile.js';
import './start-screen.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const descriptions = { startup: 'Room to learn', midcap: 'Growing exposure', enterprise: 'A connected estate' };
const icons = { startup: '▥', midcap: '▦', enterprise: '▤' };
const github = 'https://github.com/eppser/ciso-simulator/blob/main/docs/DATA-SOURCES.md';

// Never substitute seeded display entries for a real player or coerce malformed scores.
export function topPlayer(data) {
  if (!Array.isArray(data?.rows)) throw new Error('Invalid scoreboard response');
  return data.rows.filter(row => row && !row.seeded && typeof row.name === 'string' && row.name.trim() && Number.isInteger(row.score) && row.score >= 0 && row.score <= 10000)
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

// Campaign adds a starter allowance and identity provider to the startup estate.
export function companyOverview(org) {
  return { budget: org.budget + (org.id === 'startup' ? 40 : 0), systems: org.assets.length + (org.id === 'startup' ? 1 : 0) };
}

export function mountStartScreen(root, { onStart, onImport, onResume, selectedOrg = 'startup', initialReportDate, scoreUrl = '/api/scores?view=top&page=0', mobile = isMobileDevice(navigator) } = {}) {
  let selected = ORGS[selectedOrg] ? selectedOrg : 'startup', busy = false, imported = !!initialReportDate;
  const startLabel = mobile ? 'PLAY ON DESKTOP' : onResume ? 'START A NEW SHIFT' : 'TAKE THE CHAIR';
  const controller = new AbortController();
  const base = import.meta.env.BASE_URL;
  root.innerHTML = `<div class="ciso-start" tabindex="-1">
    <nav class="cs-nav" aria-label="Main navigation"><a class="cs-brand" href="${base}">CISO <span>SIMULATOR</span></a><div>${onResume ? '<button type="button" class="cs-resume" data-resume>Resume your shift →</button>' : ''}<button type="button" data-help>How to play</button><a href="${base}scoreboard.html" target="_blank" rel="noopener">Scoreboard <span aria-hidden="true">↗</span></a><a class="cs-github" href="https://github.com/eppser/ciso-simulator" target="_blank" rel="noopener">GitHub <span aria-hidden="true">↗</span></a></div></nav>
    <main class="cs-main">
      <section class="cs-intro" aria-labelledby="cs-title">
        <p class="cs-eyebrow"><span class="cs-dot"></span> ONE COMPANY. ONE DAY. YOUR CALL.</p>
        <h1 id="cs-title">CISO<span>SIMULATOR</span></h1>
        <h2>Your firewall works.<br><span>Your board wants a meeting.</span></h2>
        <p class="cs-description">A tower-defense-inspired simulation of real CISO problems. <em>All the pressure. <strong>None of the career damage.</strong></em></p>
        <form class="cs-selector">
          <fieldset><legend>CHOOSE YOUR COMPANY <span>01 / 03</span></legend>
            ${Object.values(ORGS).map(org => `<label class="cs-company"><input type="radio" name="company" value="${org.id}" ${org.id === selected ? 'checked' : ''}><span class="cs-building" aria-hidden="true">${icons[org.id]}</span><span class="cs-company-name"><b>${esc(org.name)}</b><small>${descriptions[org.id]}</small></span><span class="cs-difficulty cs-${org.id}">${org.difficultyLabel}</span></label>`).join('')}
          </fieldset>
          <div class="cs-profile" aria-live="polite"></div>
          <button class="cs-start-button" type="submit">${startLabel} <span aria-hidden="true">→</span></button>
          <p class="cs-session">${mobile ? 'Open on a desktop browser with a mouse and keyboard.' : 'Desktop browser <i>·</i> ~22 min <i>·</i> No install. No login.'}</p>
          ${onResume ? '<p class="cs-new-run-note">Starting a new shift replaces your current run.</p>' : ''}
          <p class="cs-error" role="alert" hidden></p>
        </form>
        <div class="cs-data"><a href="${github}" target="_blank" rel="noopener"><span aria-hidden="true">⌘</span> Play with your own SIEM data <span aria-hidden="true">↗</span></a><button type="button" data-import>Load JSON</button><input type="file" accept="application/json,.json" aria-label="Load a normalized SIEM report" hidden></div>
        <p class="cs-import-status" role="status">${initialReportDate ? `${esc(initialReportDate)} · Local practice scenario. Your report stays in this browser.` : 'Elastic, Splunk, Sentinel… bring your own bad day.'}</p>
      </section>
      <aside class="cs-side" aria-label="Game highlights">
        <a class="cs-score" href="${base}scoreboard.html" target="_blank" rel="noopener"><div class="cs-score-top"><span>THE SCORE TO BEAT</span><span aria-hidden="true">↗</span></div><div class="cs-score-content" aria-live="polite"><p class="cs-score-status">Loading the top player…</p></div><span class="cs-score-bottom">PUBLIC SCOREBOARD <span> / 10,000</span></span></a>
        <div class="cs-side-bottom"><div class="cs-art-note"><span></span> THE BOARD IS WAITING.</div><div class="cs-promo"><span class="cs-quote-mark" aria-hidden="true">“</span><p>Finally, a board meeting<br>you’ll want to replay.</p><span class="cs-promo-rule"></span><small>ONE MORE RUN.<br>THEN YOU CAN LOG OFF.</small></div></div>
      </aside>
    </main>
    <div class="cs-footer"><a class="cs-maker" href="https://zerodayclock.com" target="_blank" rel="noopener"><small>CREATED BY</small><span><i></i>ZeroDayClock</span></a><a class="cs-source" href="https://www.shadowserver.org/" target="_blank" rel="noopener"><small>OBSERVATION DATA FROM</small><img src="${base}branding/shadowserver-dark.svg" width="172" height="39" alt="The Shadowserver Foundation"></a><p>Real observations. Designed gameplay.<br><span>Keep the company alive. Try to enjoy yourself.</span></p></div>
    <dialog class="cs-help" aria-labelledby="cs-help-title"><button class="cs-help-close" type="button" aria-label="Close how to play">×</button><p class="cs-eyebrow">YOUR FIRST SHIFT</p><h2 id="cs-help-title">Make it to midnight.</h2><p>Keep business impact low and board trust high. Your company sets the difficulty.</p><ol><li><b>Find your exposure.</b><span>Buy a Scanner in Programs → Identify. Discover the systems you need to protect.</span></li><li><b>Build your defenses.</b><span>Shape routes with firewall segments. Place IPS and WAF across the three uplinks.</span></li><li><b>Handle the pressure.</b><span>Use Operations to investigate threats, respond to incidents, and answer the board.</span></li></ol><button class="cs-help-done" type="button">GOT IT. LET’S PLAY. →</button></dialog>
  </div>`;
  const screen = root.querySelector('.ciso-start'), form = root.querySelector('form'), start = root.querySelector('.cs-start-button');
  const score = root.querySelector('.cs-score-content'), status = root.querySelector('.cs-import-status'), error = root.querySelector('.cs-error');
  root.querySelector('[data-resume]')?.addEventListener('click', () => onResume?.());
  const showError = message => { error.hidden = !message; error.textContent = message; };
  const updateCompany = () => {
    const org = ORGS[selected], overview = companyOverview(org);
    root.querySelector('.cs-profile').innerHTML = `<span><b>${org.people.toLocaleString('en-US')}</b> people</span><span><b>$${overview.budget}k</b> starting budget</span><span><b>${overview.systems}</b> systems</span>`;
    root.querySelector('legend span').textContent = `0${Object.keys(ORGS).indexOf(selected) + 1} / 03`;
    screen.dataset.company = selected;
  };
  updateCompany();
  form.addEventListener('change', event => { if (event.target.name === 'company') { selected = event.target.value; updateCompany(); } });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (mobile) { showError('Gameplay needs a desktop browser, mouse and keyboard. You can still explore the companies and scoreboard here.'); return; }
    busy = true; start.disabled = true; start.textContent = 'ASSEMBLING YOUR COMMAND DESK…'; showError('');
    try { await onStart?.(selected); } catch { showError('Could not start the game. Reload to try again.'); }
    finally { busy = false; start.disabled = false; start.innerHTML = `${startLabel} <span aria-hidden="true">→</span>`; }
  });
  const dialog = root.querySelector('dialog'), help = root.querySelector('[data-help]');
  help.addEventListener('click', () => dialog.showModal());
  const closeHelp = () => { dialog.close(); help.focus(); };
  root.querySelector('.cs-help-close').addEventListener('click', closeHelp);
  root.querySelector('.cs-help-done').addEventListener('click', closeHelp);
  const input = root.querySelector('input[type=file]'), importButton = root.querySelector('[data-import]');
  importButton.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0]; if (!file || busy) return;
    busy = true; start.disabled = true; importButton.disabled = true;
    try {
      if (file.size > 12e6) throw new Error('Use a JSON report smaller than 12 MB.');
      if (!onImport) throw new Error('Report import is unavailable.');
      const day = JSON.parse(await file.text());
      await onImport(day); imported = true;
      status.textContent = `${day.day} loaded · Local practice scenario. Your report stays in this browser.`;
      showError('');
    } catch (e) { showError(e instanceof SyntaxError ? 'This file is not valid JSON.' : e.message); }
    finally { busy = false; start.disabled = false; importButton.disabled = false; input.value = ''; }
  });
  async function loadScore() {
    try {
      const response = await fetch(scoreUrl, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), cache: 'no-store' });
      if (!response.ok) throw new Error('Scoreboard unavailable');
      const player = topPlayer(await response.json());
      if (!root.isConnected || controller.signal.aborted) return;
      score.innerHTML = player ? `<div class="cs-player"><span class="cs-rank">#1</span><b>${esc(player.name)}</b></div><strong>${player.score.toLocaleString('en-US')}<small>PTS</small></strong><p>${esc(player.superskill || 'Think you can do better?')}</p>` : '<p class="cs-score-status">The board is open.<br>Set the first score.</p>';
    } catch {
      if (!root.isConnected || controller.signal.aborted) return;
      score.innerHTML = '<p class="cs-score-status">Live scores are taking a break.<br>View the scoreboard ↗</p>';
    }
  }
  loadScore();
  // Refresh after returning from the scoreboard, without a background polling loop.
  const refresh = () => { if (document.visibilityState === 'visible') loadScore(); };
  document.addEventListener('visibilitychange', refresh, { signal: controller.signal });
  return { destroy() { controller.abort(); }, get selected() { return selected; }, get imported() { return imported; } };
}
