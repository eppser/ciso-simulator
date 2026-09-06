// Inline SVG icons. All strokes inherit currentColor so a chip can tint them.
const W = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  // tools
  ndr: W('<path d="M4 20 12 12"/><path d="M12 12a6 6 0 0 1 6 6"/><path d="M12 12a10 10 0 0 1 10 10"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 12 6 4l4 1"/>'),
  ips: W('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m13 8-3 5h4l-3 5"/>'),
  waf: W('<path d="M3 16a9 9 0 0 1 18 0z"/><path d="M12 7v9"/><path d="M6 16c0-4 2.5-7 6-9 3.5 2 6 5 6 9"/><path d="M3 20h18"/>'),
  honeytoken: W('<circle cx="8" cy="9" r="4"/><path d="M11 10.5 20 19.5M17 16.5l2-2M14.5 14l2-2"/><path d="M8 9h.01"/>'),
  vetting: W('<path d="M12 3 4 6.5v5c0 4.5 3.3 8 8 9.5 4.7-1.5 8-5 8-9.5v-5z"/><path d="m9 12 2 2 4-4"/>'),
  supply: W('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="m8.5 11.5-3-3M5.5 11.5l3-3" stroke-width="1.5"/>'),
  dashboard: W('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M14 14h4M14 17h3"/>'),
  ciso: W('<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="m10 13 2 2 2-2"/>'),
  chart: W('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  wall: W('<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 10h18M3 14h18M9 6v4M15 10v4M9 14v4"/>'),
  // programmes
  scanner: W('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M8 11h6M11 8v6"/>'),
  intel: W('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v9l6 3"/>'),
  discovery: W('<circle cx="10" cy="10" r="6"/><path d="m21 21-6.5-6.5"/><path d="M7 10h6"/>'),
  edr: W('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M2 20h20"/><path d="M12 8 9.5 9v2.5c0 1.6 1 2.7 2.5 3.2 1.5-.5 2.5-1.6 2.5-3.2V9z"/>'),
  mfa: W('<circle cx="8" cy="12" r="4"/><path d="M12 12h9l-2 2M17 12l2 2"/><path d="M8 12h.01"/>'),
  backups: W('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M8 14h8"/>'),
  awareness: W('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6"/><path d="M15 14c3 0 5 2 5 5"/>'),
  briefing: W('<rect x="6" y="10" width="12" height="10" rx="1"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/><path d="M4 20h16"/><path d="M12 4v1"/>'),
  soc1: W('<path d="M4 14a8 8 0 0 1 16 0z"/><path d="M3 14h18"/><path d="M12 6v-2"/><path d="M8 17v3h8v-3"/>'),
  soc2: W('<path d="M2 13a6 6 0 0 1 12 0z"/><path d="M10 13a6 6 0 0 1 12 0z"/><path d="M1 13h22"/><path d="M5 16v3h14v-3"/>'),
  retainer: W('<path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2"/>'),
  scanner2: W('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M7.5 11a3.5 3.5 0 0 1 6-2.5"/><path d="M14.5 11a3.5 3.5 0 0 1-6 2.5"/>'),
  // states & stats
  engineer: W('<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M8 7h8"/>'),
  systems: W('<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/><path d="M8 7h.01M8 17h.01"/>'),
  budget: W('<circle cx="12" cy="12" r="9"/><path d="M12 6v12M9.5 9.5C9.5 8 10.5 7.5 12 7.5s2.5.7 2.5 2-1 1.8-2.5 2-2.5.7-2.5 2 1 2 2.5 2 2.5-.6 2.5-2"/>'),
  income: W('<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>'),
  impact: W('<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>'),
  clock: W('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  hour: W('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  skull: W('<path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 5 3 6v3h10v-3c1.5-1 3-3 3-6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.5" fill="currentColor"/><circle cx="15" cy="11" r="1.5" fill="currentColor"/><path d="M10 17v2M14 17v2"/>'),
  blocked: W('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'),
  patched: W('<path d="m5 12 4 4L19 7"/>'),
  web: W('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  appliance: W('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h.01M11 12h.01"/><path d="M17 4v3M20 4v3"/>'),
  star: W('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none"/>'),
  play: W('<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>'),
  pause: W('<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>'),
  help: W('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><path d="M12 17h.01"/>'),
  check: W('<path d="m5 12 4 4L19 7"/>'),
  lock: W('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  arrow: W('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};

// Company illustrations: flat vector, ~160x110 viewBox.
export const ORG_ART = {
  startup: `<svg viewBox="0 0 160 110" class="art"><defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#16161a"/></linearGradient></defs>
    <rect x="0" y="90" width="160" height="20" fill="#111"/>
    <rect x="30" y="30" width="100" height="60" rx="4" fill="url(#g1)" stroke="#444"/>
    <rect x="30" y="22" width="100" height="10" rx="2" fill="#333"/>
    <g fill="#ffb547" opacity=".9"><rect x="40" y="40" width="14" height="10"/><rect x="60" y="40" width="14" height="10"/><rect x="80" y="40" width="14" height="10"/><rect x="100" y="40" width="14" height="10"/><rect x="40" y="58" width="14" height="10"/><rect x="100" y="58" width="14" height="10"/></g>
    <g fill="#ff5a50"><rect x="60" y="58" width="34" height="10" opacity=".8"/></g>
    <rect x="72" y="72" width="16" height="18" fill="#222" stroke="#555"/>
    <circle cx="140" cy="26" r="8" fill="none" stroke="#ff5a50" stroke-width="2"/><circle cx="140" cy="26" r="2" fill="#ff5a50"/>
    <path d="M20 90c0-8 6-12 12-12" stroke="#3a3a3f" fill="none"/><circle cx="20" cy="86" r="5" fill="#2a4a3a"/></svg>`,
  midcap: `<svg viewBox="0 0 160 110" class="art"><defs><linearGradient id="g2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2c2c33"/><stop offset="1" stop-color="#18181c"/></linearGradient></defs>
    <rect x="0" y="90" width="160" height="20" fill="#111"/>
    <path d="M10 45 55 22l45 23v45H10z" fill="url(#g2)" stroke="#444"/>
    <path d="M10 45 55 22l45 23" fill="#333" stroke="#555"/>
    <rect x="100" y="45" width="50" height="45" fill="#202024" stroke="#444"/>
    <g fill="#ff5a50" opacity=".85"><rect x="22" y="62" width="14" height="28"/><rect x="42" y="62" width="14" height="28"/><rect x="62" y="62" width="14" height="28"/></g>
    <g fill="#ffb547"><rect x="110" y="52" width="10" height="8"/><rect x="126" y="52" width="10" height="8"/><rect x="110" y="66" width="10" height="8"/><rect x="126" y="66" width="10" height="8"/></g>
    <rect x="112" y="92" width="34" height="10" rx="2" fill="#2a2a2e" stroke="#555"/><circle cx="118" cy="103" r="4" fill="#111" stroke="#666"/><circle cx="140" cy="103" r="4" fill="#111" stroke="#666"/>
    <path d="M150 30v14M143 37h14" stroke="#555"/></svg>`,
  enterprise: `<svg viewBox="0 0 160 110" class="art"><defs><linearGradient id="g3" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#30303a"/><stop offset="1" stop-color="#16161a"/></linearGradient></defs>
    <rect x="0" y="90" width="160" height="20" fill="#111"/>
    <rect x="55" y="8" width="50" height="82" fill="url(#g3)" stroke="#555"/>
    <rect x="20" y="40" width="30" height="50" fill="#1e1e23" stroke="#444"/><rect x="110" y="34" width="30" height="56" fill="#1e1e23" stroke="#444"/>
    <g fill="#d8d8e0" opacity=".85">${Array.from({ length: 6 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<rect x="${62 + c * 13}" y="${16 + r * 12}" width="8" height="6"/>`).join('')).join('')}</g>
    <g fill="#ffb547" opacity=".7"><rect x="25" y="48" width="6" height="5"/><rect x="37" y="48" width="6" height="5"/><rect x="25" y="62" width="6" height="5"/><rect x="118" y="44" width="6" height="5"/><rect x="128" y="58" width="6" height="5"/></g>
    <rect x="72" y="76" width="16" height="14" fill="#ff5a50" opacity=".9"/>
    <path d="M80 8V2" stroke="#ff5a50"/><circle cx="80" cy="2" r="2" fill="#ff5a50"/></svg>`,
};

export const TOOL_ROLE = { ndr: 'identifies', ips: 'blocks appliances', waf: 'blocks web', honeytoken: 'traps one', wall: 'blocks a cell' };
