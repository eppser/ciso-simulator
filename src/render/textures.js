import * as THREE from 'three';

// Procedural PBR textures, generated once on a canvas. No asset files exist and none are
// downloaded: concrete, asphalt, brushed metal and painted panel come from layered noise;
// normal maps are derived from the same height field with a Sobel filter.

function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Value noise with a few octaves on an N x N float field, tileable by construction.
function noiseField(n, seed, octaves = 4, base = 4) {
  const rnd = seeded(seed);
  const out = new Float32Array(n * n);
  let amp = 1, total = 0, freq = base;
  for (let o = 0; o < octaves; o++) {
    const g = new Float32Array(freq * freq);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = (x / n) * freq, fy = (y / n) * freq;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const v = (xx, yy) => g[((yy % freq) + freq) % freq * freq + ((xx % freq) + freq) % freq];
      const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
      out[y * n + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
    }
    total += amp; amp *= 0.5; freq *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function toTexture(canvas, { srgb = false, repeat = 1 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 16;
  return t;
}

function normalFromHeight(h, n, strength = 2) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const L = h[y * n + ((x - 1 + n) % n)], R = h[y * n + ((x + 1) % n)];
    const U = h[((y - 1 + n) % n) * n + x], D = h[((y + 1) % n) * n + x];
    const dx = (R - L) * strength, dy = (D - U) * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * n + x) * 4;
    img.data[i] = (-dx / len * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / len * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function grey(n, h, lo, hi, tint = [1, 1, 1], speckle = 0, seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(n, n);
  const rnd = seeded(seed);
  for (let i = 0; i < n * n; i++) {
    let v = lo + (hi - lo) * h[i];
    if (speckle && rnd() < speckle) v += (rnd() - 0.5) * 60;
    img.data[i * 4] = Math.max(0, Math.min(255, v * tint[0])); img.data[i * 4 + 1] = Math.max(0, Math.min(255, v * tint[1])); img.data[i * 4 + 2] = Math.max(0, Math.min(255, v * tint[2])); img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = {};
// Concrete: coarse mottling with fine grain and a few cracks. Returns {map(canvas), roughnessMap, normalMap}.
export function concreteMaps(n = 512) {
  if (cache.concrete) return cache.concrete;
  const h = noiseField(n, 17, 5, 3);
  const wear = noiseField(n, 23, 3, 2);
  const fine = noiseField(n, 29, 2, 64);
  const mix = new Float32Array(n * n);
  for (let i = 0; i < mix.length; i++) mix[i] = h[i] * 0.5 + wear[i] * 0.4 + fine[i] * 0.1;
  const albedo = grey(n, mix, 150, 215, [1, 1, 0.98], 0.02, 5);
  // Hairline cracks and stains.
  const ctx = albedo.getContext('2d'); const rnd = seeded(41);
  ctx.strokeStyle = 'rgba(40,40,40,0.16)'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) { let x = rnd() * n, y = rnd() * n; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; ctx.lineTo(x, y); } ctx.stroke(); }
  for (let i = 0; i < 40; i++) { const r = 10 + rnd() * 40; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(70,60,50,0.18)'); g.addColorStop(1, 'rgba(70,60,50,0)'); ctx.save(); ctx.translate(rnd() * n, rnd() * n); ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); }
  const rough = grey(n, mix, 200, 245);
  const normal = normalFromHeight(mix, n, 1.6);
  cache.concrete = { albedo, rough, normal };
  return cache.concrete;
}
export function asphaltMaps(n = 256) {
  if (cache.asphalt) return cache.asphalt;
  const h = noiseField(n, 71, 3, 32);
  const albedo = grey(n, h, 40, 70, [1, 1, 1.02], 0.06, 9);
  const rough = grey(n, h, 225, 250);
  const normal = normalFromHeight(h, n, 2.2);
  cache.asphalt = { albedo, rough, normal };
  return cache.asphalt;
}
// Brushed metal: horizontal streaks.
export function brushedMaps(n = 256) {
  if (cache.brushed) return cache.brushed;
  const c = document.createElement('canvas'); c.width = c.height = n; const ctx = c.getContext('2d');
  const rnd = seeded(77);
  ctx.fillStyle = '#9a9ca2'; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) { const y = rnd() * n; const l = 20 + rnd() * 120; const v = 120 + rnd() * 80; ctx.strokeStyle = `rgba(${v},${v},${v + 4},${0.15 + rnd() * 0.25})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rnd() * n, y); ctx.lineTo(rnd() * n + l, y); ctx.stroke(); }
  const r = document.createElement('canvas'); r.width = r.height = n; const rc = r.getContext('2d');
  rc.fillStyle = '#5a5a5a'; rc.fillRect(0, 0, n, n);
  for (let i = 0; i < 1600; i++) { const y = rnd() * n; const v = 60 + rnd() * 70; rc.strokeStyle = `rgba(${v},${v},${v},0.5)`; rc.beginPath(); rc.moveTo(rnd() * n, y); rc.lineTo(rnd() * n + 100, y); rc.stroke(); }
  const h = noiseField(n, 91, 2, 48);
  cache.brushed = { albedo: c, rough: r, normal: normalFromHeight(h, n, 0.6) };
  return cache.brushed;
}
// Painted panel: near-flat with faint panel seams and grime at the seams.
export function panelMaps(n = 256) {
  if (cache.panel) return cache.panel;
  const h = noiseField(n, 13, 3, 6);
  const albedo = grey(n, h, 205, 235, [1, 1, 1], 0.01, 21);
  const ctx = albedo.getContext('2d');
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * n / 4 + 0.5); ctx.lineTo(n, i * n / 4 + 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * n / 4 + 0.5, 0); ctx.lineTo(i * n / 4 + 0.5, n); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 10;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * n / 4); ctx.lineTo(n, i * n / 4); ctx.stroke(); }
  const rough = grey(n, h, 140, 175);
  const hh = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const sx = (x % (n / 4)) / (n / 4), sy = (y % (n / 4)) / (n / 4); const edge = Math.min(sx, 1 - sx, sy, 1 - sy); hh[y * n + x] = Math.min(1, edge * 30) * 0.5 + h[y * n + x] * 0.05; }
  cache.panel = { albedo, rough, normal: normalFromHeight(hh, n, 3) };
  return cache.panel;
}
export function tex(canvas, opts) { return toTexture(canvas, opts); }
// Grey noise canvas: lo..hi over `octaves` octaves at a base frequency; used for wear and cloud shadows.
export function noiseCanvas(n, seed, octaves, base, lo, hi) { return grey(n, noiseField(n, seed, octaves, base), lo, hi); }

// A blurred rounded square: the contact shadow under a 2x2 footprint.
export function softRectTexture(n = 128) {
  const c = document.createElement('canvas'); c.width = c.height = n; const ctx = c.getContext('2d');
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = n * 0.16; ctx.fillStyle = 'rgba(0,0,0,0.9)';
  const m = n * 0.22, r = n * 0.08; ctx.beginPath(); ctx.moveTo(m + r, m); ctx.lineTo(n - m - r, m); ctx.quadraticCurveTo(n - m, m, n - m, m + r); ctx.lineTo(n - m, n - m - r); ctx.quadraticCurveTo(n - m, n - m, n - m - r, n - m); ctx.lineTo(m + r, n - m); ctx.quadraticCurveTo(m, n - m, m, n - m - r); ctx.lineTo(m, m + r); ctx.quadraticCurveTo(m, m, m + r, m); ctx.closePath(); ctx.fill(); ctx.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// A soft radial sprite (smoke, shadow blobs, glows).
export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', n = 64) {
  const c = document.createElement('canvas'); c.width = c.height = n; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(n / 2, n / 2, 1, n / 2, n / 2, n / 2); g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Sky: a vertical gradient with optional soft clouds baked in.
export function skyTexture({ top, horizon, ground, clouds = 0, seed = 3 }) {
  const w = 512, h = 512; const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(0.55, horizon); g.addColorStop(0.62, horizon); g.addColorStop(1, ground);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (clouds > 0) {
    const rnd = seeded(seed);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = 60 + rnd() * 200, r = 18 + rnd() * 50;
      const cg = ctx.createRadialGradient(x, y, 0, x, y, r); cg.addColorStop(0, `rgba(255,255,255,${0.35 * clouds})`); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
