import {it,expect} from 'vitest';
import fs from 'node:fs';
import {LINES,CAST} from '../src/audio/dialogue.js';
it('ships matching ElevenLabs audio for every active dialogue take',()=>{
 expect(new Set(Object.values(CAST).map(c=>c.voice)).size).toBe(Object.keys(CAST).length);
 const media=new URL('../public/',import.meta.url);
 const manifest=JSON.parse(fs.readFileSync(new URL('media/manifest.json',media),'utf8'));
 for(const [id,line]of Object.entries(LINES)){
  const clip=manifest.voices[id];expect(clip,id).toBeDefined();
  expect(clip.voiceId,id).toBe(CAST[line.speaker].voice);
  expect(clip.text,id).toBe(line.text);expect(clip.speaker,id).toBe(line.speaker);
  expect(clip.request.text,id).toBe(line.text);
  expect(fs.statSync(new URL(clip.file,media)).size,id).toBe(clip.bytes);
 }
 expect(Object.keys(manifest.errors)).toHaveLength(0);
});
