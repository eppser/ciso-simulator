// The deputy CISO. Reads the game state and says the two most useful things. `text` is a
// short imperative (<= 70 chars, meant to be spoken); `detail` is the longer sentence.
// Everything is derived from state the player could read themselves; it just reads faster.
import { PROGRAMMES, TOWERS } from '../sim/catalog.js';

const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const nm = (v, id) => (v && v.shortName) || id;

export function advise(g) {
  const tips = [];
  const assets = [...g.assets.values()];
  const discovered = assets.filter((a) => a.discovered);
  const compromised = discovered.filter((a) => a.state === 'compromised');
  const knownVuln = discovered.filter((a) => a.knownVulns && a.knownVulns.size && a.state === 'ok');
  const unscanned = discovered.filter((a) => a.knownVulns === null);
  const hidden = assets.filter((a) => !a.discovered);

  for (const a of compromised) {
    const plan = g.irPlan(a, true);
    const hrs = (a.compromisedFor / 75).toFixed(1);
    tips.push({ p: 100 + a.crit * 10 + Math.min(20, a.compromisedFor / 10), kind: 'fail', assetId: a.id,
      text: `${a.name} is compromised. Respond now.`,
      detail: `Compromised for ${hrs}h; the hourly cost doubles every hour and it seeds lateral movement every ${a.trusted ? 10 : g.has('awareness') ? '~37' : 30}s. Respond${plan.patchVulns.length ? ' + patch' : ''}: $${plan.cost}k, ${Math.round(plan.seconds * g.jobSpeed())}s${g.has('backups') ? '' : '; twice as long without tested backups'}.` });
  }
  for (const a of knownVuln.sort((x, y) => y.crit - x.crit).slice(0, 2)) {
    const vid = [...a.knownVulns][0]; const v = g.vuln(vid);
    const n = v ? v.ips : 0;
    const fh = g.fixHour(vid);
    if (v && !v.patchable) tips.push({ p: 80 + a.crit * 5, kind: 'warn', assetId: a.id, text: `${a.name} has no fix. Replace or isolate it.`, detail: `Exploitable via ${nm(v, vid)} (${vid}); the vendor ships no fix (assumed EOL). ${n} sources threw it today. Replace it (two hours offline) or isolate it and accept the outage.` });
    else if (fh !== null) tips.push({ p: 90 + a.crit * 5, kind: 'warn', assetId: a.id, text: `${a.name}: no fix until ${hh(fh)}. ${v && v.web ? 'WAF' : 'IPS'} or isolate.`, detail: `Exploitable via ${nm(v, vid)} (${vid}) and there is no vendor fix until ${hh(fh)}. ${v && v.web ? 'A WAF in front of it virtual-patches' : 'An IPS in front of it slows them'}; isolating costs revenue and the business tolerates two hours.` });
    else tips.push({ p: 80 + a.crit * 5 + (a.exposed ? 5 : 0), kind: 'warn', assetId: a.id, text: `${a.name} is exploitable. Patch it now.`, detail: `${nm(v, vid)} (${vid}): ${n} sources used it today${v && v.ransomware ? ', ransomware-linked' : ''}. Patch it (${a.appliance ? 'a reboot window' : 'a short change window'}${g.businessHours() && a.crit === 3 && a.revenue > 0 ? ', plus change-board approval in business hours' : ''}) or isolate it until you can.` });
  }
  for (const a of discovered.filter((x) => x.state === 'isolated' && x.revenue >= 3 && x.isolatedFor > 100)) tips.push({ p: 85, kind: 'warn', assetId: a.id, text: `${a.name} comes back online soon. Patch it first.`, detail: `Offline ${(a.isolatedFor / 75).toFixed(1)}h. The business forces it back online at 2h${a.vulns.size ? ', still exploitable' : ''}.` });
  if (!g.bought('scanner')) tips.push({ p: 70, kind: 'info', text: 'Buy the scanner. You are blind.', detail: `You do not know which of your ${discovered.length} systems are exploitable today. A vulnerability scanner ($${PROGRAMMES.scanner.cost}k) tells you, one system every 6s.` });
  else if (unscanned.length && g.hour < 3) tips.push({ p: 40, kind: 'info', text: `${unscanned.length} systems still unscanned. Wait for it.`, detail: 'The scanner works one system at a time; exposed, high-criticality systems matter most.' });
  if (hidden.length && !g.bought('discovery') && g.hour >= 1) tips.push({ p: 60, kind: 'warn', text: 'Something on the network is not in your inventory.', detail: `The dark shapes are unmanaged systems. Asset discovery ($${PROGRAMMES.discovery.cost}k) finds them; so does an NDR sensor that covers them; so does an attacker.` });
  if (!g.towers.some((t) => t.type === 'ndr') && g.hour >= 1) tips.push({ p: 50, kind: 'info', text: 'Place an NDR sensor. Unnamed traffic is half-blocked.', detail: `Every source is unidentified until a sensor sees it, and an IPS is half as effective on traffic it cannot name. NDR ($${TOWERS.ndr.cost}k) names everything in range.` });
  if (compromised.length && !g.towers.some((t) => t.type === 'honeytoken')) tips.push({ p: 58, kind: 'info', text: 'Drop honey tokens inside the network. Lateral movement hunts credentials.', detail: `Honey tokens ($${TOWERS.honeytoken.cost}k) catch the first source that touches them, then re-arm. Place them between the breach and the crown jewels.` });
  if (!g.bought('vetting') && g.hour >= 2) tips.push({ p: 48, kind: 'info', text: 'Vet your supply chain. Some attacks arrive as trusted updates.', detail: `Supply-chain vetting ($${PROGRAMMES.vetting.cost}k, two hours to set up) blocks a malicious update or a breached vendor before it runs on an internal system.` });
  if (!g.bought('intel')) tips.push({ p: 35, kind: 'info', text: 'Get the Shadowserver report. It is cheap.', detail: `$${PROGRAMMES.intel.cost}k: previews the next hour, flags what targets your stack, warns of campaign shifts an hour ahead.` });
  if (g.activeJobs() >= g.concurrency() && knownVuln.length > g.concurrency() && !g.bought('soc2')) tips.push({ p: 55, kind: 'warn', text: 'Engineers are the bottleneck. Add a SOC shift.', detail: `${g.concurrency() === 1 ? 'Your only engineer is' : `${g.concurrency()} engineers are`} busy and ${knownVuln.length} exploitable systems wait. A SOC shift adds a parallel job; or isolate what you cannot reach yet.` });
  const crown = discovered.filter((a) => a.crit === 3 && !a.exposed && a.canEdr && !a.edr);
  if (crown.length && (compromised.length || g.hour >= 4)) tips.push({ p: 45, kind: 'info', assetId: crown[0].id, text: `Put EDR on ${crown[0].name}.`, detail: `${crown.map((a) => a.name).join(', ')}: crown jewels with no EDR. Lateral movement lands 60% of the time; with EDR 18%. A 15s engineer job.` });
  if (!g.bought('mfa') && g.hour >= 2 && g.budget > 60) tips.push({ p: 30, kind: 'info', text: 'Fund MFA before you need it.', detail: 'MFA halves credential-based lateral movement and takes two hours to roll out.' });
  const next = g.waves[g.hour + 1];
  if (next && next.campaign && !g.waves[g.hour].campaign && g.has('intel')) { const fv = g.vuln(next.featured); const tg = (g.assetsByVuln.get(next.featured) || []).filter((a) => a.discovered); tips.push({ p: 78, kind: 'warn', text: `Campaign at ${hh(g.hour + 1)}: ${nm(fv, next.featured)}. Prepare.`, detail: `Three hours${tg.length ? `, aimed at ${tg.map((a) => a.name).join(', ')}` : ''}. ${tg.some((a) => a.vulns.has(next.featured)) ? 'At least one target is exploitable right now.' : 'Put a sensor and a WAF or IPS in front of the target.'}` }); }
  const w = g.previewWave();
  if (w) { const d = w.rows.filter((r) => r.relevance === 'danger'); if (d.length) tips.push({ p: 75, kind: 'warn', text: `Next hour hits ${d[0].targets.map((a) => a.name)[0]}. It is exploitable.`, detail: d.map((r) => `${r.n}x ${nm(r.vuln, r.vuln.id)} at ${r.targets.map((a) => a.name).join('/')}`).join('; ') + ' - and those systems are exploitable right now.' }); }
  if (g.budget > 0.6 * g.org.budget && g.hour >= 2 && knownVuln.length) tips.push({ p: 42, kind: 'info', text: 'Spend the budget. Cash is not a score.', detail: `You hold $${Math.round(g.budget)}k while ${knownVuln.length} known-exploitable systems wait.` });
  if (g.phase === 'prep' && g.hour > 0 && g.activeJobs() === 0 && g.attackers.length === 0 && tips.length < 2) tips.push({ p: 10, kind: 'info', text: 'Quiet. Call the hour early for a bonus.', detail: `Calling now pays $${Math.round(Math.min(g.phaseTimer, 25) * 0.25)}k.` });
  tips.sort((a, b) => b.p - a.p);
  return tips.slice(0, 2);
}
