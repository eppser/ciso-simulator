import {scoreboardHero} from './scoreboard-hero.js';
import {renderDemoScores,renderScoreRows,showDemoScores} from './scoreboard-demo.js';
import {RULESET,SCENARIO} from '../scoreboard-config.js';
import '../leaderboard.css';
import '../scoreboard-polish.css';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){
 const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
 let data;try{data=await r.json();}catch{throw Error('Live scores unavailable.');}if(!r.ok)throw Error(data.error||'Live scores unavailable.');return data;
}
export const beginRankedRun=org=>import.meta.env.DEV&&import.meta.env.VITE_GAME_RANKED!=='1'?Promise.resolve({error:'Local practice run. Play the hosted game to enter the public rankings.'}):api('/api/run',{org,ruleset:RULESET,scenario:SCENARIO}).catch(error=>({error:error.message}));
export function openLeaderboard(ui){
 ui.modal('<div id="leaderboard"></div><button data-action="resume" class="leaderboard-back">Back to game</button>','leaderboard-modal');
 mountLeaderboard(ui.overlay.querySelector('#leaderboard'),{game:ui.app.game,run:ui.app.journal,ticket:ui.app.runTicket});
}
export function mountLeaderboard(root,{game,run,ticket}={}){
 const ended=game&&['won','lost'].includes(game.phase),eligible=ended&&run?.eligible;
 let page=0,serial=0;
 root.innerHTML=`${scoreboardHero()}${eligible?`<form class="lb-submit"><div><b>YOUR SCORE · ${game.score().toLocaleString()}</b></div><label>Username<input name="name" minlength="2" maxlength="28" placeholder="The Patch Whisperer" required autocomplete="off"></label><label>Life motto<input name="superskill" minlength="2" maxlength="40" placeholder="Keep calm and check the backups." required autocomplete="off"></label><p class="lb-publish-note">Adding your score publishes your username and motto. Use a pseudonym.</p><button type="submit">Add my score ↗</button><p class="lb-status" role="status"></p></form>`:ended?'<p class="lb-note">Practice run · play online to submit a verified score.</p>':''}<p class="lb-live-status" role="status"></p><div class="lb-column-head" aria-hidden="true"><span>USERNAME</span><span>SCORE</span><span>LIFE MOTTO</span></div><div class="lb-rows" aria-live="polite"></div><div class="lb-pagination" hidden><button class="lb-prev">← Previous</button><span></span><button class="lb-next">Next →</button></div>`;
 const load=async()=>{
  const request=++serial,rows=root.querySelector('.lb-rows'),status=root.querySelector('.lb-live-status'),pagination=root.querySelector('.lb-pagination');
  pagination.hidden=true;status.textContent='';rows.innerHTML='<p class="lb-empty">Loading scores…</p>';
  root.querySelector('.lb-prev').disabled=true;root.querySelector('.lb-next').disabled=true;
  try{
   const data=await api('/api/scores?'+new URLSearchParams({view:'top',page}));if(request!==serial||!root.isConnected)return;
   rows.innerHTML=showDemoScores('top',page,data.rows)?renderDemoScores():data.rows.length?renderScoreRows(data.rows,page*25):'<p class="lb-empty">No scores on this page.</p>';
   root.querySelector('.lb-prev').disabled=page===0;root.querySelector('.lb-next').disabled=!data.more;
   root.querySelector('.lb-pagination span').textContent='Page '+(page+1);pagination.hidden=page===0&&!data.more;
  }catch(e){
   if(request!==serial||!root.isConnected)return;
   status.innerHTML=`${esc(e.message)} <button class="lb-retry">Retry</button>`;
   rows.innerHTML=page===0?renderDemoScores():'<p class="lb-empty">Could not load this page.</p>';
   pagination.hidden=page===0;root.querySelector('.lb-prev').disabled=page===0;
  }
 };
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.classList.contains('lb-prev')){page--;load();}else if(b.classList.contains('lb-next')){page++;load();}else if(b.classList.contains('lb-retry'))load();});
 root.querySelector('form')?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.target,status=form.querySelector('.lb-status'),button=form.querySelector('button');if(button.disabled||!form.reportValidity())return;
  button.disabled=true;status.textContent='Verifying your score…';
  try{
   const session=await ticket;if(!session?.token)throw Error(session?.error||'This run started offline. Start a new game online to rank.');if(run.submitted)throw Error('This run has already been submitted.');
   const r=await api('/api/submit',{token:session.token,name:form.elements.name.value,superskill:form.elements.superskill.value,score:game.score(),run});
   run.submitted=true;status.textContent=`Published · ${r.score.toLocaleString()} verified points.`;button.textContent='Score published ✓';page=0;load();
  }catch(error){status.textContent=error.message;button.disabled=false;}
 });
 load();
}
