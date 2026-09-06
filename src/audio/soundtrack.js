import { LINES } from './dialogue.js';
export class Soundtrack {
  constructor(){this.enabled=true;this.musicVolume=.18;this.voiceVolume=.8;this.effectVolume=.28;this.manifest=null;this.lastVoice=-20;this.currentVoice=null;this.ready=false;this.recent=new Map();this.videoManifest={};fetch(`${import.meta.env.BASE_URL}media/video-manifest.json`).then(r=>r.json()).then(m=>{this.videoManifest=m;}).catch(()=>{});this.load=fetch(`${import.meta.env.BASE_URL}media/manifest.json`).then(r=>r.json()).then(m=>{this.manifest=m;}).catch(()=>{});}
  async arm(){await this.load;if(this.ready||!this.enabled)return;this.ready=true;this.music=this.element(this.manifest?.music?.nightshift?.file);if(this.music){this.music.loop=true;this.music.volume=this.musicVolume;this.music.play().catch(()=>{});}this.rain=this.element(this.manifest?.effects?.rain?.file);if(this.rain){this.rain.loop=true;this.rain.volume=.055;this.rain.play().catch(()=>{});}}
  element(path){return path?new Audio(`${import.meta.env.BASE_URL}${path}`):null;}
  say(id,onEnd){if(!this.enabled)return;const path=this.manifest?.voices?.[id]?.file;if(!path)return;this.currentVoice?.pause();const voice=this.element(path);this.currentVoice=voice;voice.volume=this.voiceVolume;voice.playbackRate=id.startsWith('salespitch_v10')?1.13:1;if(this.music)this.music.volume=this.musicVolume*.35;voice.onended=()=>{if(this.music)this.music.volume=this.musicVolume;onEnd?.();};voice.onerror=voice.onended;voice.play().catch(()=>onEnd?.());}
  effect(id,x=15){
    if(!this.enabled||!this.ready)return;
    const now=performance.now(),rapid=['ips_shot','waf_arc','shell_impact'].includes(id);
    if(now-(this.recent.get(id)||-10000)<(rapid?130:id==='block'?350:800))return;
    this.recent.set(id,now);this.activeFx??=new Set();
    if(this.activeFx.size>=10)return;
    this.context??=new AudioContext();if(this.context.state==='suspended')this.context.resume().catch(()=>{});
    this.buffers??=new Map();const path=this.manifest?.effects?.[id]?.file;if(!path)return;
    if(!this.buffers.has(id))this.buffers.set(id,fetch(`${import.meta.env.BASE_URL}${path}`).then(r=>r.arrayBuffer()).then(b=>this.context.decodeAudioData(b)).catch(()=>null));
    this.buffers.get(id).then(buffer=>{if(!buffer||!this.enabled||this.activeFx.size>=10)return;const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner();source.buffer=buffer;source.playbackRate.value=rapid?.94+Math.random()*.12:1;gain.gain.value=(rapid?.19:.32)*(this.currentVoice&&!this.currentVoice.paused?.55:1);pan.pan.value=Math.max(-.8,Math.min(.8,(x-15)/18));source.connect(gain).connect(pan).connect(this.context.destination);this.activeFx.add(source);source.onended=()=>{this.activeFx.delete(source);source.disconnect();gain.disconnect();pan.disconnect();};source.start();});
  }
  update(game){if(!this.ready)return;const intense=game.hour>=16||[...game.assets.values()].some(a=>a.locked);if(intense!==this.intense){this.intense=intense;this.music?.pause();this.music=this.element(this.manifest?.music?.[intense?'siege':'nightshift']?.file);if(this.music){this.music.loop=true;this.music.volume=this.musicVolume;if(this.enabled)this.music.play().catch(()=>{});}}}
  toggle(){this.enabled=!this.enabled;if(!this.enabled){this.music?.pause();this.rain?.pause();this.currentVoice?.pause();for(const source of this.activeFx||[])source.stop();}else{if(!this.ready)this.arm();else{this.music?.play().catch(()=>{});this.rain?.play().catch(()=>{});}}return this.enabled;}
  setMusic(value){this.musicVolume=value;if(this.music)this.music.volume=value;}
  reset(){this.currentVoice?.pause();this.intense=false;if(this.music){this.music.src=`${import.meta.env.BASE_URL}${this.manifest?.music?.nightshift?.file}`;this.music.volume=this.musicVolume;if(this.enabled)this.music.play().catch(()=>{});}}
}
