import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out='artifacts/super-audit/browser';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await browser.newPage(),errors=[],badResponses=[],checks=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)badResponses.push(r.url());});
 await p.setViewport({width:1600,height:1000});
 await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});
 for(const org of ['startup','midcap','enterprise']){
  await p.evaluate(org=>{const a=__app;a.start(org,'full');a.audio.enabled=false;a.paused=true;a.ui.closeCall();a.ui.callQueue=[];a.ui.activityVisible=false;const g=a.game;g.budget=1000;g.startHumanThreat('worker-fraud');g.startHumanThreat('insider');a.ui.update();},org);
  if(await p.$eval('#activity-log',e=>e.hidden))await p.click('#activity-toggle');
  assert.ok((await p.$eval('#activity-log',e=>e.innerText)).includes('Source under review'));
  assert.equal(await p.evaluate(()=>__app.threatMarkers.pins.length),0);
  await p.evaluate(()=>{const a=__app,g=a.game;g.time+=46;g.tickHumanThreats(1);a.ui.update();});
  await p.waitForFunction(()=>__app.threatMarkers.pins.length>0);
  assert.ok((await p.$eval('#activity-log',e=>e.innerText)).includes('DPRK-linked remote-worker fraud'));
  assert.ok((await p.$eval('#activity-log',e=>e.innerText)).includes('Insider threat'));
  const ids=await p.evaluate(()=>Object.fromEntries(__app.game.humanThreats.map(t=>[t.kind,t.id])));
  if(org==='midcap'){
   await p.evaluate(()=>__app.ui.showCall('worker_intro'));
   await p.screenshot({path:out+'/01-worker-call-and-threats.png'});
   assert.ok(await p.$eval('.portrait.contractor',e=>getComputedStyle(e).backgroundImage.includes('remote-contractor')));
   await p.evaluate(()=>__app.ui.closeCall());
  }
  // Real UI order must work even when funds are exhausted.
  await p.evaluate(()=>{__app.game.budget=0;__app.ui.update();});
  await p.click(`[data-action="human-contain"][data-id="${ids['worker-fraud']}"]`);
  await p.click(`[data-action="human-contain"][data-id="${ids.insider}"]`);
  const frozen=await p.evaluate(()=>({loss:__app.game.stats.fraudLoss+__app.game.stats.insiderLoss,impact:__app.game.impact}));
  await p.evaluate(()=>{const g=__app.game;g.time+=10;g.tickHumanThreats(10);__app.ui.update();});
  assert.deepEqual(await p.evaluate(()=>({loss:__app.game.stats.fraudLoss+__app.game.stats.insiderLoss,impact:__app.game.impact})),frozen);
  assert.ok(await p.$eval(`[data-action="human-investigate"][data-id="${ids['worker-fraud']}"]`,e=>e.disabled));
  await p.evaluate(()=>{__app.game.budget=1000;__app.ui.update();});
  for(const id of Object.values(ids)){
   const before=await p.evaluate(()=>__app.game.budget);
   await p.click(`[data-action="human-investigate"][data-id="${id}"]`);
   assert.equal(await p.evaluate(id=>__app.game.humanThreats.find(t=>t.id===id).state,id),'investigating');
   assert.ok(await p.evaluate(before=>__app.game.budget<before,before));
   await p.evaluate(()=>{const g=__app.game;g.time+=100;g.tickJobs(100);g.recordScoreState();__app.ui.update();});
   assert.equal(await p.evaluate(id=>__app.game.humanThreats.find(t=>t.id===id).state,id),'resolved');
  }
  await p.waitForFunction(()=>__app.threatMarkers.pins.length===0);
  assert.ok((await p.$eval('#activity-log',e=>e.innerText)).includes('No open incidents'));
  checks.push(`${org}: unknown source hidden, detection/markers, free revocation at $0, loss stopped, budget gate, paid investigation, closure clears map/log`);
 }
 // Mixed incident fixture: leak detector is required even with workforce markers present.
 await p.evaluate(()=>{
  const a=__app;a.start('midcap','full');a.audio.enabled=false;a.paused=true;a.ui.closeCall();a.ui.callQueue=[];a.ui.activityVisible=true;
  const g=a.game;g.budget=1000;g.startHumanThreat('worker-fraud');g.startHumanThreat('insider',g.asset('ad'));for(const t of g.humanThreats)g.detectHumanThreat(t.id);
  const source=[...g.assets.values()].find(b=>b.personalData&&!b.exposed&&b.state==='ok');g.startLeak(source);g.programmes.add('dlp');g.programReady.set('dlp',0);g.tickIncidents(1);
  const supply=[...g.assets.values()].find(b=>b.trusted);supply.supplySource=true;g.compromise(supply,{vuln:'supply chain: malicious update'},null);a.ui.update();
 });
 await p.waitForFunction(()=>__app.threatMarkers.pins.length>=2);
 await p.$eval('.active-threats',e=>e.scrollIntoView({block:'start'}));
 await p.screenshot({path:out+'/02-mixed-active-threats.png'});
 const performance=await p.evaluate(async()=>{const frames=[];let prev=performance.now();for(let i=0;i<300;i++)await new Promise(resolve=>requestAnimationFrame(t=>{frames.push(t-prev);prev=t;resolve();}));frames.sort((a,b)=>a-b);return{fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95FrameMs:frames[Math.floor(frames.length*.95)],markers:__app.threatMarkers.entries.filter(e=>e.sprite.visible).length,viewport:[innerWidth,innerHeight],fixture:'Mixed incidents, simulation paused; render-only sample'};});
 await p.evaluate(()=>{const a=__app,g=a.game;g.phase='wave';g.phaseTimer=0;const normal=g.waves.flatMap(w=>w.attackers).find(t=>!t.boss&&g.assetsByVuln.get(t.vuln)?.some(b=>b.exposed&&b.vulns.has(t.vuln)));for(let i=0;i<200;i++)g.spawn({...normal,avatar:i%3?'beetle':'virus',spawn:i%3,row:i%3});a.paused=false;});
 performance.live=await p.evaluate(async()=>{const frames=[],start=__app.game.time,count=__app.game.attackers.length;let prev=performance.now();for(let i=0;i<300;i++)await new Promise(resolve=>requestAnimationFrame(t=>{frames.push(t-prev);prev=t;resolve();}));frames.sort((a,b)=>a-b);return{fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95FrameMs:frames[Math.floor(frames.length*.95)],attackersAtStart:count,attackersAtEnd:__app.game.attackers.length,simSeconds:__app.game.time-start,markers:__app.threatMarkers.entries.filter(e=>e.sprite.visible).length};});
 assert.ok(performance.live.simSeconds>3,'Real combat must advance while profiling');
 performance.live.fixture='Pathological burst: 200 simultaneous attackers stacked at uplinks, no defending towers';
 await p.evaluate(()=>{const g=__app.game;g.attackers.forEach((at,i)=>{at.x=.2+(i%9)*.24;at.y=1+(i%36)*.55;at.cx=Math.round(at.x);at.cy=Math.round(at.y);at.nx=at.cx;at.ny=at.cy;g.chooseTarget(at);});});
 performance.distributed=await p.evaluate(async()=>{const frames=[],start=__app.game.time,count=__app.game.attackers.length;let prev=performance.now();for(let i=0;i<300;i++)await new Promise(resolve=>requestAnimationFrame(t=>{frames.push(t-prev);prev=t;resolve();}));frames.sort((a,b)=>a-b);return{fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95FrameMs:frames[Math.floor(frames.length*.95)],attackersAtStart:count,attackersAtEnd:__app.game.attackers.length,simSeconds:__app.game.time-start,fixture:'Same live attackers distributed across the three uplink lanes'};});
 await p.evaluate(()=>{__app.paused=true;__app.ui.closeCall();__app.ui.callQueue=[];});
 await p.setViewport({width:390,height:844});
 await p.$eval('.active-threats',e=>e.scrollIntoView({block:'start'}));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await p.$eval('#activity-log',e=>e.scrollWidth>e.clientWidth),false);
 await p.screenshot({path:out+'/03-mobile-threats.png'});
 await p.evaluate(()=>{__app.start('startup','full');__app.paused=true;__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];});
 await p.waitForFunction(()=>__app.threatMarkers.pins.length===0);
 checks.push('Mixed leaks/supply chain/people incidents, desktop/mobile layout, fresh game clears markers');
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
 const report={at:new Date().toISOString(),checks,performance,errors,badResponses};fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
