import {it,expect,vi,afterEach} from 'vitest';
import gateway from '../server/gateway.js';
const env={GAME_EDGE_URL:'https://verifier.example/v23',GAME_PREVIOUS_EDGE_URL:'https://verifier.example/v22',GAME_GATEWAY_SECRET:'test-only'};
afterEach(()=>vi.unstubAllGlobals());
it.each(['ciso-2026-09-v22','ciso-2026-09-v23','unknown'])('routes %s only to a configured verifier',async ruleset=>{
 const fetch=vi.fn(async()=>new Response('{"ok":true}'));vi.stubGlobal('fetch',fetch);
 const req=new Request('https://game.example/api/submit',{method:'POST',headers:{Origin:'https://game.example','content-type':'application/json'},body:JSON.stringify({run:{ruleset},endpoint:'https://attacker.example'})});
 expect((await gateway.fetch(req,env)).status).toBe(200);
 expect(fetch.mock.calls[0][0].origin).toBe('https://verifier.example');
 expect(fetch.mock.calls[0][0].pathname).toBe(ruleset==='ciso-2026-09-v22'?'/v22':'/v23');
});
it('rejects cross-origin and malformed submissions before contacting any verifier',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const request=origin=>new Request('https://game.example/api/submit',{method:'POST',headers:{Origin:origin,'content-type':'application/json'},body:'invalid JSON'});
 expect((await gateway.fetch(request('https://other.example'),env)).status).toBe(403);
 expect((await gateway.fetch(request('https://game.example'),env)).status).toBe(400);
 expect(fetch).not.toHaveBeenCalled();
});
