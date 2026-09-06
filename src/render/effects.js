import * as THREE from 'three';
import {textSprite} from './text.js';
import { C } from './palette.js';
import { radialTexture } from './textures.js';

// Short-lived visuals driven by the sim's effect queue: IPS beams, kill bursts, exploit
// flashes, compromise shockwaves, a supply-chain detonation, a vetting shield, a honey-token
// implosion. Small objects, disposed when they expire.
export class Effects {
  constructor(scene, camera = null) {
    this.scene = scene;
    this.camera = camera;
    this.labelPoint = new THREE.Vector3();
    this.items = [];
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 40);
    this.beamMat = new THREE.LineBasicMaterial({ color: C.accent, transparent: true, opacity: 0.9, linewidth: 1 });
    this.glowTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    this.smokeTex = radialTexture('rgba(90,90,95,0.9)', 'rgba(90,90,95,0)');
    this.columnGeo = new THREE.CylinderGeometry(0.5, 0.7, 1, 16, 1, true);
    this.sparkMat = new THREE.PointsMaterial({ map: this.glowTex, color: 0xffb070, size: 0.22, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.views = null;   // set by the render controls: the live AssetView map, for hit feedback
    this.shake = 0;      // seconds of camera micro-shake left, read by the render controls
    this.lights=Array.from({length:4},()=>{const l=new THREE.PointLight(0xffffff,0,7,2);scene.add(l);return l;});this.lightIndex=0;
  }
  viewAt(x, y) { if (!this.views) return null; for (const v of this.views.values()) if (v.asset.x + 1 === x && v.asset.y + 1 === y) return v; return null; }
  sparks(x, y, z, n, color, spread = 1, ttl = 0.7) {
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; const a = Math.random() * 6.283, r = (0.8 + Math.random() * 2.2) * spread; vel[i * 3] = Math.cos(a) * r; vel[i * 3 + 1] = 2.2 + Math.random() * 3.2; vel[i * 3 + 2] = Math.sin(a) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = this.sparkMat.clone(); m.color.set(color);
    const p = new THREE.Points(g, m); p.userData.noAO = true; p.frustumCulled = false;
    this.scene.add(p);
    this.items.push({ obj: p, life: ttl, ttl, kind: 'sparks', vel });
  }
  spawn(e, game) {
    const t = e.type;
    if(t==='business-impact'){
      const v=this.views?.get(e.assetId);if(!v?.asset.discovered)return;
      const active=this.items.find(i=>i.kind==='impact-label'&&i.assetId===e.assetId);
      const amount=e.amount+(active?.amount||0);
      if(active){this.disposeItem(active);this.items.splice(this.items.indexOf(active),1);}
      const obj=textSprite(`+${amount.toFixed(1)} · ${e.reason.toUpperCase()}`,{size:24,color:e.reason==='Ransomware'?'#ffb474':'#ff8c7c',bg:'rgba(36,8,7,.86)',scale:.25});
      obj.position.set(e.x,(v.height||2)+1.1,e.y);this.scene.add(obj);this.sizeLabel(obj);this.items.push({obj,assetId:e.assetId,amount,kind:'impact-label',life:2.8,ttl:2.8});return;
    }
    if(t==='internal-spawn'){this.ring(e.x,e.y,0xf59660,.8,.6);return;}
    if(t==='crown-down'){this.ring(e.x,e.y,0xff4936,5,1.8);this.flash(e.x,e.y,0xff4936,.8,5);return;}
    if(t==='shot'&&this.items.length>150)return;
    if(t==='barrier-hit'){this.sparks(e.x,.35,e.y,5,0xffb476,.35,.3);return;}
    if(t==='barrier-break'){this.sparks(e.x,.35,e.y,24,0xd1b398,1,.8);this.ring(e.x,e.y,0xc48b64,1.5,.6);this.smoke(e.x,.3,e.y,1.4);return;}
    if(t==='encryption'){this.ring(e.x,e.y,0xff3b30,8,2);this.ring(e.x,e.y,0xff3b30,4,1);return;}
    if (t === 'shot') {
      const a = game.attackers.find((x) => x.id === e.to);
      const to = a ? [a.x, 0.4, a.y] : [e.tx, 0.4, e.ty];
      const color=e.control==='waf'?0x65bfff:0xffc287;
      const start=new THREE.Vector3(e.x,.72,e.y),end=new THREE.Vector3(...to),points=[start];
      if(e.control==='waf')for(let i=1;i<9;i++){const p=start.clone().lerp(end,i/9);p.y+=Math.sin(i*17.3+e.x)*.065;p.x+=Math.sin(i*9.7+e.y)*.045;points.push(p);}
      points.push(end);
      const g = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(g, this.beamMat.clone());
      line.material.color.set(color);this.sprite(e.x,.72,e.y,color,.35,.10);
      this.scene.add(line);
      this.items.push({ obj: line, life: 0.12, ttl: 0.12, kind: 'beam' });
      this.ribbon(start,end,e.control==='waf'?.035:.018,color,.10);
      this.flash(e.x,e.y,color,.09,e.control==='waf'?1.5:2.4);
      this.sparks(to[0],to[1],to[2],e.control==='waf'?3:5,color,.18,.22);
      this.sprite(to[0], 0.3, to[2], color, 0.4, 0.15);
    } else if (t === 'kill' || t === 'captured') {
      this.ring(e.x, e.y, e.boss ? C.accent : C.text, e.boss ? 1.8 : 0.7, 0.45);
      this.sprite(e.x, 0.4, e.y, e.boss ? C.accent : 0xffffff, e.boss ? 2.2 : 1.0, 0.3);
    } else if (t === 'trapped') {
      this.ring(e.x, e.y, C.amber, 1.1, 0.5, true);
      this.sprite(e.x, 0.4, e.y, C.amber, 1.6, 0.35);
      this.flash(e.x, e.y, C.amber, 0.4, 2);
    } else if (t === 'probe') {
      // The attempt bounces: a blue-white spark on the wall and a short ripple.
      this.ring(e.x, e.y, 0x9fc0ff, 1.2, 0.35);
      this.sprite(e.x, 0.7, e.y, 0xdfe8ff, 0.9, 0.18);
      this.sparks(e.x, 0.7, e.y, 6, 0xcfe0ff, 0.5, 0.4);
    } else if (t === 'refused') {
      this.ring(e.x, e.y, C.blue, 1.3, 0.4);
    } else if (t === 'exploit') {
      // An exploit lands: the building flashes red, sparks fly, the camera kicks, the pad scorches.
      const v = this.viewAt(e.x, e.y); if (v) v.hit(1);
      this.shake = Math.max(this.shake, 0.15);
      this.ring(e.x, e.y, C.accent, 1.8, 0.5);
      this.flash(e.x, e.y, 0xff4030, 0.35, 12);
      this.sprite(e.x, 1.0, e.y, 0xff6040, 2.2, 0.28);
      this.sparks(e.x, 0.9, e.y, 16, 0xffb070, 1, 0.75);
    } else if (t === 'compromise') {
      const v = this.viewAt(e.x, e.y); if (v) v.hit(2);
      this.shake = Math.max(this.shake, 0.3);
      this.ring(e.x, e.y, C.danger, 4.5, 1.4);
      this.ring(e.x, e.y, C.danger, 2.5, 0.9);
      this.flash(e.x, e.y, C.danger, 1.2, 8);
      this.sprite(e.x, 1.2, e.y, C.danger, 3.5, 0.5);
      this.sparks(e.x, 1.0, e.y, 22, 0xff6a40, 1.4, 1.0);
      for (let i = 0; i < 7; i++) this.smoke(e.x + (Math.random() - 0.5) * 0.9, 0.8, e.y + (Math.random() - 0.5) * 0.9, 3 + Math.random() * 1.5);
    } else if (t === 'supplychain') {
      // A column of red light drops from above onto the building, then a shockwave and smoke.
      const col = new THREE.Mesh(this.columnGeo, new THREE.MeshBasicMaterial({ color: C.danger, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      col.position.set(e.x, 12, e.y); col.scale.set(1, 24, 1);
      this.scene.add(col);
      this.items.push({ obj: col, life: 1.1, ttl: 1.1, kind: 'column' });
      this.flash(e.x, e.y, C.danger, 1.4, 8);
      this.items.push({ obj: null, life: 0.55, ttl: 0.55, kind: 'delayed', fn: () => { this.ring(e.x, e.y, C.danger, 5.5, 1.3); this.ring(e.x, e.y, C.danger, 3.0, 0.8); this.sprite(e.x, 1.4, e.y, C.danger, 4, 0.5); for (let i = 0; i < 8; i++) this.smoke(e.x + (Math.random() - 0.5) * 1.2, 0.9, e.y + (Math.random() - 0.5) * 1.2, 3.5 + Math.random() * 2); } });
    } else if (t === 'vetted') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.green, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      dome.position.set(e.x, 0.05, e.y);
      this.scene.add(dome);
      this.items.push({ obj: dome, life: 0.9, ttl: 0.9, kind: 'dome' });
      this.ring(e.x, e.y, C.green, 2.4, 0.8);
      this.flash(e.x, e.y, C.green, 0.6, 3);
    } else if (t === 'patched' || t === 'restored') {
      this.ring(e.x, e.y, C.green, 2.2, 0.8);
      this.sprite(e.x, 1.2, e.y, C.green, 2.0, 0.4);
    } else if (t === 'discover') {
      this.ring(e.x, e.y, C.amber, 2.6, 1.0);
    } else if (t === 'lateral') {
      this.ring(e.x, e.y, C.accent2, 1.0, 0.5);
    }
  }
  ring(x, y, color, size, ttl, implode = false) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, y); m.scale.setScalar(implode ? size : 0.1);
    this.scene.add(m);
    this.items.push({ obj: m, life: ttl, ttl, kind: implode ? 'implode' : 'ring', size });
  }
  ribbon(start,end,width,color,ttl){
    const direction=end.clone().sub(start),eye=(this.camera?.position||new THREE.Vector3(0,20,20)).clone().sub(start);
    const side=direction.clone().cross(eye).normalize().multiplyScalar(width);
    const verts=[start.clone().add(side),start.clone().sub(side),end.clone().add(side),end.clone().sub(side)];
    const g=new THREE.BufferGeometry().setFromPoints(verts);g.setIndex([0,1,2,2,1,3]);
    const m=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(2),transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
    const obj=new THREE.Mesh(g,m);obj.userData.noAO=true;this.scene.add(obj);this.items.push({obj,life:ttl,ttl,kind:'beam'});
  }
  sprite(x, y, z, color, size, ttl) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, y, z); s.scale.setScalar(size * 0.3);
    this.scene.add(s);
    this.items.push({ obj: s, life: ttl, ttl, kind: 'glow', size });
  }
  smoke(x, y, z, ttl) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, opacity: 0.6, depthWrite: false }));
    s.position.set(x, y, z); s.scale.setScalar(0.6);
    this.scene.add(s);
    this.items.push({ obj: s, life: ttl, ttl, kind: 'smoke', vx: (Math.random() - 0.5) * 0.3, vy: 0.6 + Math.random() * 0.5 });
  }
  flash(x, y, color, ttl, intensity = 3) {
    const l=this.lights[this.lightIndex++%this.lights.length];this.items=this.items.filter(i=>i.obj!==l);l.color.set(color);l.intensity=intensity;l.position.set(x,1.6,y);
    this.items.push({ obj: l, life: ttl, ttl, kind: 'light', intensity });
  }
  sizeLabel(obj) {
    if(!this.camera)return;
    const depth=-this.labelPoint.copy(obj.position).applyMatrix4(this.camera.matrixWorldInverse).z;
    const perPixel=2*Math.max(1,depth)*Math.tan(this.camera.fov*Math.PI/360)/innerHeight;
    const {w,h}=obj.material.map.userData,k=perPixel*(innerWidth<760?10:12)/24;
    obj.scale.set(w*k,h*k,1);obj.visible=depth>0;
  }
  disposeItem(it) {
    if(!it.obj)return;
    if(it.kind==='light'){it.obj.intensity=0;return;}
    this.scene.remove(it.obj);
    // Rings/columns and sprite textures are shared; only release owned geometry.
    if(['beam','sparks','dome'].includes(it.kind))it.obj.geometry?.dispose();
    it.obj.material?.dispose();
  }
  clear() {
    for(const it of this.items)this.disposeItem(it);
    this.items=[];this.shake=0;
    for(const light of this.lights)light.intensity=0;
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const k = Math.max(0, it.life / it.ttl);
      switch (it.kind) {
        case 'impact-label':it.obj.position.y+=dt*.35;it.obj.material.opacity=Math.min(1,k*2);this.sizeLabel(it.obj);break;
        case 'ring': it.obj.scale.setScalar(0.1 + it.size * (1 - k)); it.obj.material.opacity = k * 0.9; break;
        case 'implode': it.obj.scale.setScalar(Math.max(0.05, it.size * k)); it.obj.material.opacity = 0.9; break;
        case 'beam': it.obj.material.opacity = k; break;
        case 'light': it.obj.intensity = it.intensity * k; break;
        case 'glow': it.obj.scale.setScalar(it.size * (0.3 + (1 - k) * 0.9)); it.obj.material.opacity = k * 0.9; break;
        case 'smoke': it.obj.position.x += it.vx * dt; it.obj.position.y += it.vy * dt; it.obj.scale.setScalar(0.6 + (1 - k) * 2.2); it.obj.material.opacity = Math.min(0.55, k * 0.8); break;
        case 'column': { const u = 1 - k; it.obj.scale.set(1 + u * 0.6, 24 * (1 - u * 0.95), 1 + u * 0.6); it.obj.position.y = 12 * (1 - u * 0.95); it.obj.material.opacity = 0.55 * (u < 0.7 ? 1 : (1 - u) / 0.3); break; }
        case 'dome': it.obj.scale.setScalar(1 + (1 - k) * 0.5); it.obj.material.opacity = 0.35 * k; break;
        case 'sparks': { const p = it.obj.geometry.attributes.position, v = it.vel; for (let j = 0; j < p.count; j++) { v[j * 3 + 1] -= 9.5 * dt; p.array[j * 3] += v[j * 3] * dt; p.array[j * 3 + 1] = Math.max(0.05, p.array[j * 3 + 1] + v[j * 3 + 1] * dt); p.array[j * 3 + 2] += v[j * 3 + 2] * dt; } p.needsUpdate = true; it.obj.material.opacity = Math.min(1, k * 1.6); break; }
        case 'delayed': if (it.life <= 0) it.fn(); break;
      }
      if (it.life <= 0) {
        this.disposeItem(it);
        this.items.splice(i, 1);
      }
    }
  }
}
