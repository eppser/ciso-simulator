import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/hud-v19';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:900});
 await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.click('[data-action="start"][data-id="midcap"]');
 await p.evaluate(()=>{__app.paused=true;__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];window.savedGame=__app.game;__app.game.budget=237;});
 await p.waitForFunction(()=>!__app.rig.tween);assert.equal(await p.$('#grc-toggle'),null);
 await p.screenshot({path:`${out}/clean.png`});
 await p.click('.utilities [data-action="menu"]');await p.screenshot({path:`${out}/menu.png`});
 await p.click('[data-action="resume"]');assert.ok(await p.evaluate(()=>__app.game===savedGame&&__app.game.budget===237&&__app.paused));
 await p.click('.utilities [data-action="menu"]');await p.click('[data-action="restart"]');assert.ok(await p.$('[data-action="restart-confirm"]'));
 await p.click('.session-menu [data-action="menu"]');await p.click('[data-action="resume"]');assert.ok(await p.evaluate(()=>__app.game===savedGame));
 await p.evaluate(()=>__app.paused=false);await p.click('.utilities [data-action="menu"]');const time=await p.evaluate(()=>__app.game.time);await p.waitForFunction(t=>__app.game.time>t,{},time);await p.keyboard.press('Escape');assert.ok(await p.evaluate(()=>!__app.modalOpen&&__app.game===savedGame));
 await p.click('.utilities [data-action="menu"]');await p.click('[data-action="restart"]');await p.click('[data-action="restart-confirm"]');
 assert.ok(await p.evaluate(()=>__app.game!==savedGame&&__app.game.org.id==='midcap'&&__app.game.trust===5&&__app.game.time<2));
 await p.evaluate(()=>{__app.paused=true;__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];const g=__app.game;g.asset('ad').state='compromised';g.hour=4;g.tickGrc();g.requestEvidence();__app.ui.update();});
 await p.waitForSelector('[data-action="ops-expand"][data-id="infection-ad"]');await p.click('[data-action="ops-expand"][data-id="infection-ad"]');await p.screenshot({path:`${out}/incident.png`});
 await p.click('[data-action="ops-view"][data-id="requests"]');await p.click('[data-action="ops-expand"][data-id="fbi-evidence"]');assert.ok(await p.$('[data-action="evidence-prepare"]'));await p.click('[data-action="evidence-prepare"]');assert.equal(await p.evaluate(()=>__app.game.evidence.state),'working');
 await p.click('[data-action="ops-view"][data-id="work"]');assert.match(await p.$eval('#activity-log',e=>e.textContent),/Preserve & review/);
 await p.click('[data-action="ops-history"]');await p.evaluate(()=>__app.ui.update());assert.ok(await p.$('.log-entries'));await p.screenshot({path:`${out}/history.png`});
 await p.setViewport({width:390,height:844});await p.evaluate(()=>{__app.ui.opsHistory=false;__app.ui.opsView='all';__app.ui.opsExpanded=new Set();__app.ui.update();});
 await p.screenshot({path:`${out}/mobile.png`});const r=await p.$eval('#activity-log',e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom,scroll:e.scrollWidth,width:e.clientWidth};});assert.ok(r.left>=0&&r.right<=390&&r.bottom<744);assert.ok(r.scroll<=r.width);
 await p.click('.utilities [data-action="menu"]');await p.screenshot({path:`${out}/mobile-menu.png`});await p.click('[data-action="resume"]');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify({errors,mobile:r,checks:'menu identity retained, restart cancellation/confirmation, live menu, absent Governance button, priority cards, evidence action, work filter, history, mobile'},null,2));console.log('HUD and menu checks passed');
}finally{await b.close();}
