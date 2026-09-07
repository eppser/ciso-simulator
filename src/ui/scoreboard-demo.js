// Seeded house accounts are presentation-only, never submitted as verified runs.
export const DEMO_SCORES=Object.freeze([
 {name:'packetmoth',superskill:'Patch first. Coffee second.',score:1940,seeded:true},
 {name:'rootless_ronin',superskill:'Trust nobody. Especially printers.',score:1825,seeded:true},
 {name:'PatchTuesday',superskill:'Friday is not a change window.',score:1670,seeded:true},
 {name:'coffee_over_tcp',superskill:'Sleep is a single point of failure.',score:1490,seeded:true},
 {name:'DNSandChill',superskill:'It is always DNS. Until it is not.',score:1280,seeded:true},
 {name:'ctrl_alt_defend',superskill:'Keep calm and check the backups.',score:1060,seeded:true},
].map(Object.freeze));
export const showDemoScores=(view,page,rows)=>view==='top'&&page===0&&rows.length===0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderScoreRows(rows,offset=0){return rows.map((r,i)=>`<article class="lb-row lb-simple-row${r.seeded?' lb-house-row':''}${offset+i<3?' lb-podium lb-place-'+(offset+i+1):''}"><div class="lb-username"><span class="lb-position" aria-label="Position ${offset+i+1}">${String(offset+i+1).padStart(2,'0')}</span><b>${esc(r.name)}</b></div><strong class="lb-points">${Math.max(0,Math.min(10000,Number(r.score)||0)).toLocaleString()}</strong><p class="lb-motto">${esc(r.superskill)}</p></article>`).join('');}
export const renderDemoScores=()=>'<p class="lb-seed-note">Seeded scores · not verified player runs</p>'+renderScoreRows(DEMO_SCORES);
