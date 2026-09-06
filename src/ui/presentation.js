import { TOWERS } from '../sim/catalog.js';
const base=import.meta.env.BASE_URL;
export const programIcon=p=>`${base}concepts/v3/${p.id==='dlp'?'dlp':p.track.toLowerCase()}.png`;
export const assetType=a=>a.kind==='ot'?'warehouse':a.appliance?'telecom':a.crit===3&&!a.exposed?'datacenter':a.x>=14?'tower':'office';
export const assetIcon=a=>`${base}concepts/v2/${assetType(a)}.png`;
export function controlValue(id,level=0){const l=TOWERS[id].levels[level];return {
 ndr:`Reveal exploit + target · ${l.range} tile range · no damage`,
 ips:`Device bursts · ${l.damage} damage / ${l.interval}s · ${l.range} tiles`,
 waf:`Web only · ${l.dot} damage/s · ${Math.round((1-l.slow)*100)}% slow · ${l.range} tiles`,
 honeytoken:`One non-boss catch · ${l.cooldown}s recharge · ${l.range} tiles`,
 wall:'180 integrity · forces detours · breachable · no damage',
}[id];}
export const trustVisual=n=>`<span class="trust-pips" aria-label="${n} of 5 board trust">${Array.from({length:5},(_,i)=>`<i class="${i<n?'filled':''}"></i>`).join('')}</span><small>${n}/5</small>`;
