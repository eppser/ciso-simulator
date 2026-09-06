import * as THREE from 'three';
import {assetExposure} from '../ui/asset-exposure.js';
import {roundRect} from './text.js';

// One reusable label and footprint bracket mesh per discovered building. No extra lights.
export class ExposureMarkers{
 constructor(scene){this.scene=scene;this.entries=new Map();this.point=new THREE.Vector3();this.lastRefresh=-Infinity;this.records=[];}
 make(id){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=228;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));sprite.renderOrder=23;sprite.visible=false;sprite.userData.noReflection=true;this.scene.add(sprite);
  const pts=[];for(const x of [-1,1])for(const z of [-1,1]){pts.push(x*1.18,.04,z*.72,x*1.18,.04,z*1.18,x*1.18,.04,z*1.18,x*.72,.04,z*1.18,x*1.18,.04,z*1.18,x*1.18,.48,z*1.18);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const brackets=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xffaf69,transparent:true,opacity:.9,depthWrite:false}));brackets.userData.noReflection=true;brackets.userData.noAO=true;brackets.visible=false;this.scene.add(brackets);
  const e={canvas,texture,sprite,brackets,text:'',id};this.entries.set(id,e);return e;
 }
 draw(e,a,r,full){
  const signature=JSON.stringify([a.name,r,full]);if(signature===e.text)return;e.text=signature;
  const c=e.canvas.getContext('2d'),h=full?228:130;e.texture.repeat.y=h/228;e.texture.offset.y=1-h/228;
  c.clearRect(0,0,768,228);c.fillStyle='rgba(8,14,21,.96)';roundRect(c,1,1,766,h-2,18);c.fill();c.strokeStyle=r.color;c.lineWidth=3;c.stroke();c.fillStyle=r.color;c.fillRect(2,18,7,h-36);
  const fit=(text,y,size,color)=>{c.font=`600 ${size}px Inter, sans-serif`;const min=full?36:54;while(c.measureText(text).width>718&&size>min){size--;c.font=`600 ${size}px Inter, sans-serif`;}if(c.measureText(text).width>718){while(text.length&&c.measureText(text+'…').width>718)text=text.slice(0,-1);text+='…';}c.fillStyle=color;c.fillText(text,25,y);};
  fit(a.name,full?44:52,full?42:58,'#f0f3f6');
  const glyph=r.incident?'!':r.state==='clear'?'✓':r.state==='unknown'?'?':r.state==='stale'?'↻':'!';
  fit(`${glyph}  ${r.headline}`,full?92:110,full?42:54,r.color);
  if(full){const v=r.findings[0];fit(v?`${v.vendor} · ${v.displayId}${r.count>1?`  +${r.count-1}`:''}`:r.state==='clear'?'Scan complete · no known flaws':'Scanner inspection required',144,40,'#e2e9f1');fit(r.state==='stale'?'Old findings · awaiting rescan':r.contained&&r.count?'Contained ≠ fixed':r.remedy||'Click the building for details',195,36,'#a9bacb');}
  e.texture.needsUpdate=true;
 }
 update(game,camera,views,selected,time,labels){
  if(this.game!==game){this.clear();this.game=game;}
  if(time-this.lastRefresh>.2){this.lastRefresh=time;this.records=[...game.assets.values()].filter(a=>a.discovered).map(a=>({a,r:assetExposure(game,a)}));}
  for(const e of this.entries.values()){e.sprite.visible=false;e.brackets.visible=false;}
  const occupied=[];
  const records=[...this.records].sort((x,y)=>Number(y.a.id===selected?.id)-Number(x.a.id===selected?.id)||y.r.priority-x.r.priority);
  for(const {a,r}of records){const v=views.get(a.id);if(!v)continue;const active=r.state!=='unknown'||game.bought('scanner')||a.id===selected?.id;if(!active)continue;
   const e=this.entries.get(a.id)||this.make(a.id);e.brackets.position.set(a.x+.5,0,a.y+.5);e.brackets.material.color.set(r.color);
   e.brackets.visible=r.state!=='unknown';e.brackets.material.opacity=r.state==='vulnerable'?.62+Math.sin(time*2.8)*.25:r.state==='clear'?.45:.72;
   // A selection always shows details. Labels-off keeps the tactical footprint but hides text.
   if(!labels&&a.id!==selected?.id)continue;
   const height=v.height+.58;this.point.set(a.x+.5,height,a.y+.5).applyMatrix4(camera.matrixWorldInverse);const depth=-this.point.z;
   this.point.set(a.x+.5,height,a.y+.5).project(camera);if(depth<=0||Math.abs(this.point.x)>.98||Math.abs(this.point.y)>.93||this.point.z>1)continue;
   const px=(this.point.x+1)*innerWidth/2,py=(1-this.point.y)*innerHeight/2;
   const width=innerWidth<760?190:210;
   const overlaps=(w,h)=>occupied.some(([x,y,ow,oh])=>Math.abs(x-px)<(w+ow)/2+6&&Math.abs(y-py)<(h+oh)/2+6);
   const space=!overlaps(width,width*228/768);
   const full=(a.id===selected?.id||r.state==='vulnerable'&&space)&&!r.incident;
   const w=full?width:144,h=full?w*228/768:w*130/768;
   // Compact badges may be skipped in crowded views; every affected footprint remains marked.
   if(!full&&overlaps(w,h))continue;
   occupied.push([px,py,w,h]);v.marker.visible=false;const perPixel=2*depth*Math.tan(camera.fov*Math.PI/360)/innerHeight;
   e.sprite.position.set(a.x+.5,height,a.y+.5);e.sprite.scale.set(w*perPixel,h*perPixel,1);e.sprite.visible=true;this.draw(e,a,r,full);
  }
 }
 clear(){for(const e of this.entries.values()){this.scene.remove(e.sprite,e.brackets);e.texture.dispose();e.sprite.material.dispose();e.brackets.geometry.dispose();e.brackets.material.dispose();}this.entries.clear();this.records=[];this.lastRefresh=-Infinity;}
}
