import * as THREE from 'three';
import {StormClouds} from './storm-clouds.js';
import {dressWetGround,wetAsphaltMaterial} from './wet-ground.js';
import {RainSplashes} from './rain-splashes.js';
import {streetLabels} from './street-labels.js';
import {SECURITY_OPERATIONS,SECURITY_OPERATIONS_CELLS,footprintCells,cellToken,claimVehicleFootprint} from '../sim/footprints.js';
import { CampusSignals } from './signals.js';
import { dressCampus,perimeterTrees } from './landscape.js';
import { loadAssetKit,copyAsset,animateEngineer } from './asset-kit.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRID, SPAWNS, ZONES } from '../sim/grid.js';
import { textSprite } from './text.js';
import { radialTexture, asphaltMaps, tex } from './textures.js';

const files=['office','tower','datacenter','warehouse','telecom','soc','engineer'];
const metal=new THREE.MeshStandardMaterial({color:0x697078,metalness:.8,roughness:.3});
const concrete=new THREE.MeshStandardMaterial({color:0x30343b,roughness:.75});
const lamp=new THREE.MeshStandardMaterial({color:0xf1e2cd,emissive:0xffddad,emissiveIntensity:1.8});
const red=new THREE.MeshStandardMaterial({color:0xff3b30,emissive:0xff3b30,emissiveIntensity:1.8});
const asphalt=asphaltMaps();
const carbon=new THREE.MeshPhysicalMaterial({color:0x8b959d,roughness:.36,metalness:.15,clearcoat:1,clearcoatRoughness:.12,map:tex(asphalt.albedo,{srgb:true,repeat:15}),normalMap:tex(asphalt.normal,{repeat:15}),normalScale:new THREE.Vector2(.08,.08)});
const dummy=new THREE.Object3D();
const plane=(w,h,mat)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.rotation.x=-Math.PI/2;return m;};
function mesh(w,h,d,x,y,z,mat,group){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
export const loadCampusModels=loadAssetKit;
export class Campus {
  constructor(rig,models){
    this.rig=rig;this.models=models;this.group=new THREE.Group();rig.scene.add(this.group);
    this.atmosphere=new StormClouds(rig.scene);this.splashes=new RainSplashes(rig.scene);this.assetViews=new Map();this.people=[];this.staticGeometries=[];
    this.platform=copyAsset('platform');this.platform.position.set(14.5,0,10.5);this.platform.scale.y=1.35;this.group.add(this.platform);
    const apron=plane(200,200,new THREE.MeshBasicMaterial({color:0x10141c,fog:false}));apron.position.set(15,-2.45,10);this.group.add(apron);
    const ground=plane(31.8,23.8,wetAsphaltMaterial(carbon));ground.position.set(14.5,-.045,10.5);ground.receiveShadow=true;this.group.add(ground);
    this.reflector=new Reflector(new THREE.PlaneGeometry(31.6,23.6),{color:0x89969f,textureWidth:1024,textureHeight:768,clipBias:.004});
    this.reflector.rotation.x=-Math.PI/2;this.reflector.position.set(14.5,-.025,10.5);this.reflector.material.transparent=true;this.reflector.material.opacity=.14;this.reflector.material.depthWrite=false;
    // Tactical labels are an overlay, not physical signage mirrored in the asphalt.
    const reflect=this.reflector.onBeforeRender;
    this.reflector.onBeforeRender=function(renderer,scene,...args){
      const hidden=[];scene.traverse(o=>{if(o.visible&&(o.isSprite||o.userData.noReflection||o.material?.depthTest===false)){hidden.push(o);o.visible=false;}});
      try{reflect.call(this,renderer,scene,...args);}finally{for(const o of hidden)o.visible=true;}
    };
    this.wetGround=dressWetGround(this.reflector);
    this.group.add(this.reflector);
    const lineParts=[], curbParts=[],lightParts=[],postParts=[];
    const part=(arr,w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);arr.push(g);};
    // Boulevards use free corridors between footprints; the perimeter road surrounds the map.
    for(const x of [2.6,7,14,23,29.4]){
      part(curbParts,.055,.055,23,x,.01,10.5);
      for(let z=0;z<22;z+=1.3)part(lineParts,.035,.008,.5,x,.002,z);
    }
    for(const z of [-.7,21.7]){
      for(let x=0;x<30;x+=1.1)part(lineParts,.48,.008,.035,x,.002,z);
      part(curbParts,31,.08,.085,14.5,.02,z+(z<0?-.35:.35));
    }
    for(const z of [6.3,10.5,19.7])for(let x=0;x<3;x+=.6)part(lineParts,.25,.008,.04,x,.003,z);
    for(let x=3;x<30;x+=2.6)for(const z of [-1,22]){
      part(postParts,.035,.8,.035,x,.38,z);part(lightParts,.1,.045,.12,x,.8,z);
      const glow=plane(.75,.75,new THREE.MeshBasicMaterial({color:0xffd39c,transparent:true,opacity:.08,map:radialTexture('white','transparent'),depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.set(x,.007,z);this.group.add(glow);
    }
    for(const [arr,mat]of [[lineParts,new THREE.MeshStandardMaterial({color:0xbcc0c4,roughness:.6})],[curbParts,concrete],[postParts,metal],[lightParts,lamp]]){const m=new THREE.Mesh(mergeGeometries(arr),mat);m.castShadow=true;m.receiveShadow=true;this.group.add(m);}
    this.gates=[];
    for(const sp of SPAWNS){
      const gate=new THREE.Group();gate.position.set(-.65,0,sp.y);this.group.add(gate);
      for(const z of [-1.45,1.45]){mesh(.14,1.1,.14,0,.5,z,metal,gate);mesh(.04,.65,.06,.08,.6,z,red,gate);}
      mesh(.13,.10,3,0,1.1,0,metal,gate);
      const field=plane(2.9,3,new THREE.MeshBasicMaterial({color:0xff3b30,transparent:true,opacity:.035,depthWrite:false}));field.position.set(-.4,.005,0);gate.add(field);this.gates.push(field);
      const label=textSprite(`0${this.gates.length} / UPLINK`,{size:24,mono:true,color:'#ff8b83',scale:.55});label.position.set(-.4,.12,2);gate.add(label);
    }
    for(const z of ZONES.filter(z=>z.id!=='internet')){
      const text=textSprite(z.id==='dmz'?'01  DMZ / PUBLIC SERVICES':z.id==='internal'?'02  INTERNAL / BUSINESS':'03  CORE / CRITICAL SYSTEMS',{size:25,mono:true,color:'#c4ccd3',scale:.62});text.position.set((z.x0+z.x1)/2,.18,-1.7);this.group.add(text);
    }
    this.streetLabels=streetLabels(rig.renderer);this.group.add(this.streetLabels);
    for(const [x,color]of [[2.5,0xff6a53],[13.5,0xd1a364],[22.5,0x76a8ba]]){const seam=plane(.065,22,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.24,depthWrite:false}));seam.position.set(x,.018,10.5);this.group.add(seam);}
    this.group.add(perimeterTrees());
    // Vehicles and light traffic are part of the visible campus rather than HUD ornaments.
    this.cars=[];this.vehicleBounds=new THREE.Box3();this.vehicleCells=new Set();this.structureCells=new Set();
    for(let i=0;i<12;i++){const car=copyAsset('car');car.userData.localBounds=new THREE.Box3().setFromObject(car);car.position.set(i<4?29.4:4+(i-4)*2,0,i<4?i*5:21.1);car.rotation.y=i<4?Math.PI:Math.PI/2;car.visible=false;this.group.add(car);this.cars.push(car);}
    // Rain: one draw call, deterministic shader motion across the entire map.
    const rainPos=new Float32Array(700*6);for(let i=0;i<700;i++){const x=15+Math.sin(i*78.233)*17,y=Math.abs(Math.sin(i*12.4))*12,z=10+Math.cos(i*91.1)*12;rainPos.set([x,y,z,x-.025,y+.32,z+.02],i*6);}
    const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));rainGeo.setAttribute('end',new THREE.BufferAttribute(Float32Array.from({length:1400},(_,i)=>i%2),1));
    this.rain=new THREE.LineSegments(rainGeo,new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,vertexShader:'uniform float time;attribute float end;void main(){vec3 p=position;p.y=mod(p.y-end*.32-time*7.,12.)+end*.32;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(.55,.63,.74,.10);}'}));this.group.add(this.rain);
    const positions=new Float32Array(240*6);const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));lineGeo.setDrawRange(0,0);
    this.targets=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:0xe66059,transparent:true,opacity:.22,depthWrite:false}));this.targets.frustumCulled=false;this.group.add(this.targets);
    this.selection=plane(2.3,2.3,new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.7,depthWrite:false}));this.selection.visible=false;this.group.add(this.selection);
    this.hover=plane(.98,.98,new THREE.MeshBasicMaterial({color:0xff5a50,transparent:true,opacity:.15,depthWrite:false}));this.hover.visible=false;this.group.add(this.hover);
    this.range=plane(1,1,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.05,depthWrite:false}));this.range.visible=false;this.group.add(this.range);
    this.soc=models.soc.clone(true);this.soc.scale.setScalar(SECURITY_OPERATIONS.scale);this.soc.position.set(SECURITY_OPERATIONS.x,-.02,SECURITY_OPERATIONS.z);this.group.add(this.soc);
    const socLabel=textSprite('SECURITY OPERATIONS',{size:24,mono:true,color:'#e4e9ef',scale:.65});socLabel.position.set(19,1.65,20);this.group.add(socLabel);
    this.hq={x:19,z:20};this.signals=new CampusSignals(this.group);
  }
  rebuild(game){this.discoveredCount=[...game.assets.values()].filter(a=>a.discovered).length;if(this.landscape){this.group.remove(this.landscape);this.landscape.userData.dispose();}this.landscape=dressCampus(game);this.group.add(this.landscape);for(const v of this.assetViews.values()){this.group.remove(v.group);v.dispose();}this.assetViews.clear();this.structureCells=new Set(SECURITY_OPERATIONS_CELLS.map(([x,z])=>cellToken(x,z)));for(const a of game.assets.values()){const type=a.kind==='ot'?'warehouse':a.appliance?'telecom':a.crit===3&&!a.exposed?'datacenter':a.x>=14?'tower':'office';const v=new Building(a,this.models[type],type);this.group.add(v.group);this.assetViews.set(a.id,v);v.shape.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(v.shape);for(const [x,z]of footprintCells({minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z}))this.structureCells.add(cellToken(x,z));}}
  showRange(x,z,r){this.range.visible=true;this.range.position.set(x,.015,z);this.range.scale.set(r*2, r*2,1);}
  hideRange(){this.range.visible=false;}
  update(time,dt,game,selected,labels=true){
    this.rain.material.uniforms.time.value=time;this.atmosphere.update(time);this.wetGround.update(time);this.splashes.update(time);
    if(this.assetViews.size!==game.assets.size||this.discoveredCount!==[...game.assets.values()].filter(a=>a.discovered).length)this.rebuild(game);this.signals.update(game);
    for(let i=0;i<this.gates.length;i++)this.gates[i].material.opacity=.035+Math.sin(time*2+i)*.015;
    for(let i=0;i<4;i++){this.cars[i].position.z=((time*.3+i*5)%23)-1;}
    this.vehicleCells.clear();
    for(const car of this.cars){car.updateWorldMatrix(true,false);const b=this.vehicleBounds.copy(car.userData.localBounds).applyMatrix4(car.matrixWorld);car.visible=claimVehicleFootprint({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z},game.map,this.structureCells,this.vehicleCells);}
    for(const v of this.assetViews.values()){
      v.sync(time,selected?.id===v.asset.id,labels);
      if(v.marker.visible&&v.asset.discovered){
        // Modest, constant screen size: roof names remain legible when zoomed out.
        const camera=this.rig.camera,point=v.marker.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
        const perPixel=2*Math.max(1,-point.z)*Math.tan(camera.fov*Math.PI/360)/innerHeight;
        const {w,h}=v.marker.material.map.userData,k=perPixel*(innerWidth<760?8:10)/24;
        v.marker.scale.set(w*k,h*k,1);
      }
    }
    const a=selected?.kind==='asset'?game.asset(selected.id):null;this.selection.visible=!!a;if(a)this.selection.position.set(a.x+.5,.03,a.y+.5);
    let n=0;const pos=this.targets.geometry.attributes.position;
    for(const at of game.attackers){if(!at.intelRevealed||at.turnedAway||n>=240)continue;const target=game.asset(at.targetId);if(!target||!target.discovered)continue;pos.setXYZ(n*2,at.x,.13,at.y);pos.setXYZ(n*2+1,target.x+.5,.13,target.y+.5);n++;}this.targets.geometry.setDrawRange(0,n*2);pos.needsUpdate=true;
    const count=game.concurrency();while(this.people.length<count){const ob=this.models.engineer.clone(true);this.group.add(ob);ob.scale.setScalar(1.3);ob.position.set(18+this.people.length*.4,0,20.2);this.people.push(ob);}this.people.forEach((ob,i)=>{ob.visible=i<count;const job=game.jobs.filter(j=>j.kind!=='scan')[i],asset=job?game.asset(job.assetId):null;const target=new THREE.Vector3(asset?asset.x+.5:18+i*.4,0,asset?asset.y+1.65:20.2);const distance=ob.position.distanceTo(target);if(distance>.12){ob.position.lerp(target,Math.min(1,dt*2/Math.max(.3,distance)));ob.rotation.y=Math.atan2(target.x-ob.position.x,target.z-ob.position.z);ob.position.y=Math.abs(Math.sin(time*12+i))*.035;}else{ob.position.y=job?Math.sin(time*9)*.012:0;ob.rotation.z=job?Math.sin(time*3+i)*.035:0;}animateEngineer(ob,time+i,distance>.12,!!job);});
  }
}
class Building {
  constructor(asset,model,type){this.asset=asset;this.group=new THREE.Group();this.group.position.set(asset.x+.5,0,asset.y+.5);this.shape=model.clone(true);this.group.add(this.shape);this.materials=[];
    this.shape.traverse(o=>{if(o.isMesh){o.material=o.material.clone();this.materials.push(o.material);if(/glazing/.test(o.material.name)){o.material.color.set(0x1c3444);o.material.envMapIntensity=.7;}o.userData.color=o.material.color.clone();o.userData.emissive=o.material.emissive.clone();o.userData.intensity=o.material.emissiveIntensity;}});
    this.height={office:2.3,tower:3.7,datacenter:1.95,warehouse:1.5,telecom:2.9}[type];
    this.guard=copyAsset('edr');this.guard.position.set(.58,this.height-.35,.50);this.group.add(this.guard);
    this.lock=textSprite('🔒 ENCRYPTED',{size:24,color:'#ff796b',scale:.44,bg:'rgba(30,5,4,.92)'});this.lock.position.set(0,this.height+.80,0);this.group.add(this.lock);
    this.crown=textSprite('◆ CROWN JEWEL DOWN',{size:24,color:'#ffb18e',scale:.55,bg:'rgba(50,5,4,.94)'});this.crown.position.set(0,this.height+1.3,0);this.group.add(this.crown);
    this.repair=textSprite('ENGINEER ON SITE',{size:20,color:'#a9efd4',scale:.6,bg:'rgba(4,24,18,.85)'});this.repair.position.set(0,this.height+.80,0);this.group.add(this.repair);
    const ringGeo=new THREE.RingGeometry(1.12,1.145,48);this.ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xf7b86e,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.024;this.group.add(this.ring);
    this.marker=textSprite(asset.discovered?asset.name:'UNLISTED SYSTEM',{size:24,color:asset.discovered?'#edf0f3':'#8e959e',scale:.32,bg:'rgba(12,16,20,0.75)'});this.marker.position.set(0,this.height+.35,0);this.group.add(this.marker);
    this.label=this.marker;this.discovered=asset.discovered;
    const smokeGeo=new THREE.BufferGeometry(),smokePos=new Float32Array(22*3);for(let i=0;i<22;i++){smokePos[i*3]=Math.sin(i)*.3;smokePos[i*3+1]=i/8;smokePos[i*3+2]=Math.cos(i)*.3;}smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokePos,3));
    this.smoke=new THREE.Points(smokeGeo,new THREE.PointsMaterial({color:0x424047,size:.8,map:radialTexture('rgba(100,100,100,1)','transparent'),transparent:true,opacity:.4,depthWrite:false}));this.smoke.position.y=.8;this.smoke.visible=false;this.group.add(this.smoke);this.flash=0;
  }
  hit(strength){this.flash=strength;}
  sync(t,selected,labels){const a=this.asset;this.group.visible=!!a.discovered;if(!a.discovered)return;this.guard.visible=!!a.edr;this.guard.rotation.y=t*.35;this.lock.visible=!!a.locked;this.crown.visible=a.crit===3&&(a.locked||a.quarantined||['compromised','responding','down'].includes(a.state));this.repair.visible=!!a.job&&!a.locked;const known=a.knownVulns?.size>0;this.marker.visible=labels||selected||a.state==='compromised';
    if(this.discovered!==a.discovered){this.discovered=a.discovered;this.group.remove(this.marker);this.marker.material.map.dispose();this.marker.material.dispose();this.marker=textSprite(a.name,{size:24,color:'#edf0f3',scale:.32,bg:'rgba(12,16,20,.75)'});this.marker.position.set(0,this.height+.35,0);this.group.add(this.marker);}
    const state=!a.discovered?'unknown':a.locked?'locked':a.quarantined?'isolated':a.state;
    this.flash=Math.max(0,this.flash-.035);
    if(this.lastState!==state||this.flash>0||this.wasFlashing){this.lastState=state;this.wasFlashing=this.flash>0;this.shape.traverse(o=>{if(!o.isMesh)return;o.material.color.copy(o.userData.color);o.material.emissive.copy(o.userData.emissive);o.material.emissiveIntensity=o.userData.intensity;
      if(state==='unknown'||state==='isolated'){o.material.color.multiplyScalar(state==='unknown'?.16:.38);o.material.emissiveIntensity=0;}
      if(['compromised','locked'].includes(state)||this.flash>0){o.material.emissive.set(0xd42c1e);o.material.emissiveIntensity=this.flash>0?.4:state==='locked'?0:.14;if(state==='locked')o.material.color.multiplyScalar(.25);}
    });}
    this.ring.visible=selected||known||a.state!=='ok'||!a.discovered;this.ring.material.color.set(['compromised','locked','down'].includes(state)?0xff3b30:state==='isolated'?0x8facbd:a.job?0xffc571:selected?0xffffff:0xd8a969);this.ring.scale.setScalar(1+(selected||a.job?Math.sin(t*3)*.035:0));this.smoke.visible=['compromised','locked'].includes(state);if(this.smoke.visible){this.smoke.rotation.y=t*.12;this.smoke.position.y=1+Math.sin(t*.8)*.15;}
  }
  dispose(){this.materials.forEach(m=>m.dispose());this.ring.geometry.dispose();this.ring.material.dispose();this.marker.material.map?.dispose();this.marker.material.dispose();for(const v of [this.lock,this.repair,this.crown]){v.material.map?.dispose();v.material.dispose();}this.guard.traverse(o=>o.isMesh&&o.material.dispose());this.smoke.geometry.dispose();this.smoke.material.map?.dispose();this.smoke.material.dispose();}
}
