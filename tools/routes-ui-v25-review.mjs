import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[];let submissions=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setRequestInterception(true);p.on('request',r=>{const path=new URL(r.url()).pathname;
  if(path==='/api/run')return r.respond({status:400,contentType:'application/json',body:'{"error":"UI audit practice run"}'});
  if(path==='/api/submit'){submissions.push(JSON.parse(r.postData()));return r.respond({status:200,contentType:'application/json',body:'{"score":1500}'});}
  if(path==='/api/scores')return r.respond({status:200,contentType:'application/json',body:'{"rows":[],"more":false}'});return r.continue();
 });
 await p.setViewport({width:1600,height:1000});await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 for(const org of ['startup','midcap','enterprise']){
  const state=await p.evaluate(org=>{const a=__app;a.start(org,'full');a.paused=true;a.audio.enabled=false;a.ui.closeCall();a.ui.closeModal();a.ui.callQueue=[];const g=a.game,budget=g.budget;for(let y=0;y<10;y++)g.place('wall',29,y);a.select({kind:'wall',x:29,y:0});a.ui.update();return{price:g.buildCost('wall'),budget,spent:g.stats.spent,walls:g.walls.size};},org);
  assert.equal(state.price,{startup:3,midcap:4,enterprise:6}[org]);assert.equal(state.spent,state.price*10);assert.equal(state.walls,10);
  assert.equal(await p.$('#feed'),null);assert.equal(await p.$('.situation'),null);
  await p.click('[data-action=remove-wall]');assert.equal(await p.evaluate(()=>__app.game.walls.size),9);
  await p.evaluate(()=>{__app.select({kind:'wall',x:29,y:1});__app.ui.update();});await p.click('[data-action=remove-wall]');assert.equal(await p.evaluate(()=>__app.game.walls.size),8);
 }
 await p.evaluate(()=>{const a=__app;a.select(null);a.game.log('Audit: this event belongs in Operations Activity.','warn');a.ui.activityVisible=true;a.ui.opsHistory=true;a.ui.update();});
 assert.match(await p.$eval('#activity-log',e=>e.textContent),/Audit: this event belongs/);assert.equal(await p.$('#feed'),null);
 fs.mkdirSync('artifacts/firewall-v25',{recursive:true});await p.screenshot({path:'artifacts/firewall-v25/operations.png'});
 await p.evaluate(()=>{const a=__app;a.game.phase='lost';a.game.score=()=>1500;a.journal.eligible=true;a.runTicket=Promise.resolve({token:'local-ui-fixture'});a.ui.results();});
 await p.click('[data-action=leaderboard]');assert.equal(await p.$('input[type=checkbox]'),null);assert.match(await p.$eval('.lb-publish-note',e=>e.textContent),/publishes your username/);
 await p.screenshot({path:'artifacts/firewall-v25/submit.png'});
 await p.click('.lb-submit button');assert.equal(submissions.length,0,'required username and motto still enforced');
 await p.type('input[name=name]','Route Whisperer');await p.type('input[name=superskill]','Leave a gap. Keep a backup.');await p.click('.lb-submit button');
 await p.waitForFunction(()=>document.querySelector('.lb-status')?.textContent.includes('Published'));assert.equal(submissions.length,1);assert.equal(submissions[0].name,'Route Whisperer');assert.equal(submissions[0].superskill,'Leave a gap. Keep a backup.');assert.equal(submissions[0].score,1500);
 await p.$eval('.lb-submit',f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(submissions.length,1);assert.deepEqual(errors,[]);
 console.log('All-level flat-price building and rapid removal passed; only Operations Activity contains the event log; one-click publication, required text and duplicate prevention passed. All API writes were mocked locally.');
}finally{await b.close();}
