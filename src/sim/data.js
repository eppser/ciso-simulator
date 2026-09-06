// Turns one day of Shadowserver honeypot rows into the game's threat model.
//
// One row = one (vulnerability, product) pair for the day, with `connections` (exploit
// attempts the sensors saw) and `unique_ips` (distinct sources). The game's attackers are
// IPs; an attacker's toughness is how hard its source hammered the sensors
// (connections per IP), which is what separates a 36-IP Fortinet campaign averaging
// 1,000 attempts each from a 466-IP Huawei botnet averaging three.
//
// Nothing here is invented beyond three explicit mappings, all listed in the README:
//   toughness  = f(connections / unique_ips)
//   speed      = IoT botnets fast, heavy persistent scanners slow
//   web-class  = device classes a web application firewall can plausibly front

// Only classes an HTTP-fronting WAF can plausibly sit in front of. Not databases, not RDP,
// not SMTP, not appliance management planes.
const WEB_CLASSES = new Set([
  'cms', 'web-app-framework', 'web-server', 'app-server', 'other-software', 'ai-system',
  'e-commerce', 'lms', 'forum', 'wiki', 'ticketing', 'web-panel', 'hosting-panel', 'file-transfer',
]);

// End-of-life consumer/IoT lines: the vendor publishes nothing, so the only remediation is
// replacement. Everything else is assumed to have a vendor fix (the day's CVEs are 1-13
// years old; only 6 carry a dated first-party patch in our corpus, all Microsoft).
const NO_FIX_VENDORS = /^(huawei|mvpower|dasan|realtek|netgear|d-link|tenda|totolink|linksys|zyxel|zyxel\/billion|seowon intech|vacron|shenzhen tvt|belkin|wavlink|tp-link|draytek|hytec inter|meig|teltonika|zeroshell|asus|ruijie networks)$/i;

// A label a human can read at a glance: vendor + a compressed product name.
// "Fortinet FortiOS, FortiProxy, and FortiSwitchManager" -> "Fortinet FortiOS".
export function shortName(vendor, product) {
  let p = (product || '').replace(/\s*\(.*?\)/g, '').split(/,| and |\//)[0].trim();
  const v = (vendor || '').replace(/\s*-\s*.*$/, '').trim();
  if (p.toLowerCase().startsWith(v.toLowerCase())) p = p.slice(v.length).trim();
  const s = `${v} ${p}`.trim();
  return s.length > 30 ? s.slice(0, 29) + '…' : s || vendor || product;
}

export function cveYear(id) {
  const m = /^CVE-(\d{4})-/.exec(id);
  return m ? +m[1] : null;
}

export function buildThreatModel(day) {
  const vulns = [];
  for (const r of day.vulnerabilities) {
    const ips = Math.max(1, r.unique_ips | 0);
    const perIp = r.connections / ips;
    const cvss = r.cvss ?? r.ss_score ?? null;
    const scoreBasis = r.cvss != null ? 'cvss' : r.ss_score != null ? 'shadowserver' : 'assumed';
    const year = cveYear(r.id) ?? (r.sensor_first_seen ? +r.sensor_first_seen.slice(0, 4) - 2 : 2018);
    const eol = NO_FIX_VENDORS.test(r.vendor || '') && year < 2022 && (r.iot || /router|dvr|nvr|camera|gateway/i.test(r.device_class || ''));
    vulns.push({
      id: r.id,
      vendor: r.vendor || '',
      product: r.product || '',
      deviceClass: r.device_class || 'other-software',
      iot: !!r.iot,
      connections: r.connections,
      ips,
      perIp,
      cvss,
      severity: cvss ?? 7.5,
      scoreBasis,
      year,
      shortName: shortName(r.vendor || '', r.product || ''),
      title: r.title || null,
      description: r.description || null,
      published: r.published || null,
      kev: r.kev_status === 'in_kev' || !!r.ss_cisa_kev,
      inCisa: !!r.in_cisa,
      ransomware: !!r.ransomware,
      epss: r.epss ?? null,
      domain: r.domain || null,
      web: WEB_CLASSES.has(r.device_class || 'other-software'),
      patchable: !eol,
      eolAssumed: eol,
      // Published within the last 45 days and no dated first-party fix in the corpus: treat
      // the vendor fix as not out yet at the start of the day. The hour it lands is rolled per
      // game (see game.js). Older CVEs are assumed to have a fix available.
      fixPending: !r.patch_date && !!r.published && (Date.parse(day.day) - Date.parse(r.published)) < 45 * 86400e3,
      sensorFirstSeen: r.sensor_first_seen || null,
      // The two data-driven combat numbers.
      toughness: toughness(perIp),
      speed: speedFor(r, perIp),
    });
  }
  vulns.sort((a, b) => b.connections - a.connections);
  const byId = new Map(vulns.map((v) => [v.id, v]));
  const totalIps = vulns.reduce((s, v) => s + v.ips, 0);
  const totalConnections = vulns.reduce((s, v) => s + v.connections, 0);
  return { day: day.day, vulns, byId, totalIps, totalConnections, source: day.source, builtAt: day.built_at };
}

// Exploit "hit points": how much blocking it takes to exhaust one source.
// 3 attempts/IP -> ~30, 30 -> ~63, 1,000 -> ~118. Logarithmic so the tail of one-shot
// probes stays killable and the persistent campaigns stay a problem.
export function toughness(perIp) {
  return Math.round(11 * Math.log2(1 + perIp) + 8);
}

// Cells per second on the map. Botnets of consumer devices are quick and numerous; a
// source averaging hundreds of attempts is slow, deliberate, and hard to exhaust.
export function speedFor(r, perIp) {
  let s = 1.5;
  if (r.iot) s *= 1.35;
  if (perIp > 50) s *= 0.7;
  else if (perIp > 12) s *= 0.85;
  return +s.toFixed(3);
}

// Match an organisation's asset (its product line) to the day's rows.
export function matchThreats(model, asset) {
  const out = [];
  for (const v of model.vulns) {
    for (const m of asset.match || []) {
      const vend = m.vendor ? m.vendor.test(v.vendor) : true;
      const prod = m.product ? m.product.test(v.product) : true;
      if (vend && prod) { out.push(v); break; }
    }
  }
  return out;
}

// Deterministic, plausible-looking but synthetic addresses. Shadowserver's aggregate feed
// carries the COUNT of unique source IPs per vulnerability, never the addresses, so every
// attacker's IP in the game is generated from the seed. Drawn from documentation ranges
// (RFC 5737) plus a synthetic pool so no real network is named.
export function fakeIp(rng) {
  const pools = [[192, 0, 2], [198, 51, 100], [203, 0, 113], [100, 64 + rng.int(0, 63), rng.int(0, 255)]];
  const p = rng.pick(pools);
  return `${p[0]}.${p[1]}.${p[2]}.${rng.int(1, 254)}`;
}
