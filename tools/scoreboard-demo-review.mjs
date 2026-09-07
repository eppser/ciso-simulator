import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage();let mode='empty',writes=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setRequestInterception(true);p.on('request',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/api/')&&r.method()==='POST')writes++;if(path!=='/api/scores')return r.continue();return r.respond({status:mode==='error'?503:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'Leaderboard temporarily unavailable.'}:{rows:mode==='real'?[{name:'Verified Player',superskill:'Test fixture',score:7500,org:'midcap',outcome:'won',created_at:'2026-09-07',ruleset:'ciso-2026-09-v24',scenario:'2026-09-02'}]:[],more:false})});});
 await p.setViewport({width:1000,height:1050});await p.goto(base+'/scoreboard',{waitUntil:'networkidle0'});await p.waitForSelector('.lb-house-row');assert.equal((await p.$$('.lb-house-row')).length,6);assert.equal(await p.$eval('.lb-pagination',e=>getComputedStyle(e).display),'none');assert.equal(await p.$('[data-view=history]'),null);assert.doesNotMatch(await p.$eval('body',e=>e.textContent),/Example scores|Run history/);assert.deepEqual(await p.$$eval('.lb-column-head span',es=>es.map(e=>e.textContent)),['USERNAME','SCORE','LIFE MOTTO']);
 assert.equal(await p.$('.lb-bot'),null);assert.equal((await p.$$('.lb-seed-note')).length,1);assert.match(await p.$eval('.lb-seed-note',e=>e.textContent),/not verified player runs/);assert.equal((await p.$$('.lb-podium')).length,3);assert.ok(await p.$('.lb-hero-art'));
 fs.mkdirSync('artifacts/scoreboard-demo',{recursive:true});await p.screenshot({path:'artifacts/scoreboard-demo/desktop.png'});
 mode='real';await p.reload({waitUntil:'networkidle0'});await p.waitForFunction(()=>document.querySelector('.lb-rows')?.textContent.includes('Verified Player'));assert.equal(await p.$('.lb-house-row'),null);assert.equal(await p.$eval('.lb-points',e=>e.textContent),'7,500');
 mode='error';await p.reload({waitUntil:'networkidle0'});await p.waitForSelector('.lb-house-row');assert.match(await p.$eval('.lb-live-status',e=>e.textContent),/unavailable/);
 mode='empty';await p.click('.lb-retry');await p.waitForFunction(()=>document.querySelector('.lb-live-status')?.textContent==='');assert.equal(await p.$('.lb-retry'),null);
 await p.setViewport({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:'artifacts/scoreboard-demo/mobile.png'});
 assert.equal(writes,0);assert.deepEqual(errors,[]);console.log('Six seeded scores at 1–2k; username/score/motto only; no history; real scores, offline/retry and mobile passed; zero API writes.');
}finally{await b.close();}
