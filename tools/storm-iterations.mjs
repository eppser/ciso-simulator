import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
// Preserve the initial baseline so the recorded 30 comparisons remain reproducible.
const STORM_LOOK={cloudOpacity:.72,cloudScale:1,cloudLight:.54,cloudSpeed:.045,wetCoverage:.55,reflection:.52,distortion:.0018,ripple:.014,exposure:1.13,key:3.4,fill:1.05,rim:1.1,bloom:.28};
export const variants=[
 ['Cloud opacity', {cloudOpacity:.42}],['Cloud opacity',{cloudOpacity:.62}],['Cloud opacity',{cloudOpacity:.82}],
 ['Cloud scale',{cloudScale:.8}],['Cloud scale',{cloudScale:1.2}],['Cloud balance',{cloudOpacity:.68,cloudScale:1.1,cloudLight:.38}],
 ['Water coverage',{wetCoverage:.40}],['Water coverage',{wetCoverage:.65}],['Water coverage',{wetCoverage:.78}],
 ['Reflection strength',{reflection:.35}],['Reflection strength',{reflection:.68}],['Water balance',{wetCoverage:.66,reflection:.58,distortion:.0008}],
 ['Cool key',{key:2.6,fill:.8}],['Cool key',{key:4.0,fill:.85}],['Rim edge',{rim:1.7}],
 ['Light exposure',{exposure:1.0}],['Light exposure',{exposure:1.25}],['Light balance',{key:3.2,fill:.85,rim:1.35,exposure:1.1}],
 ['Wind distortion',{distortion:.0003}],['Wind distortion',{distortion:.003}],['Rain rings',{ripple:.035}],
 ['Storm motion',{cloudSpeed:.075}],['Quiet cloud interior',{cloudLight:.24}],['Storm detail balance',{distortion:.0007,ripple:.025,cloudSpeed:.032,cloudLight:.34}],
 ['Combined dark',{cloudOpacity:.7,cloudLight:.3,wetCoverage:.66,reflection:.60,key:3.2,fill:.85,rim:1.35,exposure:1.04}],
 ['Combined bright',{cloudOpacity:.7,cloudLight:.4,wetCoverage:.66,reflection:.60,key:3.2,fill:.95,rim:1.35,exposure:1.16}],
 ['Combined depth',{cloudOpacity:.84,cloudScale:1.15,cloudLight:.34,wetCoverage:.66,reflection:.60,key:3.2,fill:.9,rim:1.35,distortion:.0007}],
 ['Combined specular',{cloudOpacity:.74,cloudLight:.34,wetCoverage:.7,reflection:.7,key:3.2,fill:.9,rim:1.35,distortion:.0007}],
 ['Combined restrained',{cloudOpacity:.74,cloudLight:.34,wetCoverage:.60,reflection:.54,key:3.2,fill:.9,rim:1.35,distortion:.0007}],
 ['Final candidate',{cloudOpacity:.74,cloudScale:1.08,cloudLight:.34,cloudSpeed:.032,wetCoverage:.66,reflection:.60,distortion:.0007,ripple:.025,key:3.2,fill:.9,rim:1.35,exposure:1.1,bloom:.26}],
].map(([focus,changes],i)=>({round:i+1,focus,...STORM_LOOK,...changes}));
const out='artifacts/storm-v21';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/iterations.json',JSON.stringify(variants,null,2));
if(process.argv.includes('--manifest'))process.exit(0);
const first=Number(process.argv[2]||1),last=Number(process.argv[3]||30);
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-gpu','--use-angle=metal']});
try{
 const p=await browser.newPage();await p.setViewport({width:1440,height:1000});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 await p.click('[data-action=start][data-id=midcap]');
 await p.evaluate(()=>{const a=__app;a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.paused=true;a.ui.activityVisible=false;a.game.budget=2000;
  for(const [i,type]of ['ips','waf','ndr','ips','waf','honeytoken','wall'].entries()){const x=3+i*2;for(let y=15;y<21;y++)if(a.game.canPlace(type,x,y).ok){a.game.place(type,x,y);break;}}
  for(let i=0;i<12;i++){const t=a.game.waves[12].attackers[i%a.game.waves[12].attackers.length];a.game.spawn({...t,boss:i===0,aiThreat:i===0,avatar:i%2?'virus':'beetle'});const at=a.game.attackers.at(-1);at.x=4+(i%6)*1.8;at.y=11+Math.floor(i/6)*2;at.revealed=true;}
  a.rig.goTo({x:13,z:11,dist:40,pitch:.73,yaw:-.43});a.ui.update();
 });
 await new Promise(r=>setTimeout(r,900));
 for(const v of variants.filter(v=>v.round>=first&&v.round<=last)){
  await p.evaluate(async look=>{const a=__app,{applyStormLight}=await import('/src/render/storm-look.js');applyStormLight(a.rig,look);a.campus.atmosphere.configure(look);a.campus.wetGround.configure(look);},v);
  await new Promise(r=>setTimeout(r,180));
  await p.screenshot({path:out+`/game-${String(v.round).padStart(2,'0')}.png`});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+`/browser-${first}-${last}.json`,JSON.stringify({first,last,errors,viewport:[1440,1000]},null,2));
 console.log(`Rendered runtime rounds ${first}–${last}; no shader or browser errors.`);
}finally{await browser.close();}
