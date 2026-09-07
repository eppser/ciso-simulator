import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5178/',out='artifacts/render-equivalence';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage();await p.setViewport({width:1440,height:1000});await p.setRequestInterception(true);p.on('request',r=>r.url().includes('/api/')?r.respond({status:200,contentType:'application/json',body:JSON.stringify({error:'Visual test only',rows:[]})}):r.continue());
 await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 await p.evaluate(()=>{__app.start('enterprise','full');__app.paused=true;__app.audio.enabled=false;__app.ui.closeCall();__app.ui.callQueue=[];});
 await new Promise(r=>setTimeout(r,1800));await p.addStyleTag({content:'#interface,#overlay,#toast{visibility:hidden!important}'});
 await p.evaluate(()=>{window.requestAnimationFrame=()=>0;});await new Promise(r=>setTimeout(r,100));
 const results=[];
 for(const state of ['normal','incident']){
  await p.evaluate(state=>{const a=__app,g=a.game;if(state==='incident'){g.budget=3000;for(const [type,x,y]of [['ips',2,10],['waf',3,11],['ndr',2,8]])g.place(type,x,y);for(const asset of [...g.assets.values()].filter(a=>a.discovered).slice(0,4)){asset.state='compromised';asset.edr=true;}g.buy('mfa');g.time=120;
    const normal=g.waves.flatMap(w=>w.attackers).find(t=>!t.boss);for(let i=0;i<18;i++){g.spawn({...normal,avatar:i%2?'virus':'beetle',boss:i===0,aiThreat:i===0});const at=g.attackers.at(-1);at.x=1+(i%3)*.6;at.y=3+i*.8;at.revealed=true;}}
   a.last=90000;a.renderCadence.next=null;a.frame(90000);a.rig.tween=null;
  },state);
  const images=[];
  for(const enabled of [false,true]){await p.evaluate(enabled=>{__app.campus.reflectionMaterials.enabled=enabled;__app.rig.render();__app.rig.render();},enabled);images.push(Buffer.from(await p.screenshot({path:`${out}/${state}-${enabled?'cached':'original'}.png`})).toString('base64'));}
  const diff=await p.evaluate(async images=>{const data=[];for(const src of images){const i=new Image();i.src='data:image/png;base64,'+src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);data.push(x.getImageData(0,0,c.width,c.height).data);}let changed=0,max=0,sum=0;for(let i=0;i<data[0].length;i++){const d=Math.abs(data[0][i]-data[1][i]);if(d)changed++;max=Math.max(max,d);sum+=d;}return{changedChannels:changed,maxChannelDelta:max,meanChannelDelta:sum/data[0].length};},images);
  assert.equal(diff.changedChannels,0,`${state}: cached reflection must be pixel-identical`);results.push({state,...diff});
 }
 fs.writeFileSync(out+'/report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await b.close();}
