import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/actions-pacing-v20';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:900});await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.click('[data-action="start"][data-id="startup"]');
 await p.evaluate(()=>{const a=__app,g=a.game;a.paused=true;a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];g.hour=4;g.tickGrc();g.buy('scanner');for(const s of g.assets.values())s.knownVulns=new Set(s.vulns);g.requestEvidence();a.ui.update();});
 await p.click('#activity-log [data-action="track"][data-id="Actions"]');assert.equal(await p.evaluate(()=>__app.ui.track),'Actions');
 const cash=await p.evaluate(()=>__app.game.budget);await p.click('#panel [data-action="grc-start"][data-id="inventory"]');
 assert.equal(await p.evaluate(()=>__app.game.grc[0].state),'working');assert.equal(await p.evaluate(()=>__app.game.jobs.filter(j=>j.programme==='grc-inventory').length),1);
 assert.equal(await p.evaluate(()=>__app.game.budget),cash-4);
 await p.click('#panel [data-action="evidence-prepare"]');assert.equal(await p.evaluate(()=>__app.game.evidence.state),'working');
 await p.evaluate(()=>{const g=__app.game,t=g.startHumanThreat('worker-fraud');t.detectedAt=g.time;g.discover(g.asset(t.assetId),'test verification');window.humanId=t.id;__app.ui.update();});
 const id=await p.evaluate(()=>humanId),before=await p.evaluate(()=>__app.game.budget);
 await p.click(`#panel [data-action="human-contain"][data-id="${id}"]`);assert.equal(await p.evaluate(()=>__app.game.humanThreats.find(t=>t.id===humanId).state),'contained');assert.equal(await p.evaluate(()=>__app.game.budget),before);
 assert.equal(await p.$eval(`#panel [data-action="human-investigate"][data-id="${id}"]`,e=>e.disabled),true);
 await p.screenshot({path:`${out}/program-actions.png`});
 await p.click('#panel [data-action="action-route"][data-id="assets"]');assert.equal(await p.evaluate(()=>__app.ui.tab),'assets');
 await p.click('#activity-log [data-action="track"][data-id="Actions"]');await p.click('#panel [data-action="action-route"][data-id="team"]');assert.equal(await p.evaluate(()=>__app.ui.tab),'team');
 await p.setViewport({width:390,height:844});await p.evaluate(()=>{__app.ui.tab='programs';__app.ui.track='Actions';__app.ui.signature='';__app.ui.renderPanel();});
 const fit=await p.$eval('#panel',e=>e.scrollWidth<=e.clientWidth);assert.ok(fit);assert.ok(await p.$('#panel [data-action="track"][data-id="Actions"]'));
 await p.screenshot({path:`${out}/mobile-actions.png`});assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify({errors,fit,checks:'Programs/Operations share task IDs, costs, capacity and state; free containment while all engineers busy; target and Team routes; mobile Actions visible'},null,2));console.log('Shared action browser checks passed');
}finally{await b.close();}
