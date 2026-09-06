import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Biological silhouettes, instanced by the regular attacker renderer. No plated shell.
export async function organicThreats(){
 const skin=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}concepts/v8/organic-membrane.png`);skin.colorSpace=THREE.SRGBColorSpace;skin.wrapS=skin.wrapT=THREE.RepeatWrapping;skin.anisotropy=4;
 const material=color=>new THREE.MeshPhysicalMaterial({color,map:skin,bumpMap:skin,bumpScale:.038,metalness:0,roughness:.4,clearcoat:.6,clearcoatRoughness:.22,emissive:color,emissiveIntensity:.055});
 const red=material(0xc7352c),green=material(0x78bd34),dark=material(0x691c28),lime=material(0xb6d646);
 const sphere=(r,x,y,z,sx=1,sy=1,sz=1)=>new THREE.SphereGeometry(r,18,12).scale(sx,sy,sz).translate(x,y,z);
 function virus(ai=false){const root=new THREE.Group(),parts=[sphere(.36,0,.73,0,1,ai?1.15:1,1)],tips=[];
  for(let i=0;i<34;i++){const y=1-2*(i+.5)/34,r=Math.sqrt(1-y*y),theta=i*2.39996,dir=new THREE.Vector3(Math.cos(theta)*r,y,Math.sin(theta)*r),start=dir.clone().multiplyScalar(.28).add(new THREE.Vector3(0,.73,0)),end=dir.clone().multiplyScalar(.53+.08*Math.sin(i*4)).add(new THREE.Vector3(0,.73,0));
   const mid=start.clone().lerp(end,.5).add(new THREE.Vector3(Math.sin(i)*.055,0,Math.cos(i)*.055));parts.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start,mid,end),5,.026,5,false));tips.push(sphere(.055,end.x,end.y,end.z));
  }
  const body=new THREE.Mesh(mergeGeometries(parts),ai?green:red);body.name='nucleus_membrane';root.add(body);
  const caps=new THREE.Mesh(mergeGeometries(tips),ai?red:lime);caps.name='organic_spores';root.add(caps);
  parts.forEach(g=>g.dispose());tips.forEach(g=>g.dispose());return root;
 }
 const worm=new THREE.Group();for(let i=0;i<8;i++){const geo=sphere(.19,0,.22,-.6+i*.16,1,1,1.15);const m=new THREE.Mesh(geo,i%3===0?dark:green);m.name='segment'+i;worm.add(m);}
 return {virus:virus(),worm,aithreat:virus(true)};
}
