import {it,expect} from 'vitest';
import {Campaign} from '../src/sim/campaign.js';
import {ORGS} from '../src/sim/orgs.js';
import {BUILTIN_DAYS,scenarioModel} from '../src/sim/scenarios.js';
import {operationCards,renderOperations} from '../src/ui/operations-center.js';
import {renderActionDirectory} from '../src/ui/action-directory.js';
import {sessionMenu} from '../src/ui/session-menu.js';
const mk=()=>new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS.startup,seed:42});
it('orders missed mandatory deadlines ahead of active threats and optional requests',()=>{
 const g=mk();g.hour=4;g.tickGrc();g.grc[0].missed=true;g.asset('db').state='compromised';g.requestEvidence();
 const cards=operationCards(g);expect(cards[0].id).toBe('grc-inventory');expect(cards.findIndex(c=>c.kind==='threat')).toBeLessThan(cards.findIndex(c=>c.id==='fbi-evidence'));
 expect(renderOperations(g)).not.toContain('FIRST STEP');
});
it('links to actions on the left and keeps optional completion out of the main feed',()=>{
 const g=mk();g.requestEvidence();expect(renderOperations(g)).not.toContain('data-action="evidence-prepare"');
 expect(renderOperations(g)).toContain('data-action="operation-action" data-id="fbi-evidence"');
 expect(renderActionDirectory(g,1,'Govern')).toContain('data-action="evidence-prepare"');
 g.evidence.state='deferred';expect(renderOperations(g)).not.toContain('FBI · incident logs');expect(renderActionDirectory(g,1,'Govern')).toContain('FBI · incident logs');
});
it('combines threats and requests without duplicating the engineering ledger',()=>{
 const g=mk();g.asset('db').state='compromised';g.requestEvidence();g.log('A completed order','build');
 expect(renderOperations(g)).toContain('Malware foothold');expect(renderOperations(g)).toContain('FBI · incident logs');
 expect(renderOperations(g)).not.toContain('ops-counters');expect(operationCards(g).some(r=>r.kind==='work')).toBe(false);
 expect(renderOperations(g,1,true)).toContain('A completed order');expect(renderOperations(g)).not.toContain('A completed order');
});
it('menu and restart confirmation are read-only renderers, with explicit consequences',()=>{
 const g=mk(),app={game:g,paused:false};g.time=18;g.budget=123;
 const html=sessionMenu(app);expect(html).toContain('Resume game');expect(html).toContain('Restart this day');expect(html).toContain('SIMULATION CONTINUES');
 expect(html).not.toContain('data-action="restart-confirm"');expect(sessionMenu(app,true)).toContain('data-action="restart-confirm"');
 expect(g.time).toBe(18);expect(g.budget).toBe(123);expect(app.paused).toBe(false);
});
