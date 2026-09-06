// Sound for Defend The World. Everything is synthesised with the Web Audio API: there are no
// audio assets in the repository and none are fetched.
//
//   music  - a seeded, rhythmic D-dorian score (drums, bass, plucked lead, pad) that follows
//            the game state: light in preparation, driving in waves, darker when breached
//   sfx    - short synthesised cues for placement, blocking, exploits, patches, alarms
//   voice  - the advisor's one-liners via SpeechSynthesis, or ElevenLabs if a key is set
//
// main.js calls initAudio(app) once, then app.audio.event(name, payload) / update(dt) / say(text).
import './audio.css';
import { nextPhrase, chordTonesIn, midiToHz, makeRng, ROOT_MIDI, DRUM_PATTERNS, LIGHT_PATTERNS, HALF_TIME, FILL_PATTERN, HAT_PATTERNS, DRIVE_HATS, STAB_STEPS, TICK_PATTERN, nextPattern, bassSteps } from './music.js';

const STORE = 'dtw.audio';
const LOOKAHEAD = 0.3;           // schedule this far ahead
const TICK_MS = 100;
// v3: an action score. Waves sit at 124-132 (rising with the number of sources on the map),
// surges and campaigns at 136, preparation at 108 with a pulse.
const BPM = { prep: 108, wave: 124, waveMax: 132, surge: 136, final: 120 };
const MUSIC_SCALE = 0.7;         // bus multiplier at slider = 1 (v2 was 0.55)
const SFX_SCALE = 1.0;           // v2 was 0.5: impacts must be heard
const SFX_MIN_GAP = 1 / 6;       // per cue type, seconds
const VARIED = new Set(['probe', 'exploit', 'compromise', 'refused', 'trapped', 'kill', 'lateral', 'place']);

function loadSettings() {
  try { return { enabled: true, music: 0.55, sfx: 0.8, voice: 0.9, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; }
  catch { return { enabled: true, music: 0.55, sfx: 0.8, voice: 0.9 }; }
}
function saveSettings(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode */ } }

export function initAudio(app) {
  const settings = loadSettings();
  const A = {
    app, ctx: null, ready: false, enabled: settings.enabled, settings,
    // music state
    phrase: [], barIndex: 0, barCount: 0, nextBarAt: 0, rng: makeRng(1), timer: null,
    intensity: 0, targetIntensity: 0, dark: 0, targetDark: 0, phase: 'prep',
    bpm: BPM.prep, targetBpm: BPM.prep, danger: 0, halfTimeUntil: -1, drumsOff: false,
    lastDrum: -1, lastHat: -1, surge: false,
    lastShot: 0, lastAccent: 0, lastSay: '', speaking: false, sayQueue: null, voice: null,
    lastCue: {}, riserArmed: true,
    ended: false,
    event, update, say, setEnabled, get enabledFlag() { return A.enabled; },
  };
  Object.defineProperty(A, 'enabled', { get: () => settings.enabled, set: (v) => setEnabled(v) });

  // ---------- graph ----------
  function ensureContext() {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); return true; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    A.ctx = ctx;
    // Two stages: a glue compressor, then a fast limiter so kicks never clip the sum.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
    limiter.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.16;
    comp.connect(limiter);
    A.master = ctx.createGain(); A.master.gain.value = settings.enabled ? 1 : 0; A.master.connect(comp);
    A.musicBus = ctx.createGain(); A.musicBus.gain.value = settings.music * MUSIC_SCALE; A.musicBus.connect(A.master);
    // Sidechain: tonal layers pass through `duck`, which dips on every kick.
    A.duck = ctx.createGain(); A.duck.gain.value = 1; A.duck.connect(A.musicBus);
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = settings.sfx * SFX_SCALE; A.sfxBus.connect(A.master);
    // Reverb: generated impulse response, exponential decay with a little early bloom.
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(ctx, 2.8, 2.2);
    A.reverb = ctx.createGain(); A.reverb.gain.value = 0.55;
    A.reverb.connect(conv); conv.connect(A.musicBus);
    A.sfxVerb = ctx.createGain(); A.sfxVerb.gain.value = 0.25; A.sfxVerb.connect(conv);
    // Layers.
    A.padGain = layer(0.45, true); A.arpGain = layer(0, true); A.bassGain = layer(0, true); A.darkGain = layer(0, true); A.shimmerGain = layer(0, true); A.noiseGain = layer(0.08, true);
    A.stabGain = layer(0, true);
    // Overdriven bass: the same bass notes through a waveshaper, faded in with drive.
    A.distGain = layer(0, true);
    A.shaper = ctx.createWaveShaper(); A.shaper.curve = makeDriveCurve(18); A.shaper.oversample = '2x';
    const distTone = ctx.createBiquadFilter(); distTone.type = 'lowpass'; distTone.frequency.value = 1600; distTone.Q.value = 0.7;
    A.shaper.connect(distTone); distTone.connect(A.distGain);
    A.drumGain = layer(0.4); A.kickGain = sub(A.drumGain, 1); A.snareGain = sub(A.drumGain, 0.8); A.hatGain = sub(A.drumGain, 0.45); A.tickGain = layer(0);
    startNoise();
    A.rng = makeRng((app.game && app.game.seed) || 1);
    A.phrase = nextPhrase(null, A.rng);
    A.barIndex = 0;
    A.nextBarAt = ctx.currentTime + 0.1;
    A.timer = setInterval(schedule, TICK_MS);
    A.ready = true;
    return true;
  }
  function layer(v, ducked = false) {
    const g = A.ctx.createGain(); g.gain.value = v;
    g.connect(ducked ? A.duck : A.musicBus);
    const send = A.ctx.createGain(); send.gain.value = ducked ? 1 : 0.35; g.connect(send); send.connect(A.reverb);
    return g;
  }
  function sub(parent, v) { const g = A.ctx.createGain(); g.gain.value = v; g.connect(parent); return g; }
  function makeDriveCurve(amount) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
    return curve;
  }
  function barSeconds() { return 240 / A.bpm; }
  function makeImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < rate * 0.02 ? i / (rate * 0.02) : 1);
      }
    }
    return buf;
  }
  function startNoise() {
    const ctx = A.ctx;
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { // pink-ish noise
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.08;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 300; lfo.connect(lfoG); lfoG.connect(lp.frequency);
    src.connect(lp); lp.connect(A.noiseGain);
    src.start(); lfo.start();
  }

  // ---------- music scheduling ----------
  function schedule() {
    if (!A.ctx || !settings.enabled) return;
    const ctx = A.ctx;
    while (A.nextBarAt < ctx.currentTime + LOOKAHEAD + 0.05) {
      if (A.barIndex >= A.phrase.length) { A.phrase = nextPhrase(A.phrase, A.rng); A.barIndex = 0; }
      const bar = barSeconds();
      scheduleBar(A.phrase[A.barIndex], A.nextBarAt, bar, A.barIndex === A.phrase.length - 1);
      A.barIndex++; A.barCount++;
      A.nextBarAt += bar;
    }
  }
  function scheduleBar(degree, t0, bar, lastOfPhrase) {
    const r = A.rng;
    const step = bar / 16;
    const dark = A.dark > 0.5;
    const tones = chordTonesIn(degree, dark);
    const drive = A.intensity < 0.3 ? 0 : A.intensity < 0.7 ? 1 : 2;
    const rootHz = midiToHz(ROOT_MIDI - 12 + tones[0]);

    // Drums: pattern bank by drive; a fill on the last bar of every phrase; half-time after a breach.
    if (!A.drumsOff) {
      let pat;
      if (A.barCount < A.halfTimeUntil) pat = HALF_TIME;
      else if (lastOfPhrase && drive > 0) pat = FILL_PATTERN;
      else if (drive === 0) { A.lastDrum = nextPattern(LIGHT_PATTERNS, A.lastDrum, r); pat = LIGHT_PATTERNS[A.lastDrum]; }
      else { A.lastDrum = nextPattern(DRUM_PATTERNS, A.lastDrum, r); pat = DRUM_PATTERNS[A.lastDrum]; }
      A.lastHat = nextPattern(HAT_PATTERNS, A.lastHat, r);
      // Waves ride a driving 16th hat with an accent every four; a broken pattern is mixed in every fourth bar for air.
      const hats = drive === 0 ? HAT_PATTERNS[0] : (A.barCount % 4 === 2 ? HAT_PATTERNS[A.lastHat] : DRIVE_HATS);
      for (let i = 0; i < 16; i++) {
        const t = t0 + i * step;
        const c = pat[i];
        if (c === 'k' || c === 'x') { kick(t, i % 4 === 0 ? 1 : 0.8); duckAt(t); }
        if (c === 's' || c === 'x') snare(t, pat === FILL_PATTERN && i >= 12 ? 0.55 + (i - 12) * 0.12 : 0.9);
        if (hats[i] === 'H') hat(t, 1.0);
        else if (hats[i] === 'h' && (drive > 0 || i % 4 === 0)) hat(t, i % 2 ? 0.45 : 0.7);
      }
    }
    // Danger ticks: a dry wood-block figure whenever an identified source can hurt you.
    for (let i = 0; i < 16; i++) if (TICK_PATTERN[i] === 't') tick(t0 + i * step, i % 4 === 0 ? 0.8 : 0.5);

    // Brass-like stabs on the last bar of every four, in waves only.
    if (drive > 0 && A.barCount % 4 === 3 && !A.drumsOff) for (const st of STAB_STEPS) stab(tones, t0 + st * step, step * 1.5, st === 0 ? 1 : 0.8);
    // Bass: root pulses that thicken with drive; fifths and octaves for colour.
    for (const b of bassSteps(A.intensity < 0.3 ? 0 : A.intensity < 0.75 ? 1 : 2, r)) {
      bass(rootHz * Math.pow(2, b.interval / 12), t0 + b.s * step, step * (b.accent ? 1.6 : 0.9), b.accent ? 0.9 : 0.6);
    }
    // Lead: plucked 16ths over chord tones in waves; a sparse motif in preparation.
    const density = drive === 0 ? 0.18 : drive === 1 ? 0.5 : 0.75;
    for (let i = 0; i < 16; i++) {
      if (drive === 0 && i % 4 !== 0 && i % 4 !== 3) continue;
      if (r() > density) continue;
      const tone = tones[Math.floor(r() * tones.length)] + 12 * (1 + (r() < 0.3 ? 1 : 0));
      pluck(midiToHz(ROOT_MIDI + tone), t0 + i * step, step * 1.2, i % 4 === 0 ? 0.45 : 0.3);
    }
    // Pad: thinner than v1, one voice per tone, follows the chord.
    for (let i = 0; i < tones.length; i++) padVoice(midiToHz(ROOT_MIDI + tones[i] + (i === 0 ? -12 : 0)), t0, bar + 0.8, i === 0 ? 0.32 : 0.2);
    shimmer(midiToHz(ROOT_MIDI + 24 + tones[2]), t0, bar);
    drone(rootHz, t0, bar + 0.5);
  }
  // ----- instruments -----
  function duckAt(t) {
    const g = A.duck.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(1, t); g.linearRampToValueAtTime(0.55, t + 0.012); g.linearRampToValueAtTime(1, t + 0.2);
  }
  function kick(t, vel) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g); g.connect(A.kickGain); o.start(t); o.stop(t + 0.36);
    burst(t, { dur: 0.02, vol: 0.25 * vel, freq: 2500, type: 'highpass' }, A.kickGain);
  }
  function snare(t, vel) {
    const ctx = A.ctx;
    burst(t, { dur: 0.16, vol: 0.55 * vel, freq: 1900, q: 0.9, type: 'bandpass' }, A.snareGain);
    burst(t, { dur: 0.09, vol: 0.25 * vel, freq: 7000, type: 'highpass' }, A.snareGain);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(A.snareGain); o.start(t); o.stop(t + 0.14);
  }
  function hat(t, vel) { burst(t, { dur: 0.035, vol: 0.35 * vel, freq: 6500, type: 'highpass' }, A.hatGain); }
  function tick(t, vel) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.03);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(f); f.connect(g); g.connect(A.tickGain); o.start(t); o.stop(t + 0.06);
  }
  function burst(t, { dur, vol, freq, q = 1, type }, dest) {
    const ctx = A.ctx;
    const len = Math.max(8, Math.ceil(ctx.sampleRate * dur));
    const buf = noiseBuf(len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t); src.stop(t + dur + 0.01);
  }
  const noiseCache = new Map();
  function noiseBuf(len) {
    let b = noiseCache.get(len);
    if (b) return b;
    b = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(len, b);
    return b;
  }
  function bass(freq, t, dur, vel) {
    const ctx = A.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(220 + A.intensity * 400, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.02); f.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * vel, t + 0.006); g.gain.setValueAtTime(0.55 * vel, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = freq / 2; const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(A.bassGain); g.connect(A.shaper);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  // Brass-like stab: a stack of detuned saws on root/third/fifth through a fast lowpass envelope.
  function stab(tones, t, dur, vel) {
    const ctx = A.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3800, t + 0.03); f.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const semi of [tones[0], tones[1], tones[2]]) for (const det of [-11, 0, 11]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiToHz(ROOT_MIDI + semi); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.02);
    }
    f.connect(g); g.connect(A.stabGain);
  }
  function pluck(freq, t, dur, vel) {
    const ctx = A.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 7;
    f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur * 1.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 2.2);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = -4;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = 5;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(A.arpGain);
    o.start(t); o2.start(t); o.stop(t + dur * 2.3); o2.stop(t + dur * 2.3);
  }
  function padVoice(freq, t, dur, vol) {
    const ctx = A.ctx;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.9); g.gain.setValueAtTime(vol, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + A.intensity * 900; lp.Q.value = 0.4;
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    lp.connect(g); g.connect(A.padGain);
  }
  function shimmer(freq, t, dur) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = 4; lfo.connect(lg); lg.connect(o.detune);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
    o.connect(g); g.connect(A.shimmerGain); o.start(t); lfo.start(t); o.stop(t + dur + 0.6); lfo.stop(t + dur + 0.6);
  }
  function drone(freq, t, dur) {
    const ctx = A.ctx;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 1.0); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const det of [-9, 9]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    lp.connect(g); g.connect(A.darkGain);
  }
  // A two-bar dark stinger after a breach: descending minor chords on detuned saws.
  function stinger(t) {
    const ctx = A.ctx;
    const bar = barSeconds();
    const chords = [[0, 3, 7], [-2, 1, 5], [-4, -1, 3]];
    chords.forEach((ch, i) => {
      const t1 = t + i * bar * 0.6;
      for (const semi of ch) for (const det of [-8, 8]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiToHz(ROOT_MIDI - 12 + semi); o.detune.value = det;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1600, t1); f.frequency.exponentialRampToValueAtTime(200, t1 + bar * 0.7);
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t1); g.gain.linearRampToValueAtTime(0.16, t1 + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t1 + bar * 0.75);
        o.connect(f); f.connect(g); g.connect(A.darkGain); o.start(t1); o.stop(t1 + bar * 0.8);
      }
    });
  }
  // A pitched accent in key for a kill or a trap.
  function accent(t, high) {
    const deg = A.phrase[Math.max(0, Math.min(A.phrase.length - 1, A.barIndex - 1))] || 0;
    const tones = chordTonesIn(deg, A.dark > 0.5);
    pluck(midiToHz(ROOT_MIDI + 12 + tones[high ? 2 : 0]), t, 0.12, 0.35);
  }

  // ---------- state following ----------
  function update(dt) {
    if (!A.ctx || !settings.enabled) return;
    const g = app.game;
    let target = 0, dark = 0, bpm = BPM.prep, danger = 0, surge = false;
    if (g) {
      const w = g.waves && g.waves[g.hour];
      surge = !!(w && (w.surge || w.campaign));
      if (g.phase === 'wave') { target = 0.6 + (surge ? 0.3 : 0) + Math.min(0.15, g.attackers.length / 60); bpm = surge ? BPM.surge : Math.min(BPM.waveMax, BPM.wave + g.attackers.length / 4); A.riserArmed = true; }
      else if (g.phase === 'prep') {
        target = 0.22; bpm = BPM.prep;
        // The last two seconds of preparation: a riser into the wave.
        if (A.riserArmed && g.phaseTimer < 2 && g.hour > 0) { A.riserArmed = false; sfx(CUES.riser); }
      }
      else if (g.phase === 'final') { target = 0.35; bpm = BPM.final; }
      else target = 0;
      let comp = 0; for (const a of g.assets.values()) if (a.state === 'compromised') comp++;
      dark = Math.min(1, comp * 0.5);
      if (g.phase === 'lost') dark = 1;
      if (g.phase === 'won') { target = 0.25; bpm = BPM.prep; }
      // Danger ticks: identified sources that can hurt the system they are heading for.
      for (const a of g.attackers) { if (a.revealed && g.attackerIntel(a).level === 'danger') danger++; }
      A.drumsOff = g.phase === 'lost';
    }
    A.targetIntensity = target; A.targetDark = dark; A.targetBpm = bpm; A.danger = danger; A.surge = surge;
    const k = Math.min(1, dt * 0.5);
    A.intensity += (A.targetIntensity - A.intensity) * k;
    A.dark += (A.targetDark - A.dark) * k;
    A.bpm += (A.targetBpm - A.bpm) * Math.min(1, dt * 0.25);
    const now = A.ctx.currentTime;
    const setG = (node, v) => node.gain.setTargetAtTime(v, now, 0.35);
    setG(A.arpGain, 0.25 + Math.max(0, A.intensity - 0.15) * 0.8);
    setG(A.bassGain, 0.35 + A.intensity * 0.5);
    setG(A.distGain, A.drumsOff ? 0 : Math.max(0, A.intensity - 0.3) * 0.75);
    setG(A.stabGain, A.drumsOff ? 0 : Math.max(0, A.intensity - 0.3) * 0.9);
    setG(A.drumGain, A.drumsOff ? 0 : 0.35 + A.intensity * 0.6);
    setG(A.snareGain, A.intensity < 0.3 ? 0.35 : 0.85);
    setG(A.tickGain, Math.min(1, A.danger * 0.35) * 0.7);
    setG(A.shimmerGain, Math.max(0, A.intensity - 0.75) * 1.6);
    setG(A.darkGain, A.dark * 0.8);
    setG(A.padGain, 0.55 - A.dark * 0.2);
    setG(A.noiseGain, 0.06 + A.intensity * 0.06);
  }

  // ---------- sfx ----------
  function sfx(fn, name) {
    if (!A.ctx || !settings.enabled) return;
    const t = A.ctx.currentTime;
    if (name) { const last = A.lastCue[name] || -1; if (t - last < SFX_MIN_GAP) return; A.lastCue[name] = t; }
    // Impact cues are pitched a little differently each time so repeats never sound mechanical;
    // musical cues (cadences, chimes, riser) stay in key.
    A.pv = VARIED.has(name) ? 1 + (Math.random() * 0.16 - 0.08) : 1;
    try { fn(A.ctx, t); } catch { /* never let a cue break the frame */ }
  }
  function tone(ctx, t, { freq = 440, type = 'sine', dur = 0.2, vol = 0.5, slide = null, attack = 0.005, verb = 0.3, filter = null }) {
    const pv = A.pv || 1; freq *= pv; if (slide) slide *= pv;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let out = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 1; o.connect(f); out = f; }
    out.connect(g); g.connect(A.sfxBus);
    const v = ctx.createGain(); v.gain.value = verb; g.connect(v); v.connect(A.sfxVerb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseBurst(ctx, t, { dur = 0.15, vol = 0.3, freq = 1200, q = 1, type = 'bandpass' }) {
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq * (A.pv || 1); f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t);
  }
  // A short digital glitch tail: a handful of square blips jumping between random pitches.
  function glitch(ctx, t, n = 6, vol = 0.14) {
    for (let i = 0; i < n; i++) {
      const f = 300 + Math.random() * 2600;
      tone(ctx, t + i * 0.022, { freq: f, type: 'square', dur: 0.02, vol: vol * (1 - i / n), attack: 0.001, verb: 0.05, filter: { freq: 3500 } });
    }
  }
  const CUES = {
    place: (ctx, t, p) => {
      const base = { ndr: 660, ips: 330, waf: 440, honeytoken: 560, wall: 180 }[p && p.type] || 400;
      tone(ctx, t, { freq: base, type: 'triangle', dur: 0.12, vol: 0.35, slide: base * 0.7, verb: 0.2 });
      noiseBurst(ctx, t, { dur: 0.06, vol: 0.15, freq: 2500 });
      tone(ctx, t + 0.09, { freq: base * 1.5, type: 'sine', dur: 0.25, vol: 0.2 });
    },
    // Offline / in maintenance: a dull thud and a short beep.
    refused: (ctx, t) => { tone(ctx, t, { freq: 120, type: 'sine', dur: 0.16, vol: 0.45, slide: 60, verb: 0.1 }); noiseBurst(ctx, t, { dur: 0.05, vol: 0.2, freq: 500, type: 'lowpass' }); tone(ctx, t + 0.06, { freq: 880, type: 'square', dur: 0.06, vol: 0.12, filter: { freq: 2000 }, verb: 0.1 }); },
    shot: (ctx, t) => { if (t - A.lastShot < 0.12) return; A.lastShot = t; tone(ctx, t, { freq: 2400, type: 'sine', dur: 0.03, vol: 0.06, slide: 1200, verb: 0.05 }); },
    // A source exhausted: a short zap (boss: a long descending zap with a rumble).
    kill: (ctx, t, p) => { const boss = !!(p && p.boss); tone(ctx, t, { freq: boss ? 900 : 1400, type: 'square', dur: boss ? 0.5 : 0.08, vol: boss ? 0.4 : 0.28, slide: boss ? 70 : 200, filter: { freq: 3000, q: 2 }, verb: 0.25 }); noiseBurst(ctx, t, { dur: boss ? 0.4 : 0.05, vol: boss ? 0.3 : 0.15, freq: boss ? 300 : 5000, type: boss ? 'lowpass' : 'highpass' }); if (t - A.lastAccent > 0.25) { A.lastAccent = t; accent(t, boss); } },
    trapped: (ctx, t) => { noiseBurst(ctx, t, { dur: 0.05, vol: 0.5, freq: 3200, q: 2 }); tone(ctx, t + 0.01, { freq: 1320, type: 'square', dur: 0.07, vol: 0.28, slide: 330, filter: { freq: 2600 }, verb: 0.2 }); tone(ctx, t + 0.07, { freq: 165, type: 'triangle', dur: 0.14, vol: 0.45, slide: 90, verb: 0.3 }); accent(t + 0.02, true); },
    supplychain: (ctx, t) => {
      // Ominous: a rising alarm on a narrow square, three sweeps, plus a sub thud on the third.
      for (let i = 0; i < 3; i++) tone(ctx, t + i * 0.42, { freq: 260 + i * 60, type: 'square', dur: 0.4, vol: 0.22, slide: 1100 + i * 300, filter: { freq: 2200, q: 3 }, verb: 0.5 });
      tone(ctx, t + 1.2, { freq: 60, type: 'sine', dur: 1.4, vol: 0.55, slide: 34, verb: 0.3 });
      noiseBurst(ctx, t + 1.2, { dur: 0.9, vol: 0.2, freq: 260, type: 'lowpass' });
    },
    vetted: (ctx, t) => { [880, 1175, 1760].forEach((f, i) => tone(ctx, t + i * 0.09, { freq: f, type: 'sine', dur: 0.35, vol: 0.2, verb: 0.6 })); },
    // A source reaches a system it cannot exploit: a metallic clank and a bounce, so the miss is heard.
    probe: (ctx, t) => {
      noiseBurst(ctx, t, { dur: 0.08, vol: 0.5, freq: 2800, q: 3 });
      tone(ctx, t, { freq: 1500, type: 'triangle', dur: 0.12, vol: 0.32, slide: 900, verb: 0.3 });
      tone(ctx, t + 0.09, { freq: 1100, type: 'triangle', dur: 0.09, vol: 0.18, slide: 700, verb: 0.3 });
      noiseBurst(ctx, t + 0.09, { dur: 0.04, vol: 0.2, freq: 2200, q: 3 });
    },
    // A source hits an exploitable system: a heavy low impact, a metallic crack, a digital glitch tail.
    exploit: (ctx, t) => {
      tone(ctx, t, { freq: 95, type: 'sine', dur: 0.42, vol: 0.85, slide: 34, attack: 0.002, verb: 0.2 });
      tone(ctx, t, { freq: 140, type: 'sawtooth', dur: 0.25, vol: 0.4, slide: 55, filter: { freq: 500 }, verb: 0.3 });
      noiseBurst(ctx, t, { dur: 0.09, vol: 0.55, freq: 3400, q: 5 });
      tone(ctx, t + 0.005, { freq: 2100, type: 'square', dur: 0.06, vol: 0.22, slide: 500, filter: { freq: 4000, q: 2 }, verb: 0.2 });
      glitch(ctx, t + 0.08, 7, 0.16);
    },
    compromise: (ctx, t) => {
      stinger(t + 0.15); A.halfTimeUntil = A.barCount + 4;
      tone(ctx, t, { freq: 740, type: 'square', dur: 0.35, vol: 0.28, filter: { freq: 1800 }, verb: 0.5 });
      tone(ctx, t + 0.4, { freq: 494, type: 'square', dur: 0.6, vol: 0.28, filter: { freq: 1500 }, verb: 0.6 });
      tone(ctx, t, { freq: 48, type: 'sine', dur: 2.6, vol: 0.9, slide: 28, attack: 0.003, verb: 0.2 });
      tone(ctx, t + 0.02, { freq: 110, type: 'sawtooth', dur: 0.5, vol: 0.4, slide: 40, filter: { freq: 420 }, verb: 0.3 });
      noiseBurst(ctx, t, { dur: 1.6, vol: 0.35, freq: 220, type: 'lowpass' });
      noiseBurst(ctx, t, { dur: 0.12, vol: 0.5, freq: 3000, q: 4 });
      glitch(ctx, t + 0.1, 9, 0.18);
    },
    patched: (ctx, t) => { tone(ctx, t, { freq: 523, type: 'sine', dur: 0.2, vol: 0.25 }); tone(ctx, t + 0.12, { freq: 784, type: 'sine', dur: 0.35, vol: 0.25, verb: 0.5 }); },
    restored: (ctx, t) => { tone(ctx, t, { freq: 440, type: 'triangle', dur: 0.2, vol: 0.25 }); tone(ctx, t + 0.12, { freq: 659, type: 'triangle', dur: 0.2, vol: 0.25 }); tone(ctx, t + 0.24, { freq: 880, type: 'sine', dur: 0.5, vol: 0.25, verb: 0.6 }); },
    discover: (ctx, t) => { tone(ctx, t, { freq: 1568, type: 'sine', dur: 0.4, vol: 0.2, verb: 0.7 }); tone(ctx, t + 0.05, { freq: 1568 * 1.5, type: 'sine', dur: 0.25, vol: 0.08, verb: 0.7 }); },
    lateral: (ctx, t) => { noiseBurst(ctx, t, { dur: 0.28, vol: 0.3, freq: 700, q: 6 }); noiseBurst(ctx, t + 0.05, { dur: 0.2, vol: 0.18, freq: 1400, q: 8 }); },
    // Two bars into the wave: a pitch riser under a rising noise sweep.
    riser: (ctx, t) => { tone(ctx, t, { freq: 110, type: 'sawtooth', dur: 2.0, vol: 0.2, slide: 880, filter: { freq: 1400, q: 2 }, verb: 0.6 }); tone(ctx, t, { freq: 220, type: 'square', dur: 2.0, vol: 0.1, slide: 1760, filter: { freq: 1800, q: 3 }, verb: 0.5 }); noiseBurst(ctx, t + 0.4, { dur: 1.6, vol: 0.22, freq: 900, type: 'highpass' }); },
    clear: (ctx, t) => { tone(ctx, t, { freq: 392, type: 'sine', dur: 0.5, vol: 0.18, verb: 0.6 }); tone(ctx, t + 0.25, { freq: 587, type: 'sine', dur: 0.8, vol: 0.18, verb: 0.7 }); },
    won: (ctx, t) => {
      // Triumphant: a four-bar major cadence (I - IV - V - I over D) with a bright top line.
      const bar = barSeconds();
      const chords = [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12, 16]];
      chords.forEach((ch, i) => ch.forEach((semi, j) => tone(ctx, t + i * bar * 0.5, { freq: midiToHz(ROOT_MIDI + semi), type: j === ch.length - 1 ? 'sine' : 'triangle', dur: bar * (i === 3 ? 1.6 : 0.55), vol: 0.2, verb: 0.7 })));
    },
    lost: (ctx, t) => { A.drumsOff = true; tone(ctx, t, { freq: 73, type: 'sawtooth', dur: 4.5, vol: 0.5, slide: 49, filter: { freq: 260 }, verb: 0.6 }); tone(ctx, t + 0.2, { freq: 110, type: 'sine', dur: 3.5, vol: 0.25, slide: 55, verb: 0.5 }); },
  };

  function event(name, payload) {
    if (name === 'start') { A.ended = false; A.drumsOff = false; A.halfTimeUntil = -1; if (A.ctx) { A.rng = makeRng((app.game && app.game.seed) || 1); A.phrase = nextPhrase(null, A.rng); A.barIndex = 0; } return; }
    if (name === 'phase') {
      const ph = payload && payload.phase;
      if (ph === 'wave') { if (A.riserArmed) sfx(CUES.riser); A.riserArmed = true; }
      else if (ph === 'prep') sfx(CUES.clear);
      else if (ph === 'won' && !A.ended) { A.ended = true; sfx(CUES.won); }
      else if (ph === 'lost' && !A.ended) { A.ended = true; sfx(CUES.lost); }
      return;
    }
    const cue = CUES[name];
    if (cue) sfx((ctx, t) => cue(ctx, t, payload), name === 'shot' ? null : name);
  }

  // ---------- voice ----------
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const prefs = [/Google UK English Female/i, /Google UK English Male/i, /Samantha/i, /Daniel/i, /Karen/i, /Moira/i, /Google US English/i, /^en[-_]GB/i, /^en[-_]/i];
    for (const p of prefs) { const v = voices.find((x) => p.test(x.name) || p.test(x.lang)); if (v) return v; }
    return voices[0];
  }
  if ('speechSynthesis' in window) { window.speechSynthesis.onvoiceschanged = () => { A.voice = pickVoice(); }; A.voice = pickVoice(); }
  function say(text, level = 'info') {
    if (!settings.enabled || !text) return;
    text = String(text).trim();
    if (!text || text === A.lastSay) return;
    if (A.speaking && level !== 'fail') { A.sayQueue = { text, level, at: performance.now() }; return; }
    speakNow(text);
  }
  function speakNow(text) {
    A.lastSay = text; A.speaking = true; A.sayQueue = null;
    const done = () => { A.speaking = false; const q = A.sayQueue; A.sayQueue = null; if (q && performance.now() - q.at < 4000 && q.text !== A.lastSay) speakNow(q.text); };
    // Credentials never belong in browser storage. The rebuilt game uses pre-generated media.
    browserSpeak(text, done);
  }
  function browserSpeak(text, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (!A.voice) A.voice = pickVoice();
      if (A.voice) u.voice = A.voice;
      u.rate = 1.0; u.pitch = 0.95; u.volume = settings.voice;
      u.onend = done; u.onerror = done;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      // Safety: some engines never fire onend for cancelled utterances.
      setTimeout(() => { if (A.speaking && A.lastSay === text) done(); }, 12000);
    } catch { done(); }
  }

  // ---------- controls ----------
  function setEnabled(v) {
    settings.enabled = !!v; saveSettings(settings);
    if (A.master) A.master.gain.setTargetAtTime(settings.enabled ? 1 : 0, A.ctx.currentTime, 0.05);
    if (!settings.enabled && 'speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } A.speaking = false; }
    if (settings.enabled && A.ctx) { A.nextBarAt = Math.max(A.nextBarAt, A.ctx.currentTime + 0.1); }
    if (btn) { btn.textContent = settings.enabled ? '♪' : '♪'; btn.classList.toggle('off', !settings.enabled); btn.title = settings.enabled ? 'Mute (music, effects, voice)' : 'Unmute'; }
  }
  let btn = null;
  const host = document.getElementById('extras');
  if (host) {
    const wrap = document.createElement('span'); wrap.id = 'audio-ctl';
    btn = document.createElement('button'); btn.className = 'snd'; btn.textContent = '♪';
    btn.onclick = () => { ensureContext(); setEnabled(!settings.enabled); };
    const pop = document.createElement('div'); pop.className = 'pop';
    const slider = (label, key, scale) => {
      const l = document.createElement('label'); l.textContent = label;
      const i = document.createElement('input'); i.type = 'range'; i.min = 0; i.max = 100; i.value = Math.round(settings[key] * 100);
      i.oninput = () => { settings[key] = +i.value / 100; saveSettings(settings); if (A.ctx) scale(settings[key]); };
      l.appendChild(i); pop.appendChild(l);
    };
    slider('Music', 'music', (v) => A.musicBus.gain.setTargetAtTime(v * MUSIC_SCALE, A.ctx.currentTime, 0.05));
    slider('Effects', 'sfx', (v) => A.sfxBus.gain.setTargetAtTime(v * SFX_SCALE, A.ctx.currentTime, 0.05));
    slider('Advisor voice', 'voice', () => {});
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'Legacy synthesised audio. Night Shift uses pre-generated ElevenLabs media without browser credentials.';
    pop.appendChild(hint);
    wrap.appendChild(btn); wrap.appendChild(pop); host.appendChild(wrap);
    setEnabled(settings.enabled);
  }

  // Browsers gate audio behind a gesture: arm on the first pointer or key.
  const arm = () => { if (ensureContext()) { window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); } };
  window.addEventListener('pointerdown', arm); window.addEventListener('keydown', arm);

  return A;
}
