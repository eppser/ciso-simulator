import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='artifacts/asset-buttons';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:1000});await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 await p.evaluate(()=>{const a=__app;a.start('enterprise','full');a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.paused=true;const asset=[...a.game.assets.values()].find(x=>x.discovered&&x.name.includes('Jira'))||[...a.game.assets.values()].find(x=>x.discovered&&x.exposed&&x.canEdr&&!x.appliance);a.select({kind:'asset',id:asset.id});});
 const sizes=[];
 for(const width of [1440,390]){
  await p.setViewport({width,height:width===390?844:1000});
  const rows=await p.$$eval('#inspect .asset-actions>button',bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left};}));
  assert.ok(rows.length>=3);for(const r of rows){assert.equal(r.width,rows[0].width);assert.equal(r.height,rows[0].height);assert.ok(r.height>=44);}
  for(let i=1;i<rows.length;i++)assert.equal(rows[i].top-rows[i-1].bottom,8);
  sizes.push({width,rows});await (await p.$('#inspect')).screenshot({path:out+'/'+width+'.png'});
 }
 await p.click('#inspect [data-action=restrict]');assert.equal(await p.evaluate(()=>__app.game.asset(__app.selected.id).restricted),true);
 assert.match(await p.$eval('#inspect [data-action=restrict]',e=>e.textContent),/Re-enable/);assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({sizes,errors,restrictActionWorks:true},null,2));console.log('Equal button widths/heights, 8px spacing and public-service toggle verified on desktop/mobile.');
}finally{await b.close();}
