import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178',out='artifacts/v23';
fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await browser.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
 // UI fault injection runs are not legitimate ranked entries; do not consume tickets.
 await p.setRequestInterception(true);p.on('request',r=>new URL(r.url()).pathname==='/api/run'?r.respond({status:400,contentType:'application/json',body:'{"error":"UI audit practice run"}'}):r.continue());
 await p.setViewport({width:1600,height:1000});await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 for(const org of ['startup','midcap','enterprise']){
  await p.evaluate(org=>{const a=__app;a.start(org,'full');a.paused=true;a.audio.enabled=false;a.ui.closeCall();a.ui.closeModal();a.ui.callQueue=[];a.select({kind:'asset',id:a.game.firstAssetId});a.ui.update();},org);
  assert.match(await p.$eval('#inspect',e=>e.textContent),/UNSCANNED/);assert.doesNotMatch(await p.$eval('#inspect',e=>e.textContent),/CVE-/);
  assert.equal(await p.evaluate(()=>[...__app.game.assets.values()].some(a=>a.knownVulns!==null)),false);
  await p.evaluate(()=>{const a=__app,g=a.game;g.budget=1000;g.buy('scanner');for(let i=0;i<g.assets.size;i++)g.tickScanner(5);a.ui.update();});
  assert.match(await p.$eval('#inspect',e=>e.textContent),/CVE-/);
  await p.waitForFunction(()=>[...__app.exposureMarkers.entries.values()].some(e=>e.sprite.visible));
  const markers=await p.evaluate(()=>[...__app.exposureMarkers.entries.values()].filter(e=>e.sprite.visible).map(e=>e.text));assert.ok(markers.every(t=>!t.includes('NO KNOWN')));
  await p.evaluate(()=>{const a=__app,g=a.game;g.asset(g.firstAssetId).state='compromised';a.select(null);a.ui.update();});
  await p.click('#activity-log [data-action=operation-action][data-id^="infection-"]');
  const placement=await p.evaluate(()=>{const inspect=document.querySelector('#inspect'),feed=document.querySelector('#activity-log');return{left:inspect.getBoundingClientRect().left,feedVisible:getComputedStyle(feed).display!=='none'};});
  assert.ok(placement.left<100);assert.ok(placement.feedVisible);
  await p.$eval('#inspect [data-action=respond]',e=>e.scrollIntoView({block:'center'}));
  const before=await p.evaluate(()=>__app.game.budget);await p.click('#inspect [data-action=respond]');
  assert.equal(await p.evaluate(()=>__app.game.asset(__app.game.firstAssetId).state),'responding');assert.ok(await p.evaluate(()=>__app.game.budget)<before);
  await p.screenshot({path:`${out}/${org}-response.png`});
  await p.evaluate(()=>{const a=__app,g=a.game;g.tickJobs(1000);g.asset(g.firstAssetId).state='compromised';g.budget=0;a.ui.update();});
  assert.ok(await p.$eval('#inspect [data-action=respond]',e=>e.disabled));assert.match(await p.$eval('#inspect',e=>e.textContent),/Needs \$/);
  await p.evaluate(()=>{const a=__app,g=a.game;g.budget=1000;g.requestEvidence();g.regulator={deadline:g.time+100,filed:false};g.hour=4;g.tickGrc();a.select(null);a.ui.update();});
  await p.click('#activity-log [data-action=operation-action][data-id=fbi-evidence]');
  assert.equal(await p.evaluate(()=>__app.ui.track),'Respond');assert.equal(await p.$('#activity-log [data-action=evidence-prepare]'),null);
  await p.click('#panel [data-action=evidence-prepare]');assert.equal(await p.evaluate(()=>__app.game.evidence.state),'working');
  assert.ok(await p.$('#panel .program-card [data-action=file]'));await p.click('[data-action=track][data-id=Govern]');assert.ok(await p.$('#panel .program-card [data-action=freeze]'));
  assert.doesNotMatch(await p.$eval('#panel',e=>e.textContent),/ALL CAPABILITIES/);
  await p.screenshot({path:`${out}/${org}-operations.png`});results.push({org,recoveryClick:true,hiddenUntilScanned:true,requestLink:true});
 }
 await p.setViewport({width:1024,height:844});await p.evaluate(()=>{__app.select(null);__app.ui.update();});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({base,results,errors}));
}finally{await browser.close();}
