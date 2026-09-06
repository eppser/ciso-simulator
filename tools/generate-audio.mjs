// Run through with-elevenlabs-key. No credentials enter the browser or asset manifest.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { CAST, LINES } from '../src/audio/dialogue.js';
const root = new URL('../public/media/', import.meta.url);
await mkdir(root, { recursive: true });
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Use with-elevenlabs-key node tools/generate-audio.mjs');
let manifest = { provider: 'ElevenLabs', voices: {}, music: {}, effects: {}, errors: {} };
try { manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8')); } catch {}
async function generate(id, group, route, body) {
  const filename = `${group}-${id}.mp3`, file = new URL(filename, root);
  try { await access(file); if (manifest[group]?.[id] && JSON.stringify(manifest[group][id].request)===JSON.stringify(body)) return; } catch {}
  const response = await fetch(`https://api.elevenlabs.io/v1/${route}`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(240000),
  });
  if (!response.ok) { const message = (await response.text()).slice(0, 700); manifest.errors[id] = { status: response.status, message }; console.log(`${id}: unavailable (${response.status})`); return; }
  if (!response.headers.get('content-type')?.includes('audio')) throw new Error(`Unexpected content type for ${id}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(file, bytes);
  manifest[group][id] = { file: `media/${filename}`, bytes: bytes.length, ...(group === 'voices' ? LINES[id] : {}), request: body };
  delete manifest.errors[id];
  console.log(`${id}: saved ${bytes.length} bytes`);
}
const jobs = Object.entries(LINES).map(([id, line]) => () => generate(id, 'voices', `text-to-speech/${CAST[line.speaker].voice}`, {
  text: line.text, model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75 },
}));
jobs.push(() => generate('nightshift', 'music', 'music', { prompt: 'Instrumental cinematic cyber security strategy game underscore, restrained pulsing analog synth in D minor, 92 BPM, dark warm bass, intricate soft ticks, sparse piano, quiet evolving tension, no vocals, no big drops, steady loopable atmosphere for concentrating in a night shift security operations centre.', music_length_ms: 60000, force_instrumental: true }));
jobs.push(() => generate('siege', 'music', 'music', { prompt: 'Instrumental tense cyber thriller game underscore, controlled urgent 112 BPM, low analog synth ostinato, muted electronic percussion, unsettling strings, restrained sub bass, no vocals or lyrics, no loud jump scares, steady loopable music during an escalating incident response.', music_length_ms: 60000, force_instrumental: true }));
for (const [id, text] of Object.entries({ ips_shot: 'Single powerful electromagnetic cannon discharge, sharp metallic transient and tight sub bass thump, short futuristic defensive weapon shot, dry close sound, no music', waf_arc: 'Short crackling blue electrical arc interception, bright laser snap with sizzling energy tail, precision futuristic defense game sound, no voice', emp_burst: 'Special attack electromagnetic pulse, rising electrical charge then powerful bass shockwave with sparkling energy decay, cinematic science fiction ability, no music', shell_impact: 'Hard chitin claws striking reinforced metal barrier, quick crunchy metallic impact with a short scrape, close detailed game sound', barrier_break: 'Reinforced metal security barrier breaks, heavy metal crunch and shards scattering onto asphalt, cinematic physical destruction, no voices', encryption: 'Ominous digital encryption cascade, stuttering hard drives locking then deep alarm bass pulse, short sinister cyber incident game event, no voice', breach: 'A short ominous electronic security breach alert, two deep warning pulses with a metallic digital glitch tail, cinematic clean interface sound', block: 'A crisp soft futuristic defensive energy interception with a muted electrical impact, short game effect', build: 'Precise mechanical equipment activation, soft pneumatic clunk then a pleasant electronic confirmation chime', rain: 'Quiet rain on a modern office window with distant muted city traffic, calm realistic atmospheric loop, no music or voices' })) jobs.push(() => generate(id, 'effects', 'sound-generation', { text, duration_seconds: id === 'rain' ? 12 : 2, prompt_influence: 0.4 }));
let cursor = 0;
await Promise.all(Array.from({ length: 2 }, async () => { while (cursor < jobs.length) { const work = jobs[cursor++]; try { await work(); } catch (e) { console.log(`Generation error: ${e.message}`); } await writeFile(new URL('manifest.json', root), JSON.stringify(manifest, null, 2)); } }));
console.log(JSON.stringify({ voices: Object.keys(manifest.voices).length, music: Object.keys(manifest.music).length, effects: Object.keys(manifest.effects).length, errors: Object.keys(manifest.errors) }));
