import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
fs.mkdirSync('artifacts/release/gif-frames',{recursive:true});fs.mkdirSync('docs/media',{recursive:true});
try{
 const p=await browser.newPage();await p.setViewport({width:1440,height:1000});await p.goto(process.env.GAME_TEST_URL||'https://ciso-simulator-staging.pages.dev',{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 let frame=0;const capture=async n=>{for(let i=0;i<n;i++){await p.screenshot({path:'artifacts/release/gif-frames/'+String(frame++).padStart(4,'0')+'.png'});await new Promise(r=>setTimeout(r,60));}};
 await p.screenshot({path:'docs/media/choose-your-company.png'});await capture(10);
 await p.click('[data-action=start][data-id=midcap]');await capture(12);
 await p.evaluate(()=>{__app.audio.enabled=false;__app.ui.closeCall();});
 await p.click('[data-action=tab][data-id=programs]');await p.click('[data-action=buy][data-id=scanner]');await capture(8);
 await p.click('[data-action=tab][data-id=build]');await p.click('[data-action=build][data-id=ips]');
 const point=await p.evaluate(()=>{const a=__app;for(let x=6;x<12;x++)for(let y=6;y<18;y++){if(!a.game.canPlace('ips',x,y).ok)continue;const p=a.hit.clone().set(x,0,y).project(a.rig.camera),px=(p.x+1)*innerWidth/2,py=(1-p.y)*innerHeight/2;if(px>380&&px<900&&py>250&&py<750)return{x:px,y:py};}throw Error('No visible build cell');});
 await p.mouse.click(point.x,point.y);await p.mouse.click(point.x,point.y,{button:'right'});await p.click('[data-action=speed][data-id="3"]');await p.click('[data-action=early]');await capture(60);await p.screenshot({path:'docs/media/campus-live.png'});
 console.log('Recorded '+frame+' frames of actual opening, scanner purchase, IPS deployment and live waves.');
}finally{await browser.close();}
