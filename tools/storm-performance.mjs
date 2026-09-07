import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/storm-v21/performance';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:1600,height:1000});await page.setRequestInterception(true);page.on('request',r=>r.url().includes('/api/')?r.respond({status:200,contentType:'application/json',body:JSON.stringify({error:'Performance fixture: practice only'})}):r.continue());await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await page.click('[data-action=start][data-id=midcap]');
 await page.evaluate(()=>{__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];__app.paused=true;});
 const measure=async name=>({name,...await page.evaluate(async()=>{
  const a=__app,frames=[],start=a.game.time,startCount=a.game.attackers.length;let prev=performance.now();
  for(let i=0;i<360;i++)await new Promise(resolve=>requestAnimationFrame(t=>{frames.push(t-prev);prev=t;resolve();}));
  frames.sort((a,b)=>a-b);const gl=a.rig.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95FrameMs:frames[Math.floor(frames.length*.95)],simulationSeconds:a.game.time-start,threatsAtStart:startCount,threatsAtEnd:a.game.attackers.length,drawCalls:a.rig.renderer.info.render.calls,triangles:a.rig.renderer.info.render.triangles,viewport:[innerWidth,innerHeight],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',phase:a.game.phase};
 })});
 await new Promise(r=>setTimeout(r,1800));const metrics=[await measure('midcap-opening-matched-user-resolution')];await page.screenshot({path:out+'/01-starting-view.png'});
 await page.evaluate(()=>{
  const a=__app;a.start('enterprise','full');a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.paused=true;
  const g=a.game;g.attackers=[];g.hour=12;g.phase='wave';g.phaseTimer=0;g.budget=3000;
  for(const [i,type]of ['ips','waf','ndr','ips','waf','ips','waf','honeytoken'].entries()){
   const x=3+(i%4)*2;for(let y=3+Math.floor(i/4)*8;y<20;y++)if(g.canPlace(type,x,y).ok){g.place(type,x,y);break;}
  }
  const ai=g.waves[8].attackers.find(t=>t.aiThreat),normal=g.waves.flatMap(w=>w.attackers).find(t=>!t.boss&&g.assetsByVuln.get(t.vuln)?.some(a=>a.exposed&&a.vulns.has(t.vuln)));
  for(let i=0;i<200;i++){g.spawn({...normal,avatar:i%3===0?'virus':'beetle',aiThreat:i<2,boss:i<2,spawn:i%3,row:i%3});const at=g.attackers.at(-1);at.x=.15+(i%9)*.24;at.y=1+(i%36)*.55;at.cx=Math.round(at.x);at.cy=Math.round(at.y);at.nx=at.cx;at.ny=at.cy;g.chooseTarget(at);at.revealed=true;}
  for(let i=0;i<12;i++)g.spawnInternalMalware([...g.assets.values()].find(a=>a.discovered&&a.trusted));
  a.rig.goTo('overview');a.ui.update();
 });
 await new Promise(r=>setTimeout(r,1600));metrics.push(await measure('enterprise-212-threat-rendering'));await page.screenshot({path:out+'/02-stress-render.png'});
 await page.evaluate(()=>{__app.paused=false;__app.simNow=performance.now();});
 metrics.push(await measure('enterprise-live-combat-and-pathfinding'));await page.screenshot({path:out+'/03-live-combat.png'});
 assert.ok(metrics.at(-1).simulationSeconds>3,'Live simulation must advance during profiling');
 assert.ok(await page.evaluate(()=>__app.game.attackers.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y))));
 assert.deepEqual(errors,[]);const report={at:new Date().toISOString(),errors,metrics,notes:'Native GPU. 1600×1000 CSS viewport at device scale 1. First two samples render paused fixtures; third runs real simulation, movement, targeting, effects, shadows and reflections. No universal-device guarantee.'};
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
