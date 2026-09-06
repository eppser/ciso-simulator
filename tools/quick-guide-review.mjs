import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out = 'artifacts/quick-guide';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
 const p = await browser.newPage(), errors = [];
 p.on('pageerror', e => errors.push(e.message));
 await p.setViewport({ width: 1440, height: 900 });
 await p.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle0' });
 await p.click('[data-action="start"][data-id="startup"]');
 await p.evaluate(() => { __app.audio.enabled = false; __app.ui.closeCall(); __app.ui.callQueue = []; });
 await p.click('[data-action="help"]');
 assert.equal(await p.evaluate(() => __app.paused), false);
 const before = await p.evaluate(() => __app.game.time);
 for (let page = 0; page < 4; page++) {
  await p.click(`[data-action="help-page"][data-id="${page}"]`);
  assert.equal(await p.$$eval('.guide-card', nodes => nodes.length), 3);
  assert.equal(await p.$eval('.quick-guide', e => e.scrollHeight <= e.clientHeight), true);
  assert.equal(await p.$eval('.quick-guide .mouse-guide', e => getComputedStyle(e).position), 'static');
  await p.screenshot({ path: `${out}/desktop-${page}.png` });
 }
 await p.waitForFunction(t => __app.game.time > t, {}, before);
 await p.click('.guide-close');
 assert.equal(await p.evaluate(() => __app.modalOpen), false);
 // Opening / closing the guide preserves a deliberately paused game too.
 await p.keyboard.press('Space');
 await p.click('[data-action="help"]');
 assert.equal(await p.evaluate(() => __app.paused), true);
 await p.setViewport({ width: 390, height: 844 });
 for (let page = 0; page < 4; page++) {
  await p.click(`[data-action="help-page"][data-id="${page}"]`);
  assert.equal(await p.$eval('.quick-guide', e => e.scrollWidth <= e.clientWidth), true);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await p.screenshot({ path: `${out}/mobile-${page}.png` });
 }
 await p.$eval('.quick-guide .primary', e => e.scrollIntoView());
 await p.screenshot({ path: `${out}/mobile-controls.png` });
 await p.click('.quick-guide .primary');
 assert.equal(await p.evaluate(() => __app.modalOpen), false);
 assert.equal(await p.evaluate(() => __app.paused), true);
 await p.setViewport({ width: 1440, height: 900 });
 await p.click('[data-action="help"]');
 await p.keyboard.press('Escape');
 assert.equal(await p.evaluate(() => __app.modalOpen), false);
 assert.deepEqual(errors, []);
 console.log('PASS: four visual sections, desktop fit, mobile scrolling, close / Escape, unchanged pause state, simulation advances during help, no browser errors.');
} finally { await browser.close(); }
