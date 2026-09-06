// Three looks. Everything a theme changes is listed here so a switch is a data change.
export const THEMES = {
  night: {
    id: 'night', name: 'Night ops', swatch: '#14141a',
    bg: 0x0b0f18, fog: [30, 260], fogColor: 0x0c1220, fogDensity: 0.014,
    sky: { top: '#05070c', horizon: '#141a2a', ground: '#080a10', clouds: 0 },
    hemi: { sky: 0x9aa4c8, ground: 0x1e1e28, intensity: 1.5 },
    key: { color: 0xdfe6ff, intensity: 2.2, pos: [-14, 26, 12] },
    rim: { color: 0xff5a50, intensity: 0.5, pos: [30, 10, -20] },
    env: 0.55, exposure: 1.25, bloom: 0.3, lamps: 2.4, vignette: 0.6, clouds: 0,
    grade: { lift: [0.0, 0.004, 0.014], gain: [0.98, 1.0, 1.06], sat: 0.9 },
    ground: { tint: [0.27, 0.28, 0.34], grid: 'rgba(160,165,190,0.05)', strong: 'rgba(200,205,230,0.35)', road: 'rgba(0,0,0,0)', mark: 'rgba(235,235,220,0.4)', internet: 'rgba(120,135,170,0.12)', dmz: 'rgba(255,255,255,0.05)', internal: 'rgba(255,255,255,0.02)', core: 'rgba(127,167,255,0.09)', label: 'rgba(190,195,220,0.75)' },
    slab: 0x101014, body: 0x6a6d78, appliance: 0x7c8090, dark: 0x2a2b32, edge: 0xb0b0c0, edgeOp: 0.35, windowEmissive: 0.85, windowLit: 0.66, tree: 0x2a3a44, trunk: 0x2a2018, glass: 0x7fa2e6,
    labelBg: 'rgba(12,12,16,0.8)', labelColor: '#f0f0f4',
  },
  dusk: {
    id: 'dusk', name: 'Dusk', swatch: '#5a3020',
    bg: 0x3a2a30, fog: [30, 260], fogColor: 0x4a3440, fogDensity: 0.011,
    sky: { top: '#2a1e3a', horizon: '#e07a4a', ground: '#2a1a16', clouds: 0.5 },
    hemi: { sky: 0x8aa0d8, ground: 0x5a3a2a, intensity: 1.2 },
    key: { color: 0xffb070, intensity: 3.6, pos: [-30, 9, 8] },
    rim: { color: 0x7a8cff, intensity: 1.5, pos: [30, 12, -20] },
    env: 0.7, exposure: 1.0, bloom: 0.22, lamps: 1.2, vignette: 0.6, clouds: 0,
    grade: { lift: [0.0, 0.008, 0.02], gain: [1.05, 1.0, 0.96], sat: 0.92 },
    ground: { tint: [0.6, 0.56, 0.52], grid: 'rgba(255,220,190,0.05)', strong: 'rgba(255,230,200,0.35)', road: 'rgba(0,0,0,0)', mark: 'rgba(255,240,210,0.42)', internet: 'rgba(120,135,170,0.12)', dmz: 'rgba(255,220,180,0.05)', internal: 'rgba(255,220,180,0.02)', core: 'rgba(140,170,255,0.08)', label: 'rgba(255,225,200,0.75)' },
    slab: 0x241a16, body: 0x8a7a72, appliance: 0x968a86, dark: 0x3a2e28, edge: 0xd8b8a0, edgeOp: 0.3, windowEmissive: 0.7, windowLit: 0.55, tree: 0x33502c, trunk: 0x3a2818, glass: 0xd0a080,
    labelBg: 'rgba(30,18,14,0.82)', labelColor: '#fbeee2',
  },
  day: {
    id: 'day', name: 'Daylight', swatch: '#c9d3df',
    bg: 0xb8c8da, fog: [30, 260], fogColor: 0xc2d2e4, fogDensity: 0.009,
    sky: { top: '#4f86d4', horizon: '#c6d8ea', ground: '#b0bcc8', clouds: 0.9 },
    hemi: { sky: 0x86a8e8, ground: 0x8f8470, intensity: 0.55 },
    key: { color: 0xfff0d8, intensity: 4.2, pos: [-20, 22, 16] },
    rim: { color: 0xffffff, intensity: 0.2, pos: [30, 12, -20] },
    env: 0.7, exposure: 0.8, bloom: 0.1, lamps: 0, vignette: 0.6, clouds: 1,
    grade: { lift: [0, 0, 0], gain: [1.04, 1.02, 1.0], sat: 1.06 },
    ground: { tint: [0.56, 0.54, 0.5], grid: 'rgba(40,40,50,0.045)', strong: 'rgba(40,40,60,0.4)', road: 'rgba(0,0,0,0)', mark: 'rgba(255,255,255,0.55)', internet: 'rgba(90,105,140,0.14)', dmz: 'rgba(255,255,255,0.14)', internal: 'rgba(255,255,255,0.05)', core: 'rgba(80,120,255,0.1)', label: 'rgba(50,50,65,0.8)' },
    slab: 0x8f8d86, body: 0xb6bac2, appliance: 0xaeb2ba, dark: 0x5c5f66, edge: 0x2a2a30, edgeOp: 0.3, windowEmissive: 0.15, windowLit: 0.3, windowLitColor: [0.62, 0.7, 0.82], windowUnlitColor: [0.3, 0.36, 0.46], tree: 0x4c8a4a, trunk: 0x6a4a30, glass: 0x9fc0ff,
    labelBg: 'rgba(20,20,24,0.82)', labelColor: '#ffffff',
  },
};
export const THEME_ORDER = ['night', 'dusk', 'day'];
export function loadThemeId() {
  try { const t = localStorage.getItem('dtw.theme'); if (t && THEMES[t]) return t; } catch (e) { /* no storage */ }
  return 'night';
}
export function saveThemeId(id) { try { localStorage.setItem('dtw.theme', id); } catch (e) { /* no storage */ } }
export function loadFlag(key, def) { try { const v = localStorage.getItem(key); return v === null ? def : v === '1'; } catch (e) { return def; } }
export function saveFlag(key, v) { try { localStorage.setItem(key, v ? '1' : '0'); } catch (e) { /* no storage */ } }
