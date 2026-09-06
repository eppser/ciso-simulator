import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.SMOKE_OUT||'artifacts/v5/smoke';fs.mkdirSync(out,{recursive:true});
const server=spawn('npx',['vite','preview','--host','127.0.0.1','--port','5181','--strictPort'],{detached:true,stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('5181'))resolve();});server.on('exit',()=>reject(new Error('Preview server exited')));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
 browser=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--window-size=1600,1000']});
 const page=await browser.newPage();await page.setViewport({width:1600,height:1000});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)requests.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://127.0.0.1:5181/',{waitUntil:'networkidle0'});await page.waitForSelector('[data-action=start]');
 await page.screenshot({path:`${out}/01-start.png`});
 await page.click('[data-action=start][data-id=startup]');await page.waitForFunction(()=>__app.running);
 assert.equal(await page.evaluate(()=>__app.game.org.id),'startup');assert.equal(await page.evaluate(()=>__app.game.endHour),24);
 await page.click('[data-action=tab][data-id=assets]');await page.click('[data-action=select][data-id=web]');await page.waitForSelector('[data-action=isolate]');await page.click('[data-action=isolate]');
 assert.equal(await page.evaluate(()=>__app.game.asset('web').state),'isolated');
 await page.evaluate(()=>{window.__focusProbe=document.querySelector('[data-action=inspect-close]');__focusProbe.focus();});await new Promise(r=>setTimeout(r,850));assert.ok(await page.evaluate(()=>document.activeElement===__focusProbe&&__focusProbe.isConnected));
 await page.waitForSelector('[data-action=patch]:not([disabled])',{timeout:25000});await page.click('[data-action=patch]');
 await page.waitForFunction(()=>!!__app.game.asset('web').queuedFix,{timeout:2500}).catch(async e=>{await page.screenshot({path:`${out}/failure-patch.png`});console.log(await page.evaluate(()=>({selected:__app.selected,asset:__app.game.asset('web').state,toast:document.querySelector('#toast').textContent,html:document.querySelector('#inspect').innerText})));throw e;});
 await page.screenshot({path:`${out}/02-asset-and-engineer.png`});
 await page.click('[data-action=tab][data-id=programs]');await page.click('[data-action=buy][data-id=scanner]');
 assert.ok(await page.evaluate(()=>__app.game.has('scanner')));
 await page.screenshot({path:`${out}/03-programs.png`});
 await page.click('[data-action=inspect-close]');await page.click('[data-action=camera][data-id=overview]');await page.click('[data-action=tab][data-id=build]');await new Promise(r=>setTimeout(r,800));
 const tile=await page.evaluate(()=>{const a=__app;for(let y=4;y<18;y++)for(let x=10;x<22;x++){if(!a.game.canPlace('wall',x,y).ok)continue;const v=new a.rig.camera.position.constructor(x,0,y).project(a.rig.camera);const p=[(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];if(document.elementFromPoint(...p)?.id==='c')return{x,y,p};}});
 assert.ok(tile);await page.click('[data-action=build][data-id=wall]');await page.mouse.move(...tile.p);await page.mouse.click(...tile.p);assert.ok(await page.evaluate(({x,y})=>__app.game.walls.has(y*30+x),tile));await page.keyboard.press('Escape');
 await page.evaluate(()=>{__app.paused=true;__app.ui.closeCall();__app.ui.callQueue=[];});await page.screenshot({path:`${out}/04-campus.png`});
 const measure=async name=>{
   const value=await page.evaluate(async()=>{const times=[];let last=performance.now();for(let i=0;i<240;i++)await new Promise(resolve=>requestAnimationFrame(t=>{times.push(t-last);last=t;resolve();}));const gl=__app.rig.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');times.sort((a,b)=>a-b);return{fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),p95FrameMs:times[Math.floor(times.length*.95)],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',drawCalls:__app.rig.renderer.info.render.calls,triangles:__app.rig.renderer.info.render.triangles,attackers:__app.game.attackers.length,viewport:[innerWidth,innerHeight],quality:__app.quality};});return{name,...value};};
 const metrics=[await measure('startup-campus')];
 // Full estate stress scene: 200 simultaneous sources, same actual render loop.
 await page.evaluate(()=>{__app.start('enterprise','full');__app.ui.closeModal();__app.paused=true;__app.ui.closeCall();__app.ui.callQueue=[];__app.game.attackers=[];const waves=__app.game.waves;for(let i=0;i<200;i++){const spec=waves[23].attackers[i%waves[23].attackers.length];__app.game.spawn({...spec,spawn:i%3,row:i%3});const at=__app.game.attackers.at(-1);at.x=2+(i%12)*.45;at.y=1+(i%36)*.55;at.revealed=true;}__app.ui.tab='build';__app.ui.signature='';});
 await new Promise(r=>setTimeout(r,1200));metrics.push(await measure('enterprise-200-sources'));await page.screenshot({path:`${out}/05-enterprise-pressure.png`});
 await page.evaluate(()=>{const g=__app.game;g.flags.ransomPrice=144;g.queueDilemma('ransom','core',true);});await page.waitForSelector('#decision-tray:not([hidden])');await page.screenshot({path:`${out}/06-ransom-decision.png`});await page.click('[data-action=choose][data-id=contain]');assert.equal(await page.evaluate(()=>__app.game.paused),false);
 await page.evaluate(()=>{__app.game.phase='won';__app.game.hour=24;__app.ui.ended=false;});await page.waitForSelector('.result-modal');assert.equal(await page.$$eval('.scores>div',e=>e.length),3);await page.screenshot({path:`${out}/07-report.png`});
 await page.click('.result-modal [data-action=menu]');await page.click('.source-note summary');const input=await page.$('#scenario-file');await input.uploadFile('data/day-2026-09-02.json');await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Report loaded'));
 await page.setViewport({width:390,height:844});await page.screenshot({path:`${out}/08-mobile-start.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.click('[data-action=start][data-id=startup]');await new Promise(r=>setTimeout(r,1000));await page.screenshot({path:`${out}/09-mobile-game.png`});
 const report={at:new Date().toISOString(),errors,failedRequests:requests,metrics,checks:['real UI start','isolate + queued fix','scanner purchase','map build click','camera presets','full estate stress','ransom choice exit','three category report','dynamic JSON import','390px layout']};fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(requests.length,0);
}finally{await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{server.kill();}}
