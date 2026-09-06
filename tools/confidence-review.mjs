import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/confidence-v17';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1844,height:1213});
 await page.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});
 for(const org of ['startup','midcap','enterprise']){
  await page.evaluate(org=>{__app.start(org,'full');__app.audio.enabled=false;__app.paused=true;__app.ui.closeCall();__app.ui.callQueue=[];},org);
  await page.waitForFunction(()=>!__app.rig.tween);
  const state=await page.evaluate(()=>({trust:__app.game.trust,score:__app.game.score(),pitch:__app.rig.pitch,yaw:__app.rig.yaw,x:__app.rig.target.x,icons:document.querySelectorAll('.utilities button svg').length,trustText:document.querySelector('#trust').textContent}));
  assert.equal(state.trust,5);assert.equal(state.score,0);assert.equal(state.icons,4);assert.equal(state.pitch,.76);assert.equal(state.x,12.2);
  checks.push({org,...state});await page.screenshot({path:`${out}/${org}-command.png`});
 }
 await page.click('[data-action="trust-help"]');assert.match(await page.$eval('.help-modal',e=>e.textContent),/start at 5\/5/);await page.click('[data-action="resume"]');
 await page.click('#grc-toggle');assert.equal(await page.$eval('#activity-log',e=>e.hidden),false);assert.equal(await page.$eval('#work-tray',e=>e.hidden),true);await page.click('#activity-toggle');
 for(let i=0;i<2;i++){await page.click('#audio');assert.equal(await page.$$eval('#audio svg',e=>e.length),1);}
 await page.click('[data-action="camera"][data-id="overview"]');await page.waitForFunction(()=>!__app.rig.tween);assert.equal(await page.evaluate(()=>__app.rig.pitch),.9);
 await page.click('[data-action="camera"][data-id="command"]');await page.waitForFunction(()=>!__app.rig.tween);
 await page.evaluate(()=>{__app.game.trust=1;__app.ui.showCall('succession');});
 assert.match(await page.$eval('#call',e=>e.textContent),/Chief Information|failover|job title/);await page.screenshot({path:`${out}/succession.png`});
 await page.evaluate(()=>{__app.ui.closeCall();__app.ui.callQueue=['succession'];__app.ui.lastCall=0;__app.game.trust=5;__app.ui.update();});
 assert.equal(await page.$eval('#call',e=>e.hidden),true);
 await page.setViewport({width:390,height:844});
 await page.evaluate(()=>{__app.start('startup','full');__app.paused=true;__app.ui.closeCall();__app.ui.callQueue=[];});
 await page.waitForFunction(()=>!__app.rig.tween);
 const mobile=await page.$$eval('.utilities button',nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),x:r.x,right:r.right,width:r.width,height:r.height};}));
 for(const button of mobile){assert.ok(button.label);assert.ok(button.x>=0&&button.right<=390);assert.ok(button.height>=32);}
 await page.screenshot({path:`${out}/mobile.png`});assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/browser.json`,JSON.stringify({checks,mobile,errors},null,2));console.log(JSON.stringify({checks,mobile,errors},null,2));
}finally{await browser.close();}
