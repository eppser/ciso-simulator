import {boundedJSON} from './validation.js';
const json=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default{async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 const action={'/api/scores':'scores','/api/run':'start','/api/submit':'submit'}[url.pathname];if(!action)return json('Not found',404);
 if(request.method!==(action==='scores'?'GET':'POST'))return json('Method not allowed',405);
 if(action!=='scores'&&request.headers.get('origin')!==url.origin)return json('Origin not allowed',403);
 if(!env.GAME_EDGE_URL||!env.GAME_GATEWAY_SECRET)return json('Leaderboard is not configured. You can still play.',503);
 if(Number(request.headers.get('content-length'))>300000)return json('Request too large',413);
 let body;
 if(request.method==='POST'){try{body=await boundedJSON(request);}catch{return json('Invalid or oversized request',400);}}
 // Existing tabs finish against their original verifier. Never accept a client URL.
 const ruleset=action==='start'?body?.ruleset:body?.run?.ruleset;
 const endpoint=ruleset==='ciso-2026-09-v22'&&env.GAME_PREVIOUS_EDGE_URL?env.GAME_PREVIOUS_EDGE_URL:ruleset==='ciso-2026-09-v23'&&env.GAME_V23_EDGE_URL?env.GAME_V23_EDGE_URL:env.GAME_EDGE_URL;
 const target=new URL(endpoint);target.searchParams.set('action',action);for(const k of ['org','view','page'])if(url.searchParams.has(k))target.searchParams.set(k,url.searchParams.get(k));
 try{const response=await fetch(target,{method:request.method,headers:{'content-type':'application/json','x-game-gateway':env.GAME_GATEWAY_SECRET,'x-game-client':request.headers.get('CF-Connecting-IP')||'unknown'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const headers=new Headers(response.headers);headers.delete('set-cookie');headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');return new Response(response.body,{status:response.status,headers});}catch{return json('Leaderboard temporarily unavailable. Try again shortly.',503);}
}};
