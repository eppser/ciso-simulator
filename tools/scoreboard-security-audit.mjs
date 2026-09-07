import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base=process.env.GAME_TEST_URL||'https://ciso-simulator-staging.pages.dev';
if(!base.includes('ciso-simulator-staging.pages.dev'))throw Error('Destructive QA fixtures are staging-only.');
const ref='ewlsvqspmivodvolawzv',checks=[],created=[],tokens=[];
async function sql(query){const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'content-type':'application/json'},body:JSON.stringify({query})});const d=await r.json();if(!r.ok)throw Error('Staging fixture query failed');return d;}
async function request(path,body,extra={}){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',Origin:base,...extra},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
try{
 let r=await request('/api/run',{org:'startup',ruleset:'ciso-2026-09-v24',scenario:'2026-09-02'},{Origin:'https://untrusted.example'});assert.equal(r.status,403);checks.push('Cross-origin submission blocked');
 r=await request('/api/scores?org=startup&page=-1');assert.equal(r.status,400);checks.push('Invalid pagination rejected');
 r=await request('/api/submit',{token:'a'.repeat(64),name:'<script>',superskill:'testing',score:10000,run:{}});assert.equal(r.status,400);checks.push('HTML and malformed run rejected');
 r=await request('/api/run',{padding:'x'.repeat(310000)});assert.equal(r.status,413);checks.push('Oversized body blocked');
 for(const org of ['startup','midcap','enterprise']){
  const fixture=JSON.parse(fs.readFileSync('artifacts/release/'+org+'-replay.json','utf8'));
  const started=await request('/api/run',{org,ruleset:fixture.run.ruleset,scenario:fixture.run.scenario});assert.equal(started.status,200);const token=started.body.token,hash=crypto.createHash('sha256').update(token).digest('hex');tokens.push(hash);
  const body={token,name:'QA Release Audit',superskill:'Temporary automated test',score:fixture.score,run:fixture.run};
  const early=await request('/api/submit',body);assert.equal(early.status,400);assert.match(early.body.error,/faster/);checks.push(org+': impossible completion time rejected');
  // Test fixture only: advance this one ticket's clock to exercise the verified write path
  // without a twenty-minute wall-clock delay. Never modify an actual player's ticket.
  await sql("update ciso_game_private.runs set created_at=now()-interval '1 hour' where token_hash='"+hash+"'");
  const forged=await request('/api/submit',{...body,score:10000});assert.equal(forged.status,400);assert.match(forged.body.error,/Score does not match/);checks.push(org+': invented 10000-point score rejected');
  const real=await request('/api/submit',body);assert.equal(real.status,200,JSON.stringify(real.body));assert.equal(real.body.score,fixture.score);assert.match(real.body.id,/^[a-f0-9-]{36}$/);created.push(real.body.id);checks.push(org+': server replay matched '+fixture.score+' and saved once');
  const duplicate=await request('/api/submit',body);assert.equal(duplicate.status,409);checks.push(org+': duplicate rejected');
  const board=await request('/api/scores?org='+org);assert.ok(board.body.rows.some(row=>row.id===real.body.id));assert.ok(board.body.rows.every(row=>!('run_id'in row)&&!('ip_hash'in row)));checks.push(org+': public board exposes only public score fields');
 }
 const combined=await request('/api/scores');assert.equal(combined.status,200);for(const id of created)assert.ok(combined.body.rows.some(row=>row.id===id));checks.push('One default board includes verified scores from all three difficulties');
 const roles=await sql("select has_table_privilege('anon','public.ciso_game_scores','INSERT') as anon_insert,has_table_privilege('authenticated','public.ciso_game_scores','UPDATE') as auth_update,has_function_privilege('authenticated','public.ciso_claim_run(text)','EXECUTE') as auth_claim");assert.deepEqual(roles[0],{anon_insert:false,auth_update:false,auth_claim:false});checks.push('Anonymous and authenticated write privileges denied');
 fs.writeFileSync('artifacts/release/security-report.json',JSON.stringify({checks,fixtureClockNote:'Only newly created QA tickets were backdated; all QA scores and tickets removed in finally.',at:new Date().toISOString()},null,2));console.log(JSON.stringify({checks}));
}finally{
 for(const id of created)await sql("delete from public.ciso_game_scores where id='"+id+"' and name='QA Release Audit'");
 for(const hash of tokens)await sql("delete from ciso_game_private.runs where token_hash='"+hash+"'");
 console.log('Removed temporary QA score rows and their test tickets.');
}
