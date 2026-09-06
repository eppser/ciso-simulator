import * as THREE from 'three';

// Canvas-rendered text as a sprite. Used for asset names and small on-map labels.
const cache = new Map();
export function textSprite(text, { size = 26, color = '#f2f2f2', mono = false, bg = null, weight = 500, scale = 1, pad = 10 } = {}) {
  const font = `${weight} ${size}px ${mono ? '"JetBrains Mono", ui-monospace, Menlo, monospace' : 'Inter, -apple-system, system-ui, sans-serif'}`;
  const ck = [text, size, color, mono, bg, weight].join('|');
  let tex = cache.get(ck);
  if (!tex) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = Math.ceil(size * 1.4) + pad;
    c.width = w; c.height = h;
    ctx.font = font;
    if (bg) { ctx.fillStyle = bg; roundRect(ctx, 0, 0, w, h, 7); ctx.fill(); }
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.userData = { w, h };
    cache.set(ck, tex);
  }
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat);
  const k = 0.022 * scale;
  s.scale.set(tex.userData.w * k, tex.userData.h * k, 1);
  s.renderOrder = 20;
  return s;
}
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// A name label with its kind glyph on the left, in one sprite (one draw call per building).
const labelCache = new Map();
export function labelSprite(text, kind, { size = 22, color = '#f2f2f2', bg = 'rgba(14,14,16,0.8)', scale = 0.62, mono = false } = {}) {
  const ck = ['L', text, kind, size, color, bg, mono].join('|');
  let tex = labelCache.get(ck);
  if (!tex) {
    const font = `600 ${size}px ${mono ? '"JetBrains Mono", ui-monospace, Menlo, monospace' : 'Inter, -apple-system, system-ui, sans-serif'}`;
    const c = document.createElement('canvas'); const ctx = c.getContext('2d');
    ctx.font = font;
    const iconW = kind ? size * 1.35 : 0;
    const w = Math.ceil(ctx.measureText(text).width) + 20 + iconW, h = Math.ceil(size * 1.5) + 6;
    c.width = w; c.height = h;
    ctx.font = font; ctx.fillStyle = bg; roundRect(ctx, 0, 0, w, h, 8); ctx.fill();
    if (kind) { ctx.save(); ctx.translate(8, (h - size * 1.25) / 2); ctx.scale(size * 1.25 / 64, size * 1.25 / 64); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; drawGlyph(ctx, kind); ctx.restore(); }
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(text, 10 + iconW, h / 2);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.userData = { w, h };
    labelCache.set(ck, tex);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  const k = 0.022 * scale; sp.scale.set(tex.userData.w * k, tex.userData.h * k, 1); sp.renderOrder = 20;
  return sp;
}

// Small icon sprites drawn on canvas: one glyph per asset kind.
const iconCache = new Map();
export function iconSprite(kind, { fg = '#ffffff', bg = 'rgba(14,14,16,0.85)', scale = 1 } = {}) {
  const ck = kind + '|' + fg + '|' + bg;
  let tex = iconCache.get(ck);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; roundRect(ctx, 2, 2, 60, 60, 14); ctx.fill();
    ctx.strokeStyle = fg; ctx.fillStyle = fg; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    drawGlyph(ctx, kind);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    iconCache.set(ck, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(0.62 * scale, 0.62 * scale, 1); s.renderOrder = 21;
  return s;
}
function drawGlyph(ctx, kind) {
  const R = (x, y, w, h) => { ctx.strokeRect(x, y, w, h); };
  switch (kind) {
    case 'firewall': case 'vpn': // brick wall
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const off = r % 2 ? 6 : 0; R(12 + c * 14 + off - (r % 2 ? 6 : 0), 16 + r * 11, 12, 8); } break;
    case 'router': ctx.beginPath(); ctx.arc(32, 40, 12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20, 24); ctx.lineTo(16, 12); ctx.moveTo(44, 24); ctx.lineTo(48, 12); ctx.stroke(); break;
    case 'camera': ctx.beginPath(); ctx.moveTo(14, 20); ctx.lineTo(42, 20); ctx.lineTo(42, 36); ctx.lineTo(14, 36); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(42, 24); ctx.lineTo(52, 18); ctx.lineTo(52, 38); ctx.lineTo(42, 32); ctx.stroke(); ctx.beginPath(); ctx.moveTo(28, 36); ctx.lineTo(28, 50); ctx.stroke(); break;
    case 'db': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(32, 18 + i * 12, 16, 5, 0, 0, Math.PI * 2); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(16, 18); ctx.lineTo(16, 44); ctx.moveTo(48, 18); ctx.lineTo(48, 44); ctx.stroke(); break;
    case 'ot': ctx.beginPath(); ctx.arc(24, 36, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(44, 26, 7, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(24, 26); ctx.lineTo(44, 19); ctx.moveTo(24, 46); ctx.lineTo(44, 33); ctx.stroke(); break;
    case 'mail': R(12, 18, 40, 28); ctx.beginPath(); ctx.moveTo(12, 18); ctx.lineTo(32, 34); ctx.lineTo(52, 18); ctx.stroke(); break;
    case 'web': ctx.beginPath(); ctx.arc(32, 32, 17, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(32, 32, 7, 17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(15, 32); ctx.lineTo(49, 32); ctx.stroke(); break;
    case 'endpoint': R(12, 16, 40, 26); ctx.beginPath(); ctx.moveTo(8, 48); ctx.lineTo(56, 48); ctx.stroke(); break;
    case 'nas': case 'file': R(14, 14, 36, 36); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(20, 22 + i * 10); ctx.lineTo(44, 22 + i * 10); ctx.stroke(); } break;
    case 'ai': ctx.beginPath(); ctx.arc(32, 32, 14, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14); ctx.lineTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); ctx.stroke(); } break;
    case 'key': ctx.beginPath(); ctx.arc(22, 26, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(29, 32); ctx.lineTo(50, 50); ctx.moveTo(44, 44); ctx.lineTo(50, 38); ctx.moveTo(38, 40); ctx.lineTo(44, 34); ctx.stroke(); break;
    case 'ad': ctx.beginPath(); ctx.arc(32, 22, 8, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(16, 50); ctx.quadraticCurveTo(32, 30, 48, 50); ctx.stroke(); break;
    default: // server rack
      R(16, 12, 32, 40); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(22, 22 + i * 10); ctx.lineTo(42, 22 + i * 10); ctx.stroke(); }
  }
}
