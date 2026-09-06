import {Campaign} from './campaign.js';
import {scenarioModel,BUILTIN_DAYS,daySeed} from './scenarios.js';
import {ORGS} from './orgs.js';

import {RULESET,SCENARIO} from '../scoreboard-config.js';
export {RULESET,SCENARIO};
export const STEP=1/30,MAX_STEPS=120000,MAX_COMMANDS=4000;
// Only player commands, never arbitrary object paths or internal engine methods.
export const COMMANDS=Object.freeze({buy:[1,1],place:[3,3],upgrade:[1,1],sell:[1,1],removeWall:[2,2],setMode:[2,2],patch:[2,3],replace:[1,1],installEdr:[1,1],isolate:[1,2],respond:[1,2],startHourEarly:[0,0],choose:[2,2],quarantine:[1,1],restrictService:[1,1],cleanLeak:[1,1],buyVendor:[0,0],startGrc:[1,1],containHumanThreat:[1,1],investigateHumanThreat:[1,1],deferEvidence:[0,0],prepareEvidence:[0,0],decideEvidence:[1,1],fileIncident:[0,0],freezeChanges:[0,0]});
const terminal=g=>['won','lost'].includes(g.phase);
export function recordRun(game){
 const journal={ruleset:RULESET,scenario:game.model.day,org:game.org.id,steps:0,commands:[],eligible:true};let depth=0;
 const tick=game.tick;game.tick=function(dt){depth++;try{const done=terminal(this);const r=tick.call(this,dt);if(!done){if(Math.abs(dt-STEP)>1e-10)journal.eligible=false;journal.steps++;if(journal.steps>MAX_STEPS)journal.eligible=false;}return r;}finally{depth--;}};
 for(const method of Object.keys(COMMANDS)){const original=game[method];if(typeof original!=='function')throw Error('Missing command '+method);game[method]=function(...args){const external=depth===0;if(external&&terminal(this))return{ok:false,reason:'This day has ended. Start a new day.'};if(external){if(journal.commands.length<MAX_COMMANDS)journal.commands.push({step:journal.steps,method,args:args.map(x=>x===undefined?null:x)});else journal.eligible=false;}depth++;try{return original.apply(this,args);}finally{depth--;}};}
 return journal;
}
export function validateReplay(run){
 if(!run||run.ruleset!==RULESET||run.scenario!==SCENARIO||!Object.hasOwn(ORGS,run.org)||!Number.isSafeInteger(run.steps)||run.steps<1||run.steps>MAX_STEPS||!Array.isArray(run.commands)||run.commands.length>MAX_COMMANDS)throw Error('Invalid or unsupported run.');
 let previous=0;
 for(const c of run.commands){const sizes=Object.hasOwn(COMMANDS,c?.method||'')&&COMMANDS[c.method];if(!sizes||!Number.isSafeInteger(c.step)||c.step<previous||c.step>=run.steps||!Array.isArray(c.args)||c.args.length<sizes[0]||c.args.length>sizes[1]||c.args.some(a=>!(typeof a==='string'&&a.length<=180||typeof a==='number'&&Number.isSafeInteger(a)&&Math.abs(a)<=1e6||typeof a==='boolean'||a===null)))throw Error('Invalid run command.');previous=c.step;}
 return run;
}
export function verifyReplay(run){
 validateReplay(run);const game=new Campaign({model:scenarioModel(BUILTIN_DAYS[0]),org:ORGS[run.org],seed:daySeed(SCENARIO),mode:'full'});let index=0;
 for(let step=0;step<run.steps;step++){
  if(terminal(game))throw Error('Commands or ticks after the end of the day.');
  while(run.commands[index]?.step===step){const c=run.commands[index++];game[c.method](...c.args);}
  game.tick(STEP);game.effects.length=0;game.popups.length=0;
 }
 if(!terminal(game)||index!==run.commands.length)throw Error('Finish the day before submitting.');
 const categories=game.scoreBreakdown().map(c=>c.value),score=game.score();
 if(!Number.isInteger(score)||score<0||score>10000||categories.reduce((a,b)=>a+b,0)!==score)throw Error('Invalid score.');
 return{score,categories,outcome:game.phase,seconds:Math.round(game.time),org:run.org,scenario:SCENARIO,ruleset:RULESET};
}
