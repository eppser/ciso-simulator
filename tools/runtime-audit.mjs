import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178/';
const label=process.env.AUDIT_LABEL||'baseline',out=`artifacts/runtime-${label}`;fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1600,height:1000,deviceScaleFactor:1});
 await p.setRequestInterception(true);p.on('request',r=>r.url().includes('/api/')?r.respond({status:200,contentType:'application/json',body:JSON.stringify({error:'Unranked performance test',rows:[]})}):r.continue());
 await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 const cdp=await p.createCDPSession();await cdp.send('Performance.enable');await cdp.send('Profiler.enable');
 const setup=async stress=>p.evaluate(stress=>{const a=__app;a.start(stress?'enterprise':'midcap','full');a.audio.enabled=false;a.paused=true;a.ui.closeCall();a.ui.callQueue=[];
  if(stress){const g=a.game;g.hour=12;g.phase='wave';g.budget=3000;for(const [i,type]of ['ips','waf','ndr','ips','waf','ips','waf','honeytoken'].entries()){const x=3+(i%4)*2;for(let y=3+Math.floor(i/4)*8;y<20;y++)if(g.canPlace(type,x,y).ok){g.place(type,x,y);break;}}
   const normal=g.waves.flatMap(w=>w.attackers).find(t=>!t.boss&&g.assetsByVuln.get(t.vuln)?.some(a=>a.exposed&&a.vulns.has(t.vuln)));
   for(let i=0;i<200;i++){g.spawn({...normal,avatar:i%3===0?'virus':'beetle',aiThreat:i<2,boss:i<2,spawn:i%3,row:i%3});const at=g.attackers.at(-1);at.x=.15+(i%9)*.24;at.y=1+(i%36)*.55;at.cx=Math.round(at.x);at.cy=Math.round(at.y);at.nx=at.cx;at.ny=at.cy;g.chooseTarget(at);at.revealed=true;}
   a.rig.goTo('overview');
  }
  window.renderSamples=[];const render=a.rig.render.bind(a.rig);if(!a.rig.auditInstalled){a.rig.auditInstalled=true;a.rig.render=function(...args){const start=performance.now();const result=render(...args);renderSamples.push({at:start,ms:performance.now()-start});return result;};}
 },stress);
 const snapshot=()=>p.evaluate(()=>({heap:performance.memory?.usedJSHeapSize,geometries:__app.rig.renderer.info.memory.geometries,textures:__app.rig.renderer.info.memory.textures,programs:__app.rig.renderer.info.programs.length,drawCalls:__app.rig.renderer.info.render.calls,triangles:__app.rig.renderer.info.render.triangles,sceneObjects:(()=>{let n=0;__app.rig.scene.traverse(()=>n++);return n;})(),attackers:__app.game.attackers.length}));
 const reports=[];
 for(const stress of [false,true]){await setup(stress);await new Promise(r=>setTimeout(r,2500));await cdp.send('HeapProfiler.collectGarbage');await p.evaluate(()=>renderSamples=[]);const before=await cdp.send('Performance.getMetrics');await cdp.send('Profiler.start');await new Promise(r=>setTimeout(r,6000));const profile=await cdp.send('Profiler.stop'),after=await cdp.send('Performance.getMetrics');
  const metric=(m,n)=>m.metrics.find(x=>x.name===n)?.value||0;const time=metric(after,'Timestamp')-metric(before,'Timestamp');const weights=new Map();profile.profile.samples?.forEach((id,i)=>weights.set(id,(weights.get(id)||0)+(profile.profile.timeDeltas?.[i]||0)));
  const hottest=profile.profile.nodes.map(n=>({name:n.callFrame.functionName,url:n.callFrame.url.split('/').pop(),ms:(weights.get(n.id)||0)/1000})).sort((a,b)=>b.ms-a.ms).slice(0,18);
  const render=await p.evaluate(()=>{const s=renderSamples.map(x=>x.ms).sort((a,b)=>a-b);return{frames:s.length,meanSubmitMs:s.reduce((a,b)=>a+b,0)/s.length,p95SubmitMs:s[Math.floor(s.length*.95)]};});
  reports.push({scene:stress?'200-threats':'opening',...await snapshot(),...render,fps:render.frames/time,cpuMsPerSecond:(metric(after,'TaskDuration')-metric(before,'TaskDuration'))*1000/time,scriptMsPerSecond:(metric(after,'ScriptDuration')-metric(before,'ScriptDuration'))*1000/time,hottest});
  await p.screenshot({path:`${out}/${stress?'stress':'opening'}.png`});
 }
 const restarts=[];for(let i=0;i<8;i++){await setup(false);await new Promise(r=>setTimeout(r,500));await cdp.send('HeapProfiler.collectGarbage');restarts.push(await snapshot());}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({base,label,reports,restarts,errors},null,2));console.log(JSON.stringify({base,label,reports,restarts,errors},null,2));
}finally{await browser.close();}
