import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178/',out='artifacts/runtime-lifecycle';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:1000});await p.setRequestInterception(true);p.on('request',r=>r.url().includes('/api/')?r.respond({status:200,contentType:'application/json',body:JSON.stringify({error:'Unranked lifecycle test',rows:[]})}):r.continue());
 await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 await p.evaluate(()=>{__app.start('startup','full');__app.paused=true;__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];});
 const dispose=await p.evaluate(async()=>{const a=__app,g=a.game,initialTowers=g.towers.length;let disposed=0,expected=0,geometryDisposed=0;for(let round=0;round<20;round++){
   g.budget=1000;g.lastSale=-1000;const wallCell=[29,0],towerCell=[29,1];if(!g.place('wall',...wallCell).ok||!g.place('ips',...towerCell).ok)throw Error('Fixture placement failed');a.syncControls(performance.now()/1000);
   const wall=[...a.wallViews.values()][0],tower=a.towerViews.get(g.towers.at(-1).id);for(const root of [wall,tower.group])root.traverse(o=>{if(o.isMesh){expected++;o.material.addEventListener('dispose',()=>disposed++);o.geometry.addEventListener('dispose',()=>geometryDisposed++);}});
   a.rig.render();g.removeWall(...wallCell);g.sell(g.towers.at(-1).id);a.syncControls(performance.now()/1000);
  }return{disposed,expected,geometryDisposed,wallViews:a.wallViews.size,towerViews:a.towerViews.size,initialTowers};});
 assert.equal(dispose.disposed,dispose.expected);assert.equal(dispose.geometryDisposed,0);assert.equal(dispose.wallViews,0);assert.equal(dispose.towerViews,dispose.initialTowers);
 await p.evaluate(()=>{const a=__app;a.paused=false;a.simNow=performance.now();window.hiddenRenders=0;const render=a.rig.render.bind(a.rig);a.rig.render=(...args)=>{hiddenRenders++;return render(...args);};Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});window.hiddenStart=a.game.time;});
 await new Promise(r=>setTimeout(r,2600));const hidden=await p.evaluate(()=>({renders:hiddenRenders,advanced:__app.game.time-hiddenStart,effects:__app.game.effects.length,paused:__app.paused}));
 assert.equal(hidden.renders,0);assert.ok(hidden.advanced>1.5);assert.equal(hidden.effects,0);assert.equal(hidden.paused,false);
 await p.evaluate(()=>{delete document.hidden;});await new Promise(r=>setTimeout(r,500));assert.ok(await p.evaluate(()=>hiddenRenders>10));assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({base,dispose,hidden,errors},null,2));console.log(JSON.stringify({dispose,hidden,errors}));
}finally{await b.close();}
