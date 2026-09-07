import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='https://ciso-simulator-staging.pages.dev',ref='ewlsvqspmivodvolawzv';let hash;
async function sql(query){const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'content-type':'application/json'},body:JSON.stringify({query})});if(!r.ok)throw Error('Staging fixture update failed');return r.json();}
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const p=await b.newPage();await p.setViewport({width:1440,height:1000});await p.goto(base,{waitUntil:'networkidle0'});await p.waitForSelector('[data-action=start]');
 const fixture=JSON.parse(fs.readFileSync('artifacts/release/startup-replay.json','utf8'));
 hash=await p.evaluate(async run=>{const app=__app;app.start('startup','full');app.paused=true;app.audio.enabled=false;app.ui.closeCall();app.ui.callQueue=[];const ticket=await app.runTicket;let i=0;for(let s=0;s<run.steps;s++){while(run.commands[i]?.step===s){const c=run.commands[i++];app.game[c.method](...c.args);}app.game.tick(1/30);app.game.effects.length=0;app.game.popups.length=0;}app.ui.results();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ticket.token)))].map(x=>x.toString(16).padStart(2,'0')).join('');},fixture.run);
 assert.match(hash,/^[a-f0-9]{64}$/);await sql("update ciso_game_private.runs set created_at=now()-interval '1 hour' where token_hash='"+hash+"'");
 await p.click('[data-action=leaderboard]');await p.type('input[name=name]','QA Browser Submit');await p.type('input[name=superskill]','Temporary UI verification');assert.equal(await p.$('input[type=checkbox]'),null);await p.click('.lb-submit button');
 await p.waitForFunction(()=>document.querySelector('.lb-status')?.textContent.includes('Published'),{timeout:30000});assert.equal(await p.$eval('.lb-submit button',e=>e.disabled),true);
 await p.waitForFunction(()=>document.querySelector('.lb-rows')?.textContent.includes('QA Browser Submit'));assert.equal(await p.$('[data-view=history]'),null);await p.screenshot({path:'artifacts/release/verified-ui-submit.png'});
 console.log('Real browser one-click form submission + published score + simple scoreboard visibility passed.');
}finally{
 if(hash){await sql("delete from public.ciso_game_scores where run_id in (select id from ciso_game_private.runs where token_hash='"+hash+"') and name='QA Browser Submit'");await sql("delete from ciso_game_private.runs where token_hash='"+hash+"'");console.log('Removed the temporary browser-test score and ticket.');}
 await b.close();
}
