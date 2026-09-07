import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'https://ciso-simulator-staging.pages.dev';
const out='artifacts/release';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1600,height:1000});
 await page.goto(base,{waitUntil:'networkidle0'});await page.waitForSelector('[data-action=start]');await page.screenshot({path:out+'/opening.png'});
 const reports=[];
 for(const org of ['startup','midcap','enterprise']){
  const result=await page.evaluate(async org=>{
   const app=__app;app.start(org,'full');app.audio.enabled=false;app.paused=true;app.ui.closeCall();app.ui.callQueue=[];const ticket=await app.runTicket;if(!ticket.token)throw Error(ticket.error);
   const g=app.game,orders=['scanner','discovery','intel','soc1','mfa','backups','retainer','vetting','dlp','awareness','pam','soc2'];
   for(let step=0;step<120000&&!['won','lost'].includes(g.phase);step++){
    if(g.pendingDilemma){const d=g.pendingDilemma,preferred={crown:'file',review:'concede',vendor:'reset',fatigue:'rest',ransom:'rebuild'}[d.family];d.choices.filter(c=>c.enabled).sort((a,b)=>(b.id===preferred)-(a.id===preferred)).some(c=>g.choose(d.id,c.id).ok);}
    if(step%150===0){
     if(g.firstAssetId&&g.time<30&&g.asset(g.firstAssetId).knownVulns?.size&&!g.asset(g.firstAssetId).restricted)g.restrictService(g.firstAssetId);
     for(const a of [...g.assets.values()].filter(a=>a.discovered&&!a.job).sort((a,b)=>b.crit-a.crit)){
      if(g.activeJobs()>=g.concurrency())break;
      if(a.leak?.detected&&a.leak.active){if(!a.quarantined)g.quarantine(a.id);g.cleanLeak(a.id);continue;}
      if(a.state==='compromised'){if(!a.quarantined&&!a.locked)g.quarantine(a.id);g.respond(a.id,true);continue;}
      const vuln=[...(a.knownVulns||[])].find(id=>g.vuln(id)?.patchable&&g.fixHour(id)===null);if(vuln){g.patch(a.id,vuln);continue;}
      if(a.canEdr&&!a.appliance&&!a.edr&&a.crit===3&&g.hour>=3)g.installEdr(a.id);
     }
     for(const t of g.grc||[])if(t.state==='pending'&&g.grcRequirement(t.id)&&g.activeJobs()<g.concurrency())g.startGrc(t.id);
     for(const t of g.humanThreats)if(t.detectedAt!=null&&t.state==='active')g.containHumanThreat(t.id);
     const next=orders.find(p=>!g.bought(p));if(next&&g.budget>g.programCost(next)+20)g.buy(next);
     if(g.hour>=6&&g.budget>100)for(const [type,x,y]of [['waf',7,6],['ips',6,11],['waf',10,14],['ndr',6,16]])if(!g.towers.some(t=>t.x===x&&t.y===y)){g.place(type,x,y);break;}
    }
    g.tick(1/30);g.effects.length=0;g.popups.length=0;
   }
   app.ui.results();return{org,phase:g.phase,score:g.score(),budget:g.budget,steps:app.journal.steps,commands:app.journal.commands.length,eligible:app.journal.eligible,run:app.journal};
  },org);
  assert.ok(['won','lost'].includes(result.phase));assert.ok(result.eligible);reports.push({...result,run:undefined});fs.writeFileSync(out+'/'+org+'-replay.json',JSON.stringify(result));await page.screenshot({path:out+'/'+org+'-results.png'});
  await page.click('[data-action=leaderboard]');await page.waitForSelector('.lb-submit');assert.match(await page.$eval('#leaderboard',e=>e.textContent),/YOUR DAY/);await page.screenshot({path:out+'/'+org+'-scoreboard.png'});
 }
 await page.goto(base+'/scoreboard',{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.querySelector('.lb-row')||document.querySelector('.lb-empty')?.textContent.includes('No scores yet'));assert.equal(await page.$('.lb-org'),null);
 await page.setViewport({width:390,height:844});await page.screenshot({path:out+'/scoreboard-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-report.json',JSON.stringify({base,reports,errors},null,2));console.log(JSON.stringify({base,reports,errors}));
}finally{await browser.close();}
