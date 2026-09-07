// Everything a CISO can buy, in $k. One table so the balance can be read in one place.
// "hours" are game hours (one wave). Ranges are in grid cells.

export const TOWERS = {
  ndr: {
    id: 'ndr', name: 'Threat intel tower', short: 'INTEL', hotkey: '1', cost: 30, sell: 0.5,
    blurb: 'Network detection. Identifies which exploit each source is throwing, within range. Finds shadow IT it can see. Does not block anything.',
    levels: [
      { range: 4.5, upgrade: 25, note: 'Identifies attackers in range' },
      { range: 5.5, upgrade: 40, note: '+ tuned detections: IPS in range +25% damage' },
      { range: 6.5, upgrade: 0, note: '+ full packet capture: attackers stay identified' },
    ],
  },
  ips: {
    id: 'ips', name: 'Intrusion prevention', short: 'IPS', hotkey: '2', cost: 40, sell: 0.5,
    blurb: 'Intrusion prevention. Drops appliance, VPN and router exploits in range; web exploits mostly pass it (that is what a WAF is for). Half as effective against unidentified sources, and signatures lag: this year\'s CVEs take a third of the damage until level 3. Persistent scanners take half until level 3.',
    levels: [
      { range: 2.6, damage: 5, interval: 0.6, upgrade: 35, note: 'Signature blocking' },
      { range: 3.0, damage: 8, interval: 0.55, upgrade: 60, note: 'Faster engine, wider span' },
      { range: 3.4, damage: 13, interval: 0.5, upgrade: 0, note: 'Inline ML: no penalty on unidentified traffic, this year\'s CVEs at 70%' },
    ],
  },
  waf: {
    id: 'waf', name: 'Web application firewall', short: 'WAF', hotkey: '3', cost: 45, sell: 0.5,
    blurb: 'Web application firewall. The only thing that really stops web exploits (CMS, app servers, frameworks, AI tooling): slows and wears them down in range. Useless against router, VPN and appliance exploits.',
    levels: [
      { range: 3.2, slow: 0.5, dot: 7, upgrade: 40, note: 'Rate limiting + virtual patching' },
      { range: 3.8, slow: 0.35, dot: 12, upgrade: 0, note: 'Managed rules: heavier virtual patching' },
    ],
  },
  honeytoken: {
    id: 'honeytoken', name: 'Decoy login', short: 'DECOY', hotkey: '4', cost: 20, sell: 0.5,
    blurb: 'Fake credentials and decoy files. The first source that touches one in range is identified and cut off on the spot; then the trap needs re-arming. Cannot hold a persistent scanner. Best inside the network, where lateral movement goes looking for credentials.',
    levels: [
      { range: 2.2, cooldown: 40, upgrade: 20, note: 'One catch, 40s to re-arm' },
      { range: 3.0, cooldown: 40, upgrade: 0, note: 'Wider spread, 40s re-arm' },
    ],
  },
  wall: {
    id: 'wall', name: 'Firewall segment', short: 'SEG', hotkey: '5', cost: 4, sell: 0.5,
    blurb: 'Fixed price, no escalation. Blocks one cell to shape routes. Remove instantly for up to half back, based on integrity. Sealed routes can be breached; stolen credentials bypass walls.',
    levels: [{ upgrade: 0, note: 'Blocks a cell' }],
  },
};

export const PROGRAMMES = {
  intel: { id: 'intel', name: 'Threat intel (Shadowserver report)', cost: 8, blurb: 'Subscribe to the daily report. Shows what the next hour will throw at you and flags which of it targets your stack. Cheap: the reports are free, the cost is onboarding.' },
  scanner: { id: 'scanner', name: 'Vulnerability scanner', cost: 40, blurb: 'Scans your inventory one system at a time and reports which are actually exploitable today. Without it every system reads "unknown".' },
  scanner2: { id: 'scanner2', name: 'Continuous scanning', cost: 35, requires: 'scanner', blurb: 'Re-scans as things change. Catches a vulnerability that turns exploitable mid-day; a one-off scan never will.' },
  vetting: { id: 'vetting', name: 'Supply-chain vetting', cost: 30, deployHours: 2, blurb: 'Software bill of materials, signed updates, vendor reviews. A malicious update or a breached vendor is caught before it runs. Two hours to set up.' },
  discovery: { id: 'discovery', name: 'Asset discovery', cost: 25, blurb: 'Find the systems nobody told you about. Unmanaged systems are on your network whether or not they are in your inventory.' },
  edr: { id: 'edr', name: 'EDR agent', cost: 8, perAsset: true, seconds: 15, blurb: 'Endpoint detection on one server or endpoint fleet: an engineer job of 15s, no downtime. Cuts exploit damage 60% and blocks most lateral movement. Cannot be installed on appliances (firewalls, routers, cameras, PLCs).' },
  mfa: { id: 'mfa', name: 'MFA everywhere', cost: 30, deployHours: 2, blurb: 'Credential-based lateral movement fails half the time. Rollout takes two hours; buy it before you need it.' },
  backups: { id: 'backups', name: 'Tested offline backups', cost: 40, deployHours: 3, blurb: 'A ransomware-linked compromise costs a recovery, not the business: halves ransomware impact and halves incident response time. Three hours to verify before it counts.' },
  awareness: { id: 'awareness', name: 'Awareness & reporting', cost: 25, deployHours: 1, blurb: 'Staff who report odd behaviour. Lateral movement is spotted the moment it starts, and lands 20% less often.' },
  briefing: { id: 'briefing', name: 'Board briefing', cost: 20, blurb: 'Two hours of preparation and one uncomfortable meeting. +15% hourly budget for the rest of the day, starting next hour.' },
  soc1: { id: 'soc1', name: 'SOC shift (2 engineers)', cost: 50, blurb: 'Two patch or response jobs at once instead of one; every job 15% faster.' },
  soc2: { id: 'soc2', name: 'SOC shift (3 engineers)', cost: 90, requires: 'soc1', blurb: 'Three jobs at once; every job 30% faster.' },
  retainer: { id: 'retainer', name: 'Incident response retainer', cost: 35, blurb: 'Response to a compromised system takes half the time and half the money.' },
};

export const ACTIONS = {
  // Patch: cost scales with criticality; appliances need a reboot window.
  patchCost: (asset) => 6 + asset.crit * 6 + (asset.appliance ? 8 : 0),
  patchSeconds: (asset) => 10 + asset.crit * 3 + (asset.appliance ? 5 : 0),
  emergencyMultiplier: 1.5,
  emergencySecondsFactor: 0.4,
  emergencyFailChance: 0.10,      // campaign adds fatigue and change-freeze modifiers
  emergencyFailChanceAppliance: 0.20,
  cabDelaySeconds: 6,
  businessHours: [8, 18],
  replaceCost: (asset) => 40 + asset.crit * 10,
  replaceSeconds: 80,
  isolationOverrideSeconds: 80,
  isolateCost: 5,
  isolateMinSeconds: 40,
  commitRadius: 3,                // an attacker this close is mid-exploit; isolating now does not save you
  irCost: (asset) => 8 + asset.crit * 4,
  irSeconds: (asset) => 16 + asset.crit * 3,
  honeypotReset: 5,
};

export const ECONOMY = {
  prepSeconds: 10,
  firstPrepSeconds: 15,
  waveSeconds: 30,
  spawnWindow: 24,
  earlyCallBonusPerSecond: 0,
  trafficCostPerArrival: 0.01,  // each source reaching an exposed system costs this share of the hour's income (triage, bandwidth)
  trafficCostCap: 0.3,
  bountyPerKill: 0,           // nobody is paid per dropped packet
  refundOnSell: 0.6,
};

export const IMPACT = {
  compromiseBase: 2.5,          // one-off, times criticality
  crownJewelBreach: 8,       // one-off extra when a criticality-3 internal system falls
  ransomwareMultiplier: 1.75,
  perSecondCompromised: 0.010, // times criticality, while compromised; doubles every game hour it stays so
  secondsPerHour: 40,
  perSecondIsolated: 0.010,   // times (1 + revenue/10), while deliberately offline: downtime costs by revenue, not by criticality
  perSecondMaintenance: 0.002,
  loseAt: 100,
};
