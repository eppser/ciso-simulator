import { run } from './autoplay.mjs';
const [org = 'midcap', strategy = 'ciso', seed = '3'] = process.argv.slice(2);
const g = run({ org, strategy, seed: +seed });
for (const e of g.events) if (['fail', 'warn', 'good'].includes(e.level) || /budget|incoming/.test(e.text)) console.log(e.clock, e.level.padEnd(5), e.text);
console.log(JSON.stringify(g.scorecard(), null, 0));
for (const a of g.assets.values()) console.log(a.id.padEnd(8), a.state.padEnd(11), 'vulns=', [...a.vulns].join(','), 'threats=', a.threats.slice(0,3).map(v=>v.id).join(','), 'shadow=', a.shadow, 'disc=', a.discovered);
