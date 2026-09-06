// Headless browser smoke test: boots the real page in Chrome (SwiftShader WebGL), starts a
// game, plays a few minutes at 3x with scripted actions, screenshots, and fails on any
// console error or uncaught exception.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.SMOKE_OUT || 'smoke-out';
fs.mkdirSync(OUT, { recursive: true });

// Serves the built dist (run `npx vite build` first) so file edits cannot reload the page mid-run.
const server = spawn('npx', ['vite', 'preview', '--port', '5179', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => { try { server.kill(); } catch (e) { /* already gone */ } });
process.on('uncaughtException', (e) => { console.error(e); try { server.kill(); } catch (x) { /* */ } process.exit(1); });
await new Promise((res, rej) => { server.stdout.on('data', (d) => { if (String(d).includes('5179')) res(); }); server.stderr.on('data', (d) => process.stderr.write(d)); setTimeout(() => rej(new Error('vite did not start')), 20000); });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1600,1000', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.setDefaultTimeout(90000);
await page.goto('http://localhost:5179/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__app && document.getElementById('start') && !document.getElementById('start').classList.contains('hidden'));
await page.screenshot({ path: path.join(OUT, '01-start.png') });

// Start as the mid-cap with a fixed seed.
await page.evaluate(() => { const s = document.getElementById('s-seed'); if (s) s.value = '4242'; document.querySelector('.org-card[data-org="midcap"]').click(); });
await page.waitForFunction(() => window.__app.game && window.__app.game.hour === 0);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: path.join(OUT, '02-tutorial.png') });
// The tutorial opens paused on a first run; step through it with real clicks until it closes.
for (let i = 0; i < 8; i++) {
  const open = await page.evaluate(() => { const t = document.getElementById('tutorial'); if (!t || t.classList.contains('hidden')) return false; const b = [...t.querySelectorAll('button')].find((x) => /got it|next|skip/i.test(x.textContent)); if (b) b.click(); return true; });
  if (!open) break;
  await new Promise((r) => setTimeout(r, 200));
}
if (await page.evaluate(() => window.__app.paused)) errors.push('game still paused after the tutorial');
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: path.join(OUT, '02-map.png') });

// Scripted play: programmes, towers, then let it run.
const acts = await page.evaluate(() => {
  const app = window.__app, g = app.game;
  const out = [];
  out.push(g.buy('scanner'), g.buy('intel'), g.buy('discovery'));
  out.push(g.place('ndr', 6, 8), g.place('ips', 7, 5), g.place('ips', 6, 11), g.place('waf', 10, 7), g.place('honeytoken', 7, 11), g.place('wall', 13, 10));
  app.rebuildTowers();
  app.setSpeed(3);
  app.game.startHourEarly();
  return out;
});
for (const a of acts) if (!a.ok) errors.push('action refused: ' + a.reason);
// Real input: press "2" (IPS), move the mouse over a cell, click to place; then click a building.
async function screenOf(cx, cy) {
  return page.evaluate(([x, y]) => { const v = new (window.__app.rig.camera.position.constructor)(x, 0, y); v.project(window.__app.rig.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [cx, cy]);
}
await page.keyboard.press('2');
let [sx, sy] = await screenOf(6, 15);
await page.mouse.move(sx, sy); await new Promise((r) => setTimeout(r, 150));
const hint = await page.evaluate(() => document.getElementById('hint').textContent);
if (!/Place IPS at 6,15/.test(hint)) errors.push('hover hint wrong: ' + hint);
await page.mouse.click(sx, sy); await new Promise((r) => setTimeout(r, 150));
const placed = await page.evaluate(() => window.__app.game.towerAt(6, 15) ? 'yes' : 'no');
if (placed !== 'yes') errors.push('mouse placement failed');
await page.keyboard.press('Escape');
[sx, sy] = await screenOf(4.5, 2.5); // the firewall building
await page.mouse.click(sx, sy); await new Promise((r) => setTimeout(r, 200));
const sideText = await page.evaluate(() => document.getElementById('side').textContent);
if (!/Perimeter firewall/.test(sideText)) errors.push('clicking a building did not open its panel: ' + sideText.slice(0, 80));
await page.keyboard.press('p'); await new Promise((r) => setTimeout(r, 100));
if (await page.evaluate(() => document.getElementById('programmes').classList.contains('hidden'))) errors.push('P did not open programmes');
await page.keyboard.press('Escape');
// Exercise the UI panels: select an asset, a tower, open programmes.
await page.evaluate(() => { const app = window.__app; app.ui.select({ kind: 'asset', id: 'fw' }); });
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: path.join(OUT, '03-asset-panel.png') });
await page.evaluate(() => { const app = window.__app; app.ui.showProgrammes(); });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(OUT, '04-programmes.png') });
await page.evaluate(() => { document.getElementById('programmes').classList.add('hidden'); const app = window.__app; const t = app.game.towers[0]; app.ui.select({ kind: 'tower', id: t.id }); });

// Run ~3 game hours at 3x and take a mid-wave screenshot, patching whatever gets found.
const t0 = Date.now();
while (Date.now() - t0 < 75000) {
  await new Promise((r) => setTimeout(r, 2500));
  const st = await page.evaluate(() => {
    const g = window.__app.game;
    for (const a of g.assets.values()) { if (a.knownVulns && a.knownVulns.size && a.state === 'ok') g.patch(a.id, [...a.knownVulns][0], false); if (a.state === 'compromised') g.respond(a.id, true); }
    if (g.phase === 'prep') g.startHourEarly();
    return { hour: g.hour, phase: g.phase, attackers: g.attackers.length, impact: g.impact, fps: null };
  });
  if (st.attackers > 5 && !fs.existsSync(path.join(OUT, '05-wave.png'))) await page.screenshot({ path: path.join(OUT, '05-wave.png') });
  if (st.hour >= 3) break;
}
await page.screenshot({ path: path.join(OUT, '06-later.png') });
const summary = await page.evaluate(() => { const g = window.__app.game; return { hour: g.hour, impact: g.impact, budget: g.budget, events: g.events.slice(-12).map((e) => e.clock + ' ' + e.text), towers: g.towers.length, attackers: g.attackers.length }; });
console.log(JSON.stringify(summary, null, 1));
await browser.close();
server.kill();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('smoke OK');
