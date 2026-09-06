// Game-authored pacing; daily aggregate observations contain no hourly timing.
export const PACING = {
 startup:{rogueHours:[8,19],fraudHour:8,insiderHour:19,leakHour:14,earlyCount:.8,lateCount:1.12,earlyHp:.8,passwordEarly:90,passwordLate:65,bursts:2},
 midcap:{rogueHours:[6,12,18,22],fraudHour:7,insiderHour:18,leakHour:12,earlyCount:.85,lateCount:1.15,earlyHp:.9,passwordEarly:65,passwordLate:45,bursts:2},
 enterprise:{rogueHours:[5,10,17,21],fraudHour:6,insiderHour:17,leakHour:11,earlyCount:.9,lateCount:1.18,earlyHp:.95,passwordEarly:55,passwordLate:35,bursts:3},
};
export function pressureStage(hour){return hour<6?'PREPARE':hour<16?'RESPOND':'SIEGE';}
export function countEnvelope(org,hour){const p=PACING[org];return hour<6?p.earlyCount:hour<16?1:1+(p.lateCount-1)*(hour-15)/8;}
export function combatToughness(v){return Math.max(24,Math.min(140,v.toughness));}
export function releaseTimes(count,hour,org,surge=false){
 if(count<=1)return [0];
 if(hour<16||(!surge&&hour%2))return Array.from({length:count},(_,i)=>i/(count-1));
 const packs=PACING[org].bursts,width=org==='startup'?.2:.14;
 return Array.from({length:count},(_,i)=>{const pack=Math.min(packs-1,Math.floor(i*packs/count));const first=Math.ceil(pack*count/packs),last=Math.ceil((pack+1)*count/packs)-1;return pack*(1-width)/(packs-1)+(last===first?0:(i-first)/(last-first))*width;});
}
