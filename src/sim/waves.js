// Turns the day's distribution into 24 hourly waves.
//
// Shadowserver publishes DAILY totals; nothing in the feed says which hour a source was
// active. The hourly split below is therefore the game's difficulty curve, not data, and
// the README says so. What IS data: which vulnerabilities appear, how many sources each
// had, how hard each source pushed (toughness), and which ones target your stack.
//
// Each hour: `n` attackers. A "featured" vulnerability headlines the hour (rotating through
// the day's biggest campaigns against your stack, then the biggest overall), the rest is
// drawn by unique-IP share, with a fixed share reserved for things that match your products
// so the game is about your organisation and not only about the internet's background
// radiation. Surge hours carry a persistent-scanner "boss" from the most intense campaign.

import { fakeIp } from './data.js';

export const HOURS = 24;
export const SURGE_HOURS = new Set([5, 11, 17, 23]);
// Three campaign shifts: for three consecutive hours the featured campaign is one aimed at
// YOUR stack and carries nearly half the hour. Announced one hour ahead with threat intel.
export const CAMPAIGNS = [{ start: 8 }, { start: 14 }, { start: 20 }];
export const campaignAt = (h) => CAMPAIGNS.find((c) => h >= c.start && h < c.start + 3) || null;

export function planWaves({ model, org, threatsByAsset, rng, difficulty = 1 }) {
  const relevantIds = new Set();
  for (const list of Object.values(threatsByAsset)) for (const v of list) relevantIds.add(v.id);
  const relevant = model.vulns.filter((v) => relevantIds.has(v.id));
  const noise = model.vulns.filter((v) => !relevantIds.has(v.id));
  const relW = relevant.map((v) => ({ v, w: Math.sqrt(v.ips) + 1 }));
  const noiseW = noise.map((v) => ({ v, w: v.ips }));

  // Featured rotation: the campaigns against your stack ordered by connections, then the
  // day's biggest campaigns overall so a Fortinet-sized storm still arrives even if you
  // run no Fortinet: that is what everyone else on the internet saw that day.
  const rotation = [...relevant.slice(0, 12), ...model.vulns.filter((v) => !relevantIds.has(v.id)).slice(0, 12)];
  const seen = new Set(); const featuredPool = [];
  for (const v of rotation) if (!seen.has(v.id)) { seen.add(v.id); featuredPool.push(v); }

  const waves = [];
  for (let h = 0; h < HOURS; h++) {
    // Easy first half so a player can build something; a steepening second half.
    const ramp = h < 12 ? 0.55 + 0.45 * (h / 11) : 1.0 + 1.3 * ((h - 11) / 12) ** 1.6;
    const n = Math.max(6, Math.round(org.waveBase * ramp * difficulty));
    const camp = campaignAt(h);
    let featured = featuredPool.length ? featuredPool[(h * 5) % featuredPool.length] : null;
    if (camp && relevant.length) featured = relevant[(CAMPAIGNS.indexOf(camp) * 3) % relevant.length];
    const surge = SURGE_HOURS.has(h);
    const featShare = surge || camp ? 0.45 : 0.3;
    const relShare = 0.3;
    const attackers = [];
    for (let i = 0; i < n; i++) {
      const r = rng.next();
      let v;
      if (featured && r < featShare) v = featured;
      else if (relW.length && r < featShare + relShare) v = rng.weighted(relW).v;
      else if (noiseW.length) v = rng.weighted(noiseW).v;
      else v = rng.weighted(relW).v;
      attackers.push(spec(v, h, rng, difficulty, false));
    }
    if (surge) {
      const bossFrom = relevant.length ? relevant.slice().sort((a, b) => b.perIp - a.perIp)[0] : model.vulns.slice().sort((a, b) => b.perIp - a.perIp)[0];
      attackers.push(spec(bossFrom, h, rng, difficulty, true));
    }
    // Release order: the boss leads (it arrives while the wave is still up), the rest shuffled
    // over the spawn window.
    const boss = attackers.filter((a) => a.boss);
    const rest = rng.shuffle(attackers.filter((a) => !a.boss));
    const ordered = [...boss, ...rest];
    ordered.forEach((a, i) => { a.t = (i / Math.max(1, ordered.length - 1)) * 1; });
    waves.push({ hour: h, n: ordered.length, featured: featured ? featured.id : null, surge, campaign: !!camp, attackers: ordered });
  }
  return waves;
}

function spec(v, h, rng, difficulty, boss) {
  // Toughness scaling: +2.5%/hour in the morning, +7%/hour after noon.
  const level = h < 12 ? 1 + 0.025 * h : 1.3 + 0.07 * (h - 12);
  let hp = Math.round(v.toughness * level * (0.85 + 0.3 * rng.next()) * (0.9 + 0.2 * difficulty));
  if (boss) hp = Math.round(hp * 3.2);
  return {
    vuln: v.id,
    ip: fakeIp(rng),
    hp,
    speed: boss ? v.speed * 0.6 : v.speed * (0.92 + 0.16 * rng.next()),
    spawn: rng.int(0, 2),
    row: rng.int(0, 2),
    boss,
    t: 0,
  };
}
