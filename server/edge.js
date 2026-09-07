import {verifyReplay,validateReplay,RULESET,SCENARIO} from '../src/sim/replay.js';
import {publicText,boardQuery,boundedJSON} from './validation.js';
const env=k=>Deno.env.get(k);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
async function db(path,body){
 const key=env('SUPABASE_SERVICE_ROLE_KEY');const r=await fetch(env('SUPABASE_URL')+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok){if(data.message==='Run limit reached')throw Error('Too many new games. Try again in an hour.');throw Error('Scoreboard could not save this request.');}return data;
}
export async function handler(request){
 // Only the same-origin Cloudflare gateway may call this function. No browser DB key.
 if(!env('GAME_GATEWAY_SECRET')||request.headers.get('x-game-gateway')!==env('GAME_GATEWAY_SECRET'))return json({error:'Forbidden'},403);
 try{
  const url=new URL(request.url),action=url.searchParams.get('action');
  if(request.method==='GET'&&action==='scores'){
   const {org,view,page}=boardQuery(url),select='id,name,superskill,score,categories,org,scenario,ruleset,outcome,seconds,created_at';
   const query=new URLSearchParams({select,order:view==='top'?'score.desc,created_at.asc,id.asc':'created_at.desc,id.desc',limit:'26',offset:String(page*25)});
   if(org!=='all')query.set('org','eq.'+org);
   if(view==='top'){query.set('ruleset','eq.'+RULESET);query.set('scenario','eq.'+SCENARIO);}
   const rows=await db('ciso_game_scores?'+query);return json({rows:rows.slice(0,25),more:rows.length>25,ruleset:RULESET,scenario:SCENARIO});
  }
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const body=await boundedJSON(request);
  if(action==='start'){
   if(!['startup','midcap','enterprise'].includes(body.org)||body.ruleset!==RULESET||body.scenario!==SCENARIO)return json({error:'This is a practice scenario.'},400);
   const ip=request.headers.get('x-game-client');if(!ip)return json({error:'Client identity unavailable'},400);
   const token=hex(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await hash(token),ipHash=await hash(env('GAME_GATEWAY_SECRET')+'|'+ip);
   await db('rpc/ciso_begin_run',{p_token:tokenHash,p_ip:ipHash,p_org:body.org});return json({token,ruleset:RULESET,scenario:SCENARIO});
  }
  if(action==='submit'){
   if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))throw Error('Invalid run ticket.');
   const name=publicText(body.name,28,'callsign'),skill=publicText(body.superskill,40,'superskill');validateReplay(body.run);
   const session=await db('rpc/ciso_claim_run',{p_token:await hash(body.token)});if(!session)return json({error:'Run ticket expired, already submitted, or too many attempts.'},409);
   if(session.org!==body.run.org)throw Error('Organization does not match this run.');
   if(body.run.steps/30>Math.max(0,(Date.now()-Date.parse(session.created_at))/1000)*2.25+15)throw Error('This run finished faster than the allowed game speed.');
   const verified=verifyReplay(body.run);
   if(verified.score!==body.score)throw Error('Score does not match the verified simulation.');
   const id=await db('rpc/ciso_finish_run',{p_run:session.id,p_name:name,p_skill:skill,p_score:verified.score,p_categories:verified.categories,p_org:verified.org,p_scenario:verified.scenario,p_ruleset:verified.ruleset,p_outcome:verified.outcome,p_seconds:verified.seconds});
   return json({id,...verified});
  }
  return json({error:'Not found'},404);
 }catch(error){return json({error:error.message?.startsWith('Too many')?error.message:error.message||'Invalid request'},error.message?.startsWith('Too many')?429:400);}
}
Deno.serve(handler);
