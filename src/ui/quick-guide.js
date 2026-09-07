import { ICON } from './icons.js';
import { navigationVisuals } from './operations.js';
import './quick-guide.css';

const node = (icon, text, tone = '') => `<span class="guide-node ${tone}">${ICON[icon]}<b>${text}</b></span>`;
const arrow = `<span class="guide-arrow" aria-hidden="true">${ICON.arrow}</span>`;
const flow = (...nodes) => `<div class="guide-flow">${nodes.join(arrow)}</div>`;
const card = (title, visual, text) => `<article class="guide-card"><h3>${title}</h3>${visual}<p>${text}</p></article>`;

export const GUIDE_TABS = ['Start here', 'Attack examples', 'Incidents', 'People risk'];
export function quickGuide(page = 0) {
 const active = Number.isInteger(page) && page >= 0 && page < GUIDE_TABS.length ? page : 0;
 const pages = [
  `<p class="guide-intro">Survive to midnight. Keep business impact low and board trust high. Protect critical systems and spend wisely.</p>
   <div class="guide-cards">
    ${card('1 · Find the weak spots', flow(node('scanner', 'Scan'), node('systems', 'Select asset')), '<b>Programs → Identify → Scanner.</b> Select a building to see its weaknesses and available fixes.')}
    ${card('2 · Cover the entrances', flow(node('ndr', 'Reveal'), node('ips', 'Defend')), '<b>Build → select a control → click a free tile.</b> Cover all three left-hand uplinks. Radar reveals targets; it does not shoot.')}
    ${card('3 · Fix, then recover', flow(node('engineer', 'Assign'), node('patched', 'Restore', 'good')), 'Patch exposed systems. Clean up infected ones. <b>Engineers at the top</b> opens the work ledger; Team adds capacity.')}
   </div>
   <div class="guide-zones"><span><b>DMZ</b>Public services</span>${arrow}<span><b>Internal</b>Business systems</span>${arrow}<span><b>Core</b>Critical infrastructure</span></div>
   <p class="guide-note">Protect crown jewels in every zone. File incident reports in Programs → Respond; meet evidence deadlines in Programs → Govern to build board trust. Score rewards resilience, effective defense and fast response—not just purchases.</p>`,
  `<p class="guide-intro">A creature is an attack attempt—not proof of infection. Its payload matters more than its shape.</p>
   <div class="guide-cards">
    ${card('Web attack', flow(node('web', 'Web exploit', 'danger'), node('waf', 'WAF'), node('systems', 'Website')), '<b>WAF slows and damages web attacks.</b> Place it in range before they reach the website.')}
    ${card('Device attack', flow(node('appliance', 'Device exploit', 'danger'), node('ips', 'IPS'), node('systems', 'VPN')), '<b>IPS fires at device exploits.</b> Firewall segments force detours, but attackers can break them.')}
    ${card('Why did nothing happen?', flow(node('skull', 'Attempt', 'danger'), node('patched', 'Patched VPN', 'good')), '<b>No matching weakness → no integrity damage.</b> A small probe impact may still count. A matching exploit can damage or infect the building.')}
   </div>
   <p class="guide-note">Build a Threat intel tower near the route to reveal payload + target. Worms spread inside the company; identity controls and EDR help contain them.</p>`,
  `<p class="guide-intro">Select the affected building. Containment buys time; engineers finish the cleanup.</p>
   <div class="guide-cards">
    ${card('Ransomware · locked buildings', flow(node('lock', 'Encrypted', 'danger'), node('backups', 'Rebuild')), '<b>Before encryption:</b> remove the intruder. <b>After:</b> fund Tested backups under Recover, then restore locked assets. Waves keep coming.')}
    ${card('Data leak · packets going up', flow(node('discovery', 'Trace'), node('blocked', 'Contain'), node('engineer', 'Clean')), '<b>Programs → Detect → Data loss monitoring</b> reveals the source. Select it: Quarantine egress, then remove the collector.')}
    ${card('Supply chain · threat from inside', flow(node('supply', 'Bad update', 'danger'), node('systems', 'Infected host'), node('skull', 'Spreads', 'danger')), 'An infected update host keeps spawning malware until cleaned. <b>Select the source and respond.</b> Test ring + Threat intelligence helps prevent it.')}
   </div>
   <p class="guide-note"><b>No patch yet?</b> Restrict or isolate the service and cover it with the right control. Offline systems cost revenue. Check the Operations and character tips.</p>`,
  `<p class="guide-intro">Some threats arrive with a résumé or an employee account—not through the perimeter.</p>
   <div class="guide-cards">
    ${card('1 · Prevent fraudulent hires', flow(node('awareness', 'Train'), node('check', 'Verify')), '<b>Programs → Protect → Staff training → Hiring verification.</b> Training can flag fraud; completed hiring checks stop new fraudulent onboarding.')}
    ${card('2 · Stop the loss', flow(node('ciso', 'Account abuse', 'danger'), node('blocked', 'Revoke', 'good')), '<b>Programs → Actions.</b> Once the account is identified, revoke access for free. Fraud payments and insider misuse stop immediately.')}
    ${card('3 · Close the case', flow(node('engineer', 'Investigate'), node('patched', 'Closed', 'good')), '<b>Verify & close</b> assigns an engineer to review credentials and preserve evidence. Contained is not resolved. The fee and time are shown before ordering.')}
   </div>
   <p class="guide-note">SIEM and training speed detection; Admin lock reduces insider harm. Unconfirmed sources have no map pin. Map tags appear after detection and disappear after resolution.</p>`,
 ];
 return `<div class="guide-heading"><div><div class="eyebrow">QUICK FIELD GUIDE</div><h2>How to play.</h2></div><button data-action="resume" class="guide-close" aria-label="Close guide">×</button></div>
  <nav class="guide-tabs" aria-label="Guide sections">${GUIDE_TABS.map((label, i) => `<button data-action="help-page" data-id="${i}" ${i === active ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav>
  <div class="guide-page">${pages[active]}</div>
  <div class="guide-bottom">${navigationVisuals()}<p>${ICON.clock} The day keeps running.<br>Use <b>Space</b> to pause when back on the map.</p><button data-action="resume" class="primary">Got it →</button></div>`;
}
