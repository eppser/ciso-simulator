// Pure progression logic, kept separate so it can be checked without an AudioContext.
//
// The soundtrack sits in D dorian. Chords are scale degrees (0..6); each 8-bar phrase is a
// seeded random walk over a transition table, and a phrase is never allowed to equal the
// one before it (one chord is nudged if it would).

export const DORIAN = [0, 2, 3, 5, 7, 9, 10];            // semitone offsets from the root
export const ROOT_MIDI = 50;                               // D3

// Where a chord likes to go. Weighted, so the walk has a pull toward i and VII.
const NEXT = {
  0: [[0, 2], [2, 3], [3, 3], [4, 2], [6, 3], [5, 1], [1, 1]],
  1: [[0, 3], [4, 2], [6, 1]],
  2: [[6, 3], [3, 2], [0, 2], [4, 1]],
  3: [[0, 3], [6, 2], [4, 2], [2, 1]],
  4: [[0, 4], [2, 2], [3, 1], [5, 1]],
  5: [[0, 2], [4, 2], [6, 2]],
  6: [[0, 4], [2, 2], [3, 2], [6, 1], [1, 1]],
};

export function nextChord(state, rng) {
  const options = NEXT[state.degree] || NEXT[0];
  let total = 0;
  for (const [, w] of options) total += w;
  let r = rng() * total;
  let pick = options[options.length - 1][0];
  for (const [d, w] of options) { r -= w; if (r <= 0) { pick = d; break; } }
  return { ...state, degree: pick };
}

// Build a phrase of `bars` chords. `prev` is the previous phrase; the new one must differ.
export function nextPhrase(prev, rng, bars = 8, start = 0) {
  let state = { degree: prev && prev.length ? prev[prev.length - 1] : start };
  const out = [];
  for (let i = 0; i < bars; i++) { state = nextChord(state, rng); out.push(state.degree); }
  if (prev && prev.length === bars && out.every((d, i) => d === prev[i])) {
    const i = Math.floor(rng() * bars);
    out[i] = (out[i] + 2 + Math.floor(rng() * 4)) % 7;
  }
  return out;
}

// Chord tones (semitones from root) for a degree: triad + seventh, dorian voicing.
export function chordTones(degree, dark = false) {
  const n = DORIAN.length;
  const t = (k) => DORIAN[(degree + k) % n] + 12 * Math.floor((degree + k) / n);
  const tones = [t(0), t(2), t(4), t(6)];
  if (dark) tones[1] = t(1); // suspend the third down toward the second: colder
  return tones;
}

export function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// Deterministic PRNG for the walk (mulberry32), so a seed reproduces the score.
export function makeRng(seed) {
  let a = (seed >>> 0) || 7;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------
// Rhythm section (v2). Pure data and pickers, checked without an AudioContext.

export const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];

// Chord tones for a degree in a given scale; `dark` moves to aeolian and suspends the third.
export function chordTonesIn(degree, dark = false) {
  const scale = dark ? AEOLIAN : DORIAN;
  const n = scale.length;
  const t = (k) => scale[(degree + k) % n] + 12 * Math.floor((degree + k) / n);
  const tones = [t(0), t(2), t(4), t(6)];
  if (dark) tones[1] = t(1);
  return tones;
}

// 16-step patterns. k = kick, s = snare, x = both, . = rest. Six full-drive patterns, three
// light ones for preparation, and a fill for the last bar of a phrase.
export const DRUM_PATTERNS = [
  'k...s...k...s...', // four on the floor, backbeat
  'k..k.s..k.k..s..', // syncopated kick
  'k...s..kk...s...', // pickup
  'k.k.s...k.k.s..k', // driving
  'k...s.k...k.s...', // off-beat push
  'k..ks...k..ks.k.', // military
  'k.kk..k.s...kk..', // double-kick charge (v3)
  '.k..s..k.k..s.k.', // off-beat kick, backbeat holds (v3)
  'k..k..k.s.k..k.s', // tresillo push (v3)
  'kk..s..kkk..s.k.', // double-kick with a snare pickup (v3)
];
// Driving 16th hats with an accent every four steps (H = accented).
export const DRIVE_HATS = 'HhhhHhhhHhhhHhhh';
// Brass-like stabs on the last bar of every four: beat 1 and the "and" of 2.
export const STAB_STEPS = [0, 6];
export const LIGHT_PATTERNS = [
  'k.......k.......',
  'k...........k...',
  'k.......k.....k.',
];
export const HALF_TIME = 'k.......s.......';
export const FILL_PATTERN = 'k...s...k.s.ssss';
export const HAT_PATTERNS = [
  'h.h.h.h.h.h.h.h.', // eighths
  'hhhhhhhhhhhhhhhh', // sixteenths
  'h.hhh.hhh.hhh.hh', // shuffle-ish
  'h..hh..hh..hh.h.', // broken
];
export const TICK_PATTERN = 't.t.t.t.tt.t.t.t';

// Pick a pattern index that is never the one used last bar.
export function nextPattern(bank, prev, rng) {
  if (bank.length < 2) return 0;
  let i = Math.floor(rng() * bank.length);
  if (i === prev) i = (i + 1 + Math.floor(rng() * (bank.length - 1))) % bank.length;
  return i;
}

// Bass rhythm by drive: 0 quarter notes, 1 eighths, 2 sixteenths (with octave/fifth colour).
export function bassSteps(drive, rng) {
  const steps = [];
  const every = drive >= 2 ? 1 : drive === 1 ? 2 : 4;
  for (let s = 0; s < 16; s += every) {
    let interval = 0;
    if (s % 4 === 2 && rng() < 0.3) interval = 7;      // fifth on the "and"
    else if (s % 8 === 6 && rng() < 0.4) interval = 12; // octave lift
    steps.push({ s, interval, accent: s % 4 === 0 });
  }
  return steps;
}
