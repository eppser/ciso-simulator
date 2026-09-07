import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Edited capture of real controls and ordinary waves; never creates ranked tickets.
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178/';
const out=fs.mkdtempSync('artifacts/github-demo-');
const fps=12,errors=[];let frame=0;
const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await browser.newPage();await p.setViewport({width:1440,height:1000});
 p.on('pageerror',e=>errors.push(e.message));
 await p.setRequestInterception(true);p.on('request',r=>r.url().includes('/api/')?r.respond({status:200,contentType:'application/json',body:JSON.stringify({error:'Unranked media capture',rows:[]})}):r.continue());
 await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 const capture=async(n,steps=0)=>{for(let i=0;i<n;i++){
  await p.evaluate(async steps=>{const a=window.__app;if(a?.running){for(let s=0;s<steps;s++)a.game.tick(1/30);a.ui.closeCall();a.ui.callQueue=[];a.ui.update();}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},steps);
  await p.screenshot({path:`${out}/${String(frame++).padStart(4,'0')}.jpg`,quality:92});
 }};
 const caption=async text=>p.evaluate(text=>{let e=document.querySelector('#demo-caption');if(!e){e=document.createElement('div');e.id='demo-caption';e.style.cssText='position:fixed;z-index:9999;pointer-events:none;left:350px;bottom:114px;padding:12px 18px;background:#080e16e8;border-left:3px solid #ff4b3e;border-radius:3px;color:#f4f6fa;font:700 20px Arial;box-shadow:0 6px 30px #0005';document.body.append(e);}e.textContent=text;},text);
 await p.screenshot({path:'docs/media/choose-your-company.png'});await capture(12);
 await p.click('[data-action=start][data-id=enterprise]');
 await p.evaluate(()=>{const a=__app;a.paused=true;a.audio.enabled=false;window.demoStats={shots:0,waf:0,peakThreats:0,placements:[]};const fx=a.game.fx.bind(a.game);a.game.fx=(type,...args)=>{if(type==='shot')demoStats.shots++;if(type==='waf-audio')demoStats.waf++;return fx(type,...args);};a.rig.goTo({x:1.5,z:11,dist:24,yaw:-.35,pitch:.9});});
 await caption('01 / BUILD THE PERIMETER');await capture(12);
 const place=async(type,x,y)=>{
  if(await p.evaluate(()=>__app.buildType)!==type)await p.click(`[data-action=build][data-id=${type}]`);
  const point=await p.evaluate(({type,x,y})=>{const a=__app,candidates=[];for(let cx=1;cx<7;cx++)for(let cy=2;cy<20;cy++){
   if(!a.game.canPlace(type,cx,cy).ok)continue;const v=a.hit.clone().set(cx,0,cy).project(a.rig.camera),px=(v.x+1)*innerWidth/2,py=(1-v.y)*innerHeight/2;
   if(px>340&&px<1050&&py>160&&py<810&&document.elementFromPoint(px,py)?.id==='c')candidates.push({x:cx,y:cy,px,py,d:(cx-x)**2+(cy-y)**2});
  }return candidates.sort((a,b)=>a.d-b.d)[0];},{type,x,y});
  assert.ok(point,'Visible build cell for '+type);await p.mouse.move(point.px,point.py,{steps:8});await capture(4);
  const count=await p.evaluate(()=>__app.game.walls.size+__app.game.towers.length);await p.mouse.click(point.px,point.py);
  assert.equal(await p.evaluate(()=>__app.game.walls.size+__app.game.towers.length),count+1);
  await p.evaluate(({type,point})=>demoStats.placements.push({type,x:point.x,y:point.y}),{type,point});await capture(type==='wall'?4:10);
 };
 for(const y of [7,8,9,12,13])await place('wall',3,y);
 await caption('02 / LAYER IPS + WEB DEFENSES');
 await place('ips',2,10);await place('waf',4,11);await place('ndr',4,9);
 await p.mouse.click(750,500,{button:'right'});await p.mouse.move(1360,90);
 await p.screenshot({path:'docs/media/build-defense.png'});
 await p.click('[data-action=tab][data-id=programs]');
 if(!await p.$('[data-action=buy][data-id=scanner]'))await p.click('[data-action=track][data-id=Identify]');
 await p.click('[data-action=buy][data-id=scanner]');assert.equal(await p.evaluate(()=>__app.game.bought('scanner')),true);
 await caption('03 / SCAN. FIND THE REAL EXPOSURE.');await capture(18,20);
 await p.screenshot({path:'docs/media/scan-exposure.png'});
 await p.click('[data-action=tab][data-id=build]');
 // Jump cut through ordinary game time, leaving actual defenses intact.
 await p.evaluate(()=>{const a=__app,g=a.game;while(g.hour<8&&!['won','lost'].includes(g.phase)){
  if(g.phase==='prep')g.startHourEarly();g.tick(1/30);g.effects.length=0;g.popups.length=0;
 }a.ui.closeCall();a.ui.callQueue=[];g.messages.forEach(m=>a.seenMessages.add(m.seq));demoStats.shots=0;demoStats.waf=0;a.ui.update();});
 assert.equal(await p.evaluate(()=>__app.game.hour),8);
 await caption('04 / LATER THAT DAY: HOLD THE LINE');
 await p.evaluate(()=>{__app.rig.goTo({x:.5,z:10.2,dist:23,yaw:-.3,pitch:.9});if(__app.game.phase==='prep')__app.game.startHourEarly();__app.paused=false;__app.simNow=performance.now();});
 let combatFrames=0;
 for(let i=0;i<168;i++){
  await p.evaluate(()=>{if(__app.game.phase==='prep')__app.game.startHourEarly();});
  await capture(1,8);const stats=await p.evaluate(()=>{demoStats.peakThreats=Math.max(demoStats.peakThreats,__app.game.attackers.length);return{...demoStats,phase:__app.game.phase,activeThreats:__app.game.attackers.length};});
  if(stats.activeThreats>0)combatFrames++;
  if(i===142)await p.screenshot({path:'docs/media/campus-live.png'});
  if(i===105)await caption('BUILD ROUTES. STOP EXPLOITS. KEEP THE COMPANY ALIVE.');
  assert.ok(!['won','lost'].includes(stats.phase),'Capture stays in live combat');
 }
 const stats=await p.evaluate(()=>demoStats);console.log(JSON.stringify({stats,combatFrames}));assert.ok(stats.shots>8,'Actual IPS shooting');assert.ok(stats.peakThreats>=3,'Multiple real attackers');assert.ok(combatFrames>=100,'Most combat frames show active threats');assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/capture.json',JSON.stringify({base,fps,frames:frame,seconds:frame/fps,stats,errors,notes:'Real browser controls and simulation. Preparation condensed; jump cut to hour eight; accelerated combat. No invented budgets, enemies or VFX. No ranked writes.'},null,2));
 console.log(JSON.stringify({out,frames:frame,seconds:frame/fps,stats}));
}finally{await browser.close();}
const encode=args=>{const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});assert.equal(r.status,0,'ffmpeg encode');};
encode(['-framerate',String(fps),'-i',out+'/%04d.jpg','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','docs/media/gameplay.mp4']);
encode(['-i','docs/media/gameplay.mp4','-filter_complex','[0:v]fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=80:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle','-loop','0','docs/media/gameplay.gif']);
console.log('Encoded GIF and high-resolution MP4 from verified gameplay frames.');
