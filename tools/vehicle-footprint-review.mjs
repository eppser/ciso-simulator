import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/vehicle-footprints';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setViewport({width:1600,height:1000});await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.waitForSelector('.organization-card');
 const reports=[];
 for(const org of ['startup','midcap','enterprise']){
  const report=await p.evaluate(async org=>{
   const T=await import('/node_modules/three/build/three.module.js'),f=await import('/src/sim/footprints.js');
   const a=__app;a.start(org,'full');a.paused=true;a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];
   const g=a.game,c=a.campus,failures=[];let visible=0;
   // An entire traffic cycle, plus restart cycle; compare actual loaded GLB bounds.
   for(let time=0;time<160;time+=.5){
    c.update(time,0,g,null,true);const structures=[c.soc,...[...c.assetViews.values()].map(v=>v.shape)].map(o=>{o.updateWorldMatrix(true,true);return new T.Box3().setFromObject(o);}),claimed=new Set();
    for(const car of c.cars.filter(car=>car.visible)){
     visible++;car.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(car);
     if(structures.some(s=>b.min.x<s.max.x&&b.max.x>s.min.x&&b.min.z<s.max.z&&b.max.z>s.min.z))failures.push('mesh overlap');
     for(const [x,z]of f.footprintCells({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z})){
      const token=f.cellToken(x,z);if(claimed.has(token))failures.push('two cars in tile');claimed.add(token);
      if(x>=0&&x<30&&z>=0&&z<22&&g.map.blocked[z*30+x])failures.push('occupied grid tile');
     }
    }
   }
   // Parked vehicle at (18,21.1) used to intersect the SOC and must stay absent.
   if(c.cars.at(-1).visible)failures.push('SOC parked car remains');
   g.budget=1000;const placement=g.place('wall',16,21);c.update(0,0,g,null,true);
   if(!placement.ok||c.cars[10].visible)failures.push('construction did not remove parked car');
   const hqBuild=g.place('ips',19,20);if(hqBuild.ok)failures.push('allowed a tower inside SOC');
   // A later discovered building occupies a traffic tile; a rendered car cannot survive there.
   const host=[...g.assets.values()].find(b=>b.discovered);host.x=28;host.y=10;g.map.block(28,10,1);g.map.block(29,10,1);g.map.block(28,11,1);g.map.block(29,11,1);c.rebuild(g);c.update(110/3,0,g,null,true);
   if(c.cars[0].visible)failures.push('car inside newly occupied route');
   a.start(org,'full');a.paused=true;a.ui.closeCall();a.ui.callQueue=[];
   return{org,samples:320,visibleCarChecks:visible,failures};
  },org);
  assert.deepEqual(report.failures,[]);reports.push(report);
  await new Promise(r=>setTimeout(r,700));await p.screenshot({path:`${out}/${org}.png`});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({reports,errors},null,2));console.log(JSON.stringify({reports,errors},null,2));
}finally{await browser.close();}
