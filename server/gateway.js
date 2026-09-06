const json=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default{async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 const action={'/api/scores':'scores','/api/run':'start','/api/submit':'submit'}[url.pathname];if(!action)return json('Not found',404);
 if(request.method!==(action==='scores'?'GET':'POST'))return json('Method not allowed',405);
 if(action!=='scores'&&request.headers.get('origin')!==url.origin)return json('Origin not allowed',403);
 if(!env.GAME_EDGE_URL||!env.GAME_GATEWAY_SECRET)return json('Leaderboard is not configured. You can still play.',503);
 if(Number(request.headers.get('content-length'))>300000)return json('Request too large',413);
 const target=new URL(env.GAME_EDGE_URL);target.searchParams.set('action',action);for(const k of ['org','view','page'])if(url.searchParams.has(k))target.searchParams.set(k,url.searchParams.get(k));
 try{const response=await fetch(target,{method:request.method,headers:{'content-type':'application/json','x-game-gateway':env.GAME_GATEWAY_SECRET,'x-game-client':request.headers.get('CF-Connecting-IP')||'unknown'},body:request.method==='POST'?request.body:undefined,signal:AbortSignal.timeout(15000)});const headers=new Headers(response.headers);headers.delete('set-cookie');headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');return new Response(response.body,{status:response.status,headers});}catch{return json('Leaderboard temporarily unavailable. Try again shortly.',503);}
}};
