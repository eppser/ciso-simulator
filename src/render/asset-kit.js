import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { asphaltMaps,concreteMaps,brushedMaps,tex } from './textures.js';
const names=['office','tower','datacenter','warehouse','telecom','soc','engineer','car','ndr','ips','waf','wall','honeytoken','edr','virus','beetle','worm','boss','platform','aithreat'];
export const kit={};
export async function loadAssetKit(){
 const loader=new GLTFLoader(),maps=asphaltMaps(),detail=tex(maps.normal,{repeat:3}),concrete=concreteMaps(),brushed=brushedMaps();
 const concreteColor=tex(concrete.albedo,{srgb:true,repeat:2}),steelColor=tex(brushed.albedo,{srgb:true,repeat:3}),steelRough=tex(brushed.rough,{repeat:3});
 const graphite=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}concepts/v2/graphite-surface.png`);graphite.colorSpace=THREE.SRGBColorSpace;graphite.wrapS=graphite.wrapT=THREE.RepeatWrapping;graphite.repeat.set(2,2);graphite.anisotropy=8;
 const titanium=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}concepts/v9/titanium.png`);titanium.colorSpace=THREE.SRGBColorSpace;titanium.wrapS=titanium.wrapT=THREE.RepeatWrapping;titanium.repeat.set(2,2);titanium.anisotropy=8;
 const skin=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}concepts/v8/organic-membrane.png`);skin.colorSpace=THREE.SRGBColorSpace;skin.wrapS=skin.wrapT=THREE.RepeatWrapping;skin.anisotropy=8;
 await Promise.all(names.map(async name=>{
  const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/v21/${name}.glb`);gltf.scene.updateMatrixWorld(true);
  // Blender suffixes names when a preserved workshop already contains the asset.
  const authored=gltf.scene.children.find(o=>new RegExp(`^CISO_${name}(?:[._]?\\d+)?$`).test(o.name));if(!authored)throw new Error(`Missing authored asset: ${name}`);
  const root=new THREE.Group();root.name=name;
  authored.traverse(o=>{if(!o.isMesh)return;
   const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);let m=o.material.clone();
   if(/viral_ruby|automotive_clearcoat/.test(m.name)){const physical=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(physical,m);m.dispose();m=physical;m.clearcoat=1;m.clearcoatRoughness=.12;}
   const pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=new Float32Array(pos.count*2);
   for(let i=0;i<pos.count;i++){const ny=Math.abs(norm.getY(i)),nx=Math.abs(norm.getX(i));uv[i*2]=ny>.7?pos.getX(i):nx>.7?pos.getZ(i):pos.getX(i);uv[i*2+1]=ny>.7?pos.getZ(i):pos.getY(i);}geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
   if(/concrete|graphite|steel|chitin|core/.test(m.name)){m.normalMap=detail;m.normalScale=new THREE.Vector2(/concrete/.test(m.name)?.14:.045,/concrete/.test(m.name)?.14:.045);}
   m.envMapIntensity=.85;
   if(/viral_/.test(m.name)){m.normalMap=detail;m.normalScale=new THREE.Vector2(.07,.07);m.envMapIntensity=1.6;if(/ruby/.test(m.name)){m.roughness=.17;m.metalness=.6;m.emissiveIntensity=.025;}}
   if(/rubber|technical_fabric/.test(m.name))m.roughness=.88;
   if(/cast_concrete/.test(m.name)){m.map=concreteColor;m.roughness=.53;}
   if(/satin_steel|machined_titanium/.test(m.name)){m.map=titanium;m.roughnessMap=steelRough;m.envMapIntensity=1.25;m.normalScale=new THREE.Vector2(.015,.015);}
   if(/occupied_interior/.test(m.name)&&!/unoccupied/.test(m.name))m.emissiveIntensity=.58;
   if(/graphite_panels/.test(m.name)){m.map=graphite;m.color.setRGB(.46,.51,.56);m.normalMap=null;m.bumpMap=graphite;m.bumpScale=.006;m.roughness=.39;}
   if(/obsidian_chitin/.test(m.name)){m.map=skin;m.bumpMap=skin;m.bumpScale=.016;m.normalMap=null;m.metalness=.05;m.roughness=.25;m.envMapIntensity=1.2;}
   if(/curtain_glass/.test(m.name)){m.depthWrite=false;m.side=THREE.FrontSide;m.opacity=.52;m.envMapIntensity=1.35;m.roughness=.13;}
   if(/organic_/.test(m.name)){m.map=skin;m.bumpMap=skin;m.bumpScale=.022;m.metalness=0;m.roughness=.29;m.envMapIntensity=1.25;if(m.isMeshPhysicalMaterial){m.clearcoat=.55;m.clearcoatRoughness=.16;}}
   if(name==='ips'&&/graphite/.test(m.name)){m.color.setRGB(.67,.71,.75);m.roughness=.34;}
   const mesh=new THREE.Mesh(geometry,m);mesh.name=o.name;mesh.castShadow=!m.transparent;mesh.receiveShadow=true;root.add(mesh);
  });kit[name]=root;
 }));return kit;
}
export function copyAsset(name){const root=kit[name].clone(true);root.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});return root;}
export function animateEngineer(root,time,moving,working){
 root.traverse(o=>{if(!o.isMesh)return;const leg=/leg([LR])/.exec(o.name),arm=/arm([LR])/.exec(o.name);if(!leg&&!arm)return;
  const side=(leg||arm)[1]==='L'?1:-1;
  // Rotate around the hip/shoulder, keeping contact with the torso.
  const pivot=leg?.30:.48,angle=moving?Math.sin(time*10)*side*(leg?.45:.14):working&&arm?Math.sin(time*5)*.055:0;
  o.rotation.x=angle;o.position.y=pivot*(1-Math.cos(angle));o.position.z=-pivot*Math.sin(angle);
 });
}
