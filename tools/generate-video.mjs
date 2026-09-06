import { readFile, writeFile, access } from 'node:fs/promises';
const root=new URL('../public/media/',import.meta.url), token=process.env.ELEVENLABS_API_KEY;
if(!token)throw new Error('Run with with-elevenlabs-key');
const headers={'xi-api-key':token,'Content-Type':'application/json'};
const image=(await readFile(new URL('characters.png',root))).toString('base64');
let clips={};try{clips=JSON.parse(await readFile(new URL('video-manifest.json',root),'utf8'));}catch{}
delete clips.error;
const prompts={
 engineer:'ONLY the first character from the reference contact sheet, the female security engineer in glasses and a headset. One single closeup camera shot in the SOC. She acknowledges a patch request, nods with dry amused confidence, glances at a monitor and returns to the camera. Natural lively face, subtle gestures.',
 board:'ONLY the second character from the reference contact sheet, the silver haired male board chairman. One single closeup webcam shot in the boardroom. He reacts with frustrated disbelief to a ransomware outage, throws up his hands and demands an explanation. Emotionally intense, darkly comic corporate realism.',
 criminal:'ONLY the third character from the reference contact sheet, the fictional male criminal in a hood. One single closeup shot in a dark room lit by a red monitor. He leans forward, laughs coldly and gestures with sarcastic customer service politeness while demanding a ransom. No weapons, no real criminal affiliations.',
 business:'ONLY the fourth character from the reference contact sheet, the female business operations director. One single closeup webcam shot in a logistics office. She looks at a production outage report, raises an incredulous eyebrow, then firmly gestures for a recovery estimate. Darkly funny frustration.',
};
for(const [id,prompt] of Object.entries(prompts)){
 if(clips[id]?.file)continue;
 const request={model_id:'veo-3.1-fast-generate-001',prompt:`Photorealistic cinematic live action. ${prompt} Keep face and shoulders centered. No split screen, no contact sheet, no captions, no text. Silent performance: voice is added separately in the game.`,duration_secs:8,aspect_ratio:'16:9',resolution:'720p',generate_audio:false,images:[{image:{type:'inline_base64',content_base64:image,mime_type:'image/png'},role:'subject'}]};
 const r=await fetch('https://api.elevenlabs.io/v1/flows/video',{method:'POST',headers,body:JSON.stringify(request)});const j=await r.json();
 if(!r.ok){clips.error={status:r.status,detail:j};console.log(JSON.stringify(clips.error));await writeFile(new URL('video-manifest.json',root),JSON.stringify(clips,null,2));process.exitCode=1;break;}
 clips[id]={id:j.id,status:j.status};console.log(`${id}: submitted ${j.id}`);await writeFile(new URL('video-manifest.json',root),JSON.stringify(clips,null,2));
}
if(!clips.error){
 for(let round=0;round<40;round++){
  const pending=Object.entries(clips).filter(([,v])=>v.id&&!v.file&&v.status!=='failed');if(!pending.length)break;
  await new Promise(resolve=>setTimeout(resolve,15000));
  for(const [id,clip] of pending){const r=await fetch(`https://api.elevenlabs.io/v1/flows/video/${clip.id}`,{headers});const j=await r.json();if(!r.ok){console.log(`${id}: status unavailable ${r.status}`);continue;}clip.status=j.status;
   if(j.status==='completed'){const bytes=await fetch(j.content_url);if(!bytes.ok)throw new Error('Video download failed');await writeFile(new URL(`${id}.mp4`,root),Buffer.from(await bytes.arrayBuffer()));clip.file=`media/${id}.mp4`;console.log(`${id}: saved`);}
   if(j.status==='failed'){clip.error=j.error_message;console.log(`${id}: ${j.error_message}`);}
  }await writeFile(new URL('video-manifest.json',root),JSON.stringify(clips,null,2));
 }
}
