import puppeteer, {KnownDevices} from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178',out='artifacts/v24';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setRequestInterception(true);p.on('request',r=>new URL(r.url()).pathname==='/api/run'?r.respond({status:400,contentType:'application/json',body:'{"error":"UI audit practice run"}'}):r.continue());
 await p.setViewport({width:1600,height:1000});await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('.organization-card');
 assert.equal(await p.evaluate(()=>document.activeElement?.classList.contains('organization-card')),false);
 assert.equal(await p.$('.organization-card.selected'),null);await p.screenshot({path:out+'/start.png'});
 for(const org of ['startup','midcap','enterprise']){
  if(org!=='startup')await p.evaluate(()=>__app.ui.startScreen());
  await p.click(`.organization-card[data-id=${org}]`);
  await p.evaluate(()=>{__app.paused=true;__app.audio.enabled=false;__app.ui.closeModal();__app.ui.closeCall();__app.ui.callQueue=[];__app.ui.update();});
  assert.equal(await p.evaluate(()=>__app.game.org.id),org);
  assert.equal(await p.evaluate(()=>__app.game.trust),5);
  await p.click('[data-action=menu]');await p.click('[data-action=resume]');assert.equal(await p.evaluate(()=>__app.game.org.id),org);
 }
 await p.click('[data-action=tab][data-id=programs]');
 assert.deepEqual(await p.$$eval('.track-tabs button',es=>es.map(e=>e.textContent)),['Actions','Govern','Identify','Protect','Detect','Respond','Recover']);
 for(const [track,program] of [['Identify','scanner'],['Protect','mfa'],['Detect','awareness'],['Respond','comms'],['Recover','backups'],['Govern','briefing']]){
  await p.click(`[data-action=track][data-id=${track}]`);assert.ok(await p.$(`[data-action=buy][data-id=${program}]`));
 }
 await p.click('[data-action=track][data-id=Identify]');
 await p.screenshot({path:out+'/desktop.png'});await p.screenshot({path:out+'/hud.png',clip:{x:0,y:0,width:1600,height:100}});
 for(const width of [1440,1280,1100]){
  await p.setViewport({width,height:900});
  const bounds=await p.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,right:b.right,y:b.y,bottom:b.bottom}};return{brand:r(document.querySelector('.brand-block')),stats:r(document.querySelector('.topstats')),utils:r(document.querySelector('.utilities')),width:innerWidth};});
  assert.ok(bounds.brand.right<=bounds.stats.x+2,JSON.stringify(bounds));assert.ok(bounds.stats.right<=bounds.utils.x+2,JSON.stringify(bounds));assert.ok(bounds.utils.right<=width+1);
 }
 // Local fixture proves mixed difficulties, escaped public text and pagination UI without publishing test scores.
 const q=await b.newPage();await q.setRequestInterception(true);q.on('request',r=>new URL(r.url()).pathname==='/api/scores'?r.respond({status:200,contentType:'application/json',body:JSON.stringify({rows:['startup','midcap','enterprise'].map((org,i)=>({name:['Patch Whisperer','No Friday Deploys','<script>ignored</script>'][i],superskill:'Keeping the board out of the incident channel',score:8500-i*400,org,outcome:'won',created_at:'2026-09-07',ruleset:'ciso-2026-09-v24',scenario:'2026-09-02'})),more:false})}):r.continue());
 await q.setViewport({width:1000,height:900});await q.goto(base+'/scoreboard',{waitUntil:'networkidle0'});await q.waitForSelector('.lb-row');assert.equal(await q.$('select'),null);assert.deepEqual(await q.$$eval('.lb-column-head span',es=>es.map(e=>e.textContent)),['USERNAME','SCORE','LIFE MOTTO']);assert.equal(await q.$('[data-view=history]'),null);assert.equal(await q.$('.lb-row script'),null);await q.screenshot({path:out+'/scoreboard.png'});
 const m=await b.newPage(),loaded=[];m.on('request',r=>loaded.push(r.url()));await m.emulate(KnownDevices['iPhone 13']);await m.goto(base,{waitUntil:'networkidle0'});assert.match(await m.$eval('body',e=>e.textContent),/Mobile gameplay isn’t supported yet/);assert.equal(await m.$('canvas'),null);assert.equal(await m.evaluate(()=>!!window.__app),false);assert.equal(loaded.some(u=>/three-runtime|campaign-main|\.glb/.test(u)),false);await m.screenshot({path:out+'/mobile.png'});
 await m.emulate(KnownDevices['iPad Pro']);await m.goto(base,{waitUntil:'networkidle0'});assert.ok(await m.$('.desktop-notice'));
 assert.deepEqual(errors,[]);console.log('v24 UX: all three choices preserved, NIST routes, HUD alignment, unified leaderboard, escaped text, iPhone/iPad without 3D loading passed.');
}finally{await b.close();}
