import * as THREE from 'three';
export function radarReadout(a,game){
 const category=a.aiThreat?'AI THREAT':a.social?'SOCIAL ENGINEERING':a.credential?'STOLEN LOGIN':a.kind==='lateral'?'INTERNAL WORM':a.boss?'BLACKOUT':a.avatar==='virus'?'VIRUS PAYLOAD':'EXPLOIT BUG';
 const payload=a.credential?'IDENTITY':a.kind==='lateral'?'MALWARE':a.web?'WEB':'DEVICE';
 const asset=game.asset(a.targetId),target=asset?.discovered?asset.name:'Unlisted system';
 const counter=a.aiThreat?'Radar exposes shield; match WAF / IPS':a.credential?'Training / MFA / PAM':a.kind==='lateral'?'EDR / containment':a.web?'WAF slowing beam':'IPS device defense';
 return {category,payload,target,counter,text:`${category} · ${payload}\n→ ${target}`,color:a.credential?'#e8b471':a.kind==='lateral'?'#c899f3':a.web?'#82d5ed':'#ff9b7c'};
}
export class RadarLabels{
 constructor(scene){this.labels=Array.from({length:10},()=>{const c=document.createElement('canvas');c.width=640;c.height=100;const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.scale.set(2.5,.39,1);sprite.renderOrder=25;sprite.visible=false;scene.add(sprite);return{c,texture,sprite,text:''};});this.point=new THREE.Vector3();}
 update(game,camera,selected){
  const sources=game.attackers.filter(a=>a.alive&&a.intelRevealed).sort((a,b)=>(b.id===selected?.id)-(a.id===selected?.id)||(b.boss?1:0)-(a.boss?1:0)||a.id-b.id),occupied=[],width=innerWidth<700?200:230;let count=0;
  for(const a of sources){if(count===this.labels.length)break;const height=a.boss?2.6:1.1;this.point.set(a.x,height,a.y).applyMatrix4(camera.matrixWorldInverse);const depth=-this.point.z;this.point.set(a.x,height,a.y).project(camera);if(depth<=0||Math.abs(this.point.x)>.97||Math.abs(this.point.y)>.9||this.point.z>1)continue;const px=(this.point.x+1)*innerWidth/2,py=(1-this.point.y)*innerHeight/2;if(occupied.some(([x,y])=>Math.abs(px-x)<width+10&&Math.abs(py-y)<46))continue;occupied.push([px,py]);
   const entry=this.labels[count++],r=radarReadout(a,game);entry.sprite.visible=true;entry.sprite.position.set(a.x,height,a.y);const worldPerPixel=2*depth*Math.tan(camera.fov*Math.PI/360)/innerHeight;entry.sprite.scale.set(width*worldPerPixel,width*100/640*worldPerPixel,1);const text=r.text+(a.breaching?' · BREACHING':'');if(entry.text!==text){entry.text=text;const ctx=entry.c.getContext('2d');ctx.clearRect(0,0,640,100);ctx.fillStyle='rgba(9,15,23,.9)';ctx.fillRect(0,0,640,100);ctx.fillStyle=r.color;ctx.fillRect(0,0,5,100);ctx.font='600 28px Inter, sans-serif';ctx.fillText(r.category+' · '+r.payload,16,34,610);ctx.fillStyle='#e9edf2';ctx.font='28px Inter, sans-serif';ctx.fillText('→ '+r.target+(a.breaching?' · BREACHING':''),16,75,610);entry.texture.needsUpdate=true;}
  }
  for(let i=count;i<this.labels.length;i++)this.labels[i].sprite.visible=false;
 }
}
