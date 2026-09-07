import { PROGRAMMES } from './catalog.js';

// Production rules for the rebuilt campaign. One second means one simulation second.
export const HOUR_SECONDS = 40;
export const CALENDAR = [
  [.45, 1, 'First contact'], [.50, 1, 'Unlisted system'], [.55, 1, 'New product targeted'],
  [.65, 1.05, 'Exposure discovered'], [.70, 1.05, 'Campaign warning'], [.80, 1.10, 'Scanning surge'],
  [.85, 1.15, 'Morning handover'], [.90, 1.20, 'False alarm'], [1, 1.25, 'Targeted campaign'],
  [1, 1.30, 'Zero-day · password attacks'], [1.05, 1.35, 'Poisoned update'], [1.10, 1.40, 'Scanning surge'],
  [1.10, 1.45, 'Board review · incomplete fix'], [1.20, 1.50, 'Second fix warning'],
  [1.25, 1.55, 'Targeted campaign'], [1.30, 1.60, 'Second zero-day'],
  [1.40, 1.70, 'Vendor credentials leaked'], [1.50, 1.80, 'Scanning surge'],
  [1.60, 1.90, 'Office hours end'], [1.70, 2, 'Poisoned update · estate review'],
  [1.80, 2.10, 'Targeted campaign'], [1.90, 2.20, 'Persistent scanners double'],
  [2, 2.30, 'Extortion deadline'], [2.20, 2.40, 'Final surge'],
];
export const MODIFIERS = [
  { id: 'campaign', label: 'Campaign pressure', detail: 'The leading product campaign sends twice as many sources.' },
  { id: 'scanner', label: 'Scanner day', detail: 'Persistent campaign leaders appear in the three late surges.' },
  { id: 'web', label: 'Web pressure', detail: 'More application exploits. WAF coverage matters.' },
  { id: 'appliance', label: 'Appliance pressure', detail: 'More device exploits. Invest in intrusion prevention.' },
  { id: 'botnet', label: 'Botnet day', detail: 'More sources, less health, faster movement.' },
  { id: 'quiet', label: 'Quiet before the storm', detail: 'A gentler first shift. A harder final siege.' },
];
export const TRACKS = ['Actions', 'Visibility', 'Identity', 'Protect', 'Detect', 'Recover', 'Govern'];
const p = (id, name, track, cost, seconds, blurb, requires) => ({ id, name, track, cost, seconds, blurb, requires });
export const PROGRAMS = {
  scanner: p('scanner', 'Scanner', 'Visibility', 35, 0, 'Find vulnerabilities, one system every 4 seconds.'),
  scanner2: p('scanner2', 'Keep scanning', 'Visibility', 30, 0, 'Scan every 2 seconds and continuously refresh known systems.', 'scanner'),
  discovery: p('discovery', 'Find everything', 'Visibility', 25, 0, 'Discover shadow IT now and sweep for new devices every 8 seconds.'),
  outside: p('outside', 'Outside view', 'Visibility', 40, 30, 'An engineer audits every exposed system.'),
  intel: p('intel', 'Threat intelligence', 'Visibility', 10, 0, 'See the next hour. With a Test ring, reject poisoned updates.'),
  mfa: p('mfa', 'Identity provider · MFA', 'Identity', 35, 80, 'Connect the estate to identity controls. Stop 80% of stolen-password hops.'),
  hardware: p('hardware', 'Hardware login check', 'Identity', 25, 40, 'Stop 95% of stolen-login attempts. Requires active identity provider.', 'mfa'),
  pam: p('pam', 'Admin lock', 'Identity', 45, 80, 'Stop stolen admin credentials crossing the network.'),
  backups: p('backups', 'Tested backups', 'Recover', 45, 120, 'Recover encrypted systems. Halve ransomware impact.'),
  training: p('training', 'Staff training', 'Protect', 15, 40, 'Verify suspicious requests: block 65% of social engineering and flag 50% of fraudulent hires. Detect workforce misuse faster; not account cleanup.'),
  hiring: p('hiring', 'Hiring verification', 'Protect', 25, 40, 'Verify identity, references and company-device custody. Prevent new remote-worker fraud once active; existing cases still need response.', 'training'),
  vetting: p('vetting', 'Test ring', 'Protect', 35, 80, 'Hold updates for 80 seconds. Threat intelligence or EDR on the test host detects poison.'),
  harden: p('harden', 'Harden systems', 'Protect', 35, 80, 'Delay zero-day exposure by 80 seconds.'),
  awareness: p('awareness', 'SIEM · inside radar', 'Detect', 55, 40, 'See lateral movement and ransom timers. Halve the impact of alert noise; adds 5% analysis overhead.'),
  dlp: p('dlp', 'Data loss monitoring', 'Detect', 35, 20, 'Trace a data leak to its source. Does not stop it: quarantine egress, then remove the collector.'),
  soc1: p('soc1', 'Second shift', 'Team', 60, 0, 'Add an engineer. Engineering job times are 15% shorter.'),
  soc2: p('soc2', 'Third shift', 'Team', 80, 0, 'Add an engineer. Engineering job times are 30% shorter in total; fresh shifts limit fatigue.', 'soc1'),
  retainer: p('retainer', 'Responders on call', 'Team', 35, 0, 'Halve normal cleanup time and base response cost. Encrypted rebuild time is unchanged.'),
  drill: p('drill', 'Incident drill', 'Team', 20, 20, 'Practise response. Unlock ransomware negotiations.'),
  spare: p('spare', 'Spare site', 'Recover', 70, 120, 'Use a 60-second base rebuild instead of 120 seconds; engineer workload still applies.', 'backups'),
  insurance: p('insurance', 'Cyber insurance', 'Recover', 70, 0, 'Refund 60% of qualifying recovery costs above the excess. No ransom cover.'),
  briefing: p('briefing', 'Brief the board', 'Govern', 25, 20, 'One briefing per act. Earn trust when business impact improves.'),
  comms: p('comms', 'Comms and lawyers', 'Govern', 30, 0, 'File without engineer time. Add 80 seconds to the negotiated ransomware leak deadline.'),
};
// Legacy rendering reads the shared registry. Keep IDs stable across both surfaces.
Object.assign(PROGRAMMES, PROGRAMS);
export const priceScale = { startup: .7, midcap: 1, enterprise: 1.5 };
export function scaled(value, org) { const n = value * priceScale[org.id]; return n < 20 ? Math.round(n) : Math.round(n / 5) * 5; }
