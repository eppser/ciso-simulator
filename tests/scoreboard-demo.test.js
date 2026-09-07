import {it,expect} from 'vitest';
import {DEMO_SCORES,showDemoScores,renderDemoScores,renderScoreRows} from '../src/ui/scoreboard-demo.js';
import {publicText} from '../server/validation.js';
import {scoreboardHero} from '../src/ui/scoreboard-hero.js';
it('provides six distinct, plausible pseudonyms and bounded descending example scores',()=>{
 expect(DEMO_SCORES).toHaveLength(6);expect(new Set(DEMO_SCORES.map(r=>r.name)).size).toBe(6);
 expect(DEMO_SCORES.map(r=>r.score)).toEqual(DEMO_SCORES.map(r=>r.score).sort((a,b)=>b-a));
  for(const r of DEMO_SCORES){expect(publicText(r.name,28,'name')).toBe(r.name);expect(publicText(r.superskill,40,'superskill')).toBe(r.superskill);expect(r.score).toBeGreaterThanOrEqual(1000);expect(r.score).toBeLessThanOrEqual(2000);expect(r).not.toHaveProperty('created_at');expect(r).not.toHaveProperty('id');}
});
it('only fills the empty first Top page, never real rankings or run history',()=>{
 expect(showDemoScores('top',0,[])).toBe(true);expect(showDemoScores('top',0,[{score:1}])).toBe(false);expect(showDemoScores('history',0,[])).toBe(false);expect(showDemoScores('top',1,[])).toBe(false);
});
it('visibly distinguishes every sample from verified results',()=>{
 const html=renderDemoScores();expect(html).not.toContain('lb-bot');expect(html.match(/class="lb-seed-note"/g)).toHaveLength(1);expect(html).toContain('not verified player runs');expect(html).not.toContain('EXAMPLE SCORES');expect(html).not.toContain('<form');
});
it('escapes usernames and mottos while keeping real players free of bot markers',()=>{
 const html=renderScoreRows([{name:'<script>bad</script>',superskill:'<img src=x>',score:7500}]);expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).not.toContain('lb-bot');expect(html).toContain('7,500');
});
it('only highlights the first three positions across pagination',()=>{
 expect(renderDemoScores().match(/lb-podium/g)).toHaveLength(3);
 expect(renderScoreRows(DEMO_SCORES,25)).not.toContain('lb-podium');
 expect(renderScoreRows(DEMO_SCORES,25)).toContain('Position 26');
});
it('adds a decorative game masthead without invented player counts or results',()=>{
 const html=scoreboardHero();expect(html).toContain('lb-hero-art');expect(html).toContain('10,000');expect(html).toContain('THE CEILING');expect(html).not.toContain('players online');
});
