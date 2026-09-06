import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='artifacts/exposure';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.setViewport({width:1600,height:1000});await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 await p.evaluate(()=>{const app=__app;app.start('midcap','full');app.paused=true;app.audio.enabled=false;app.ui.closeCall();app.ui.callQueue=[];const a=[...app.game.assets.values()].find(a=>a.discovered&&a.knownVulns===null);app.select({kind:'asset',id:a.id});});
 assert.match(await p.$eval('#inspect',e=>e.textContent),/UNSCANNED/);assert.doesNotMatch(await p.$eval('#inspect',e=>e.textContent),/CVE-2022-40684/);
 await p.evaluate(()=>{const g=__app.game;g.budget=1000;const r=g.buy('scanner');if(!r.ok)throw Error(r.reason);g.time=g.programReady.get('scanner');for(let i=0;i<g.assets.size;i++)g.tickScanner(5);const a=[...g.assets.values()].find(a=>a.discovered&&[...a.knownVulns].some(id=>g.vuln(id).vendor==='Fortinet'));__app.select({kind:'asset',id:a.id});});
 await p.waitForFunction(()=>[...__app.exposureMarkers.entries.values()].some(e=>e.sprite.visible&&e.text.includes('CVE-2022-40684')));
 await p.screenshot({path:out+'/scanned-desktop.png'});await (await p.$('#inspect')).screenshot({path:out+'/fortinet-details.png'});
 const inspector=await p.$eval('#inspect',e=>e.textContent);assert.match(inspector,/Fortinet/);assert.match(inspector,/CVE-2022-40684/);assert.match(inspector,/CVSS 9.8/);
 await p.evaluate(()=>{__app.select(null);});await p.screenshot({path:out+'/scanned-campus.png'});
 const report=await p.evaluate(async()=>{const times=[];await new Promise(resolve=>{let last=performance.now();function frame(t){times.push(t-last);last=t;if(times.length<180)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});const entries=[...__app.exposureMarkers.entries.values()];return {labels:entries.filter(e=>e.sprite.visible).length,footprints:entries.filter(e=>e.brackets.visible).length,fps:1000/(times.reduce((a,b)=>a+b)/times.length),drawCalls:__app.rig.renderer.info.render.calls};});
 await p.setViewport({width:390,height:844});await p.evaluate(()=>{__app.select({kind:'asset',id:[...__app.game.assets.values()].find(a=>a.discovered&&[...a.knownVulns].some(id=>__app.game.vuln(id).vendor==='Fortinet')).id});});await p.waitForFunction(()=>document.querySelector('#inspect')?.getBoundingClientRect().width<400);await (await p.$('#inspect')).screenshot({path:out+'/fortinet-mobile.png'});
 const checks=[];await p.setViewport({width:1600,height:1000});
 for(const org of ['startup','midcap','enterprise']){
  await p.evaluate(org=>{const a=__app;a.start(org,'full');a.paused=true;a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.game.buy('scanner');for(let i=0;i<a.game.assets.size;i++)a.game.tickScanner(5);},org);
  await p.waitForFunction(()=>__app.exposureMarkers.records.length===[...__app.game.assets.values()].filter(a=>a.discovered).length&&__app.exposureMarkers.records.every(({r})=>r.state!=='unknown'));
  const result=await p.evaluate(()=>({org:__app.game.org.id,known:__app.exposureMarkers.records.length,vulnerable:__app.exposureMarkers.records.filter(({r})=>r.state==='vulnerable').length}));checks.push(result);
  await p.evaluate(()=>{__app.labels=false;});await p.waitForFunction(()=>[...__app.exposureMarkers.entries.values()].every(e=>!e.sprite.visible));assert.ok(await p.evaluate(()=>[...__app.exposureMarkers.entries.values()].some(e=>e.brackets.visible)));
  await p.evaluate(()=>{__app.labels=true;});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({...report,checks,errors},null,2));console.log(JSON.stringify({...report,checks}));
}finally{await browser.close();}
