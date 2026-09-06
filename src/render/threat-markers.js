import * as THREE from 'three';
import { activeThreats } from '../ui/active-threats.js';
const TITLES={leak:'DATA LEAK',supply:'SUPPLY CHAIN',ransom:'ENCRYPTED',infection:'MALWARE','worker-fraud':'WORKER FRAUD',insider:'INSIDER'};
export function incidentPins(game){
 const groups=new Map();
 for(const row of activeThreats(game)){if(!row.assetId)continue;let pin=groups.get(row.assetId);if(!pin){pin={assetId:row.assetId,labels:[],state:row.state};groups.set(row.assetId,pin);}pin.labels.push(TITLES[row.kind]||'INCIDENT');if(row.state==='active')pin.state='active';}
 return [...groups.values()].map(pin=>({...pin,text:`${pin.labels.slice(0,2).join(' + ')}${pin.labels.length>2?` +${pin.labels.length-2}`:''} · ${pin.state.toUpperCase()}`}));
}
// Preallocated labels: bounded draw calls, no per-frame geometry/texture creation.
export class ThreatMarkers{
 constructor(scene){this.scene=scene;this.point=new THREE.Vector3();this.entries=Array.from({length:10},()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=80;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});const sprite=new THREE.Sprite(material);sprite.visible=false;sprite.renderOrder=24;scene.add(sprite);return{canvas,texture,sprite,text:''};});this.nextRefresh=0;this.pins=[];}
 update(game,camera,views,time){if(time>=this.nextRefresh||game!==this.game){this.game=game;this.pins=incidentPins(game);this.nextRefresh=time+.2;}const occupied=[];let count=0;for(const pin of this.pins){if(count>=this.entries.length)break;const a=game.asset(pin.assetId);if(!a?.discovered)continue;const height=(views.get(a.id)?.height||3)+1.8;this.point.set(a.x+1,height,a.y+1).applyMatrix4(camera.matrixWorldInverse);const depth=-this.point.z;this.point.set(a.x+1,height,a.y+1).project(camera);if(depth<=0||Math.abs(this.point.x)>.98||Math.abs(this.point.y)>.92||this.point.z>1)continue;const px=(this.point.x+1)*innerWidth/2,py=(1-this.point.y)*innerHeight/2,width=innerWidth<700?165:215;if(occupied.some(([x,y])=>Math.abs(x-px)<width+8&&Math.abs(y-py)<27))continue;occupied.push([px,py]);const entry=this.entries[count++],color=pin.state==='active'?'#ffc0ae':pin.state==='contained'?'#97dfbc':'#a5d8ff';entry.sprite.position.set(a.x+1,height,a.y+1);entry.sprite.visible=true;const scale=2*depth*Math.tan(camera.fov*Math.PI/360)/innerHeight;entry.sprite.scale.set(width*scale,width*80/768*scale,1);if(entry.text!==pin.text){entry.text=pin.text;const ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,768,80);ctx.fillStyle='rgba(11,16,24,.94)';ctx.fillRect(0,0,768,80);ctx.fillStyle=color;ctx.fillRect(0,0,6,80);ctx.font='600 30px sans-serif';ctx.textBaseline='middle';ctx.fillText('!  '+pin.text,17,41,735);entry.texture.needsUpdate=true;}}
  for(let i=count;i<this.entries.length;i++)this.entries[i].sprite.visible=false;
 }
 clear(){this.pins=[];this.nextRefresh=0;this.game=null;for(const e of this.entries)e.sprite.visible=false;}
 dispose(){for(const e of this.entries){this.scene.remove(e.sprite);e.texture.dispose();e.sprite.material.dispose();}this.entries=[];this.pins=[];}
}
