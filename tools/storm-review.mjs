import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/storm-v21/qa';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>m.type()==='error'&&errors.push(m.text()));p.on('response',r=>r.status()>=400&&failed.push(r.url()));
 await p.setViewport({width:1600,height:1000});await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');await p.screenshot({path:out+'/opening.png'});
 for(const org of ['startup','midcap','enterprise']){
  await p.evaluate(id=>{const a=__app;a.start(id,'full');a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.paused=true;},org);
  await new Promise(r=>setTimeout(r,700));
  const check=await p.evaluate(()=>{const a=__app;return {trust:a.game.trust,clouds:a.campus.atmosphere.mist.count,splashes:a.campus.splashes.mesh.count,time:a.campus.atmosphere.mist.material.uniforms.time.value,meshCount:a.campus.assetViews.size};});
  assert.equal(check.trust,5);assert.equal(check.clouds,48);assert.equal(check.splashes,220);
  await new Promise(r=>setTimeout(r,250));assert.ok(await p.evaluate(t=>__app.campus.atmosphere.mist.material.uniforms.time.value>t,check.time));
  await p.screenshot({path:out+'/'+org+'.png'});
 }
 // Controlled visual fixture; extra money/threat placement is not balance evidence.
 await p.evaluate(()=>{const a=__app;a.start('midcap','full');a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.paused=true;a.ui.activityVisible=false;const g=a.game;g.budget=2000;
  for(const [i,type]of ['ips','waf','ndr','honeytoken','wall'].entries()){const x=3+i*2;for(let y=14;y<21;y++)if(g.canPlace(type,x,y).ok){g.place(type,x,y);break;}}
  for(let i=0;i<9;i++){g.spawn({...g.waves[12].attackers[i%g.waves[12].attackers.length],avatar:i%2?'virus':'beetle',aiThreat:i===0,boss:i===0});const at=g.attackers.at(-1);at.x=2+(i%5)*1.3;at.y=10+Math.floor(i/5)*1.1;}
  g.spawnInternalMalware([...g.assets.values()].find(a=>a.discovered&&a.trusted));g.attackers.at(-1).x=7;g.attackers.at(-1).y=13;
  a.rig.goTo({x:8,z:13,dist:20,pitch:.64,yaw:-.6});a.ui.update();
  window.showcaseFire=setInterval(()=>{for(const t of g.towers.filter(t=>['ips','waf'].includes(t.type))){const target=g.attackers[t.type==='ips'?2:1];a.effects.spawn({type:'shot',control:t.type,x:t.x,y:t.y,to:target.id},g);}},250);
 });
 await new Promise(r=>setTimeout(r,950));await p.screenshot({path:out+'/controls-and-water.png'});
 const style=await p.addStyleTag({content:'#interface,#overlay,#toast{visibility:hidden!important}'});await p.evaluate(()=>__app.labels=false);await new Promise(r=>setTimeout(r,250));await p.screenshot({path:out+'/battle-detail.png'});await style.dispose();
 await p.evaluate(()=>{clearInterval(window.showcaseFire);__app.labels=true;__app.effects.clear();__app.rig.home();});
 await p.setViewport({width:390,height:844});await p.evaluate(()=>{__app.start('startup','full');__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];__app.paused=true;});await new Promise(r=>setTimeout(r,600));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const report={errors,failed,checks:['all three organizations start at 5/5','48 animated cloud slices','220 depth-tested rain impacts','weather moves while gameplay manually paused','revised control/creature articulation visible','wet reflection close-up','no mobile horizontal overflow'],note:'Battle-detail image hides HUD and uses a controlled visual fixture. Gameplay budgets and difficulty are unchanged.'};fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await b.close();}
