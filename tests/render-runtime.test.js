import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {ReflectionMaterials} from '../src/render/reflection-materials.js';
import {RenderCadence} from '../src/render/cadence.js';
import {updateInstances,updateVertices} from '../src/render/buffers.js';
import {disposeClonedMaterials} from '../src/render/dispose.js';
import {AttackerLayer} from '../src/render/creatures-v2.js';
it('reflection materials keep independent renderer identity and identical visual values',()=>{
 const cache=new ReflectionMaterials(),m=new THREE.MeshStandardMaterial({color:0x123456,emissive:0xff2200,emissiveIntensity:.2,opacity:.7}),texture=new THREE.Texture();m.map=texture;
 const r=cache.get(m);expect(r).not.toBe(m);expect(r.id).not.toBe(m.id);expect(r.uuid).not.toBe(m.uuid);expect(r.map).toBe(texture);expect(r.color).toBe(m.color);
 m.color.set(0xabcdef);m.opacity=.3;m.emissiveIntensity=.8;m.needsUpdate=true;
 expect(cache.get(m)).toBe(r);expect(r.opacity).toBe(.3);expect(r.emissiveIntensity).toBe(.8);expect(r.version).toBe(m.version);expect(r.color.getHex()).toBe(0xabcdef);
});
it('reflection disposal releases its own material, never shared textures',()=>{
 const cache=new ReflectionMaterials(),m=new THREE.MeshStandardMaterial(),texture=new THREE.Texture();m.map=texture;const r=cache.get(m),disposed=vi.fn(),texDisposed=vi.fn();r.addEventListener('dispose',disposed);texture.addEventListener('dispose',texDisposed);
 m.dispose();expect(disposed).toHaveBeenCalledOnce();expect(texDisposed).not.toHaveBeenCalled();expect(cache.get(m)).not.toBe(r);
});
it('reflection swapping is reversible for individual and multi-material objects',()=>{
 const c=new ReflectionMaterials(),a=new THREE.MeshBasicMaterial(),b=new THREE.MeshStandardMaterial(),mesh={material:[a,b]},original=mesh.material;
 c.swap(mesh);expect(mesh.material[0]).not.toBe(a);c.restore();expect(mesh.material).toBe(original);expect(c.swapped).toHaveLength(0);c.enabled=false;c.swap(mesh);expect(mesh.material).toBe(original);
});
it.each([60,120,144,240])('renders sixty frames per second on a %i Hz callback clock',hz=>{
 const c=new RenderCadence();let count=0;for(let i=0;i<hz*10;i++)if(c.shouldRender(i*1000/hz))count++;expect(count).toBeGreaterThanOrEqual(599);expect(count).toBeLessThanOrEqual(601);
});
it('hidden presentation stays off and resumes immediately without accumulated render debt',()=>{const c=new RenderCadence();expect(c.shouldRender(0)).toBe(true);expect(c.shouldRender(10,true)).toBe(false);expect(c.shouldRender(60000,true)).toBe(false);expect(c.shouldRender(60001)).toBe(true);expect(c.shouldRender(60002)).toBe(false);});
it('fixed GPU pools upload only active instances and disappear at zero without disposal',()=>{
 const m=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),600);m.setColorAt(0,new THREE.Color('red'));updateInstances(m,5);expect(m.visible).toBe(true);expect(m.instanceMatrix.updateRanges).toEqual([{start:0,count:80}]);expect(m.instanceColor.updateRanges).toEqual([{start:0,count:15}]);const version=m.instanceMatrix.version;updateInstances(m,0);expect(m.visible).toBe(false);expect(m.instanceMatrix.version).toBe(version);updateInstances(m,2);expect(m.count).toBe(2);expect(m.visible).toBe(true);expect(m.instanceMatrix.updateRanges).toEqual([{start:0,count:32}]);
 const a=new THREE.BufferAttribute(new Float32Array(600),3);updateVertices(a,4);expect(a.updateRanges).toEqual([{start:0,count:12}]);
});
it('retired controls release cloned materials once without disposing shared meshes or maps',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(),m=new THREE.MeshStandardMaterial(),t=new THREE.Texture();m.map=t;root.add(new THREE.Mesh(g,m),new THREE.Mesh(g,m));const dispose=vi.spyOn(m,'dispose'),geometry=vi.spyOn(g,'dispose'),texture=vi.spyOn(t,'dispose');disposeClonedMaterials(root);expect(dispose).toHaveBeenCalledOnce();expect(geometry).not.toHaveBeenCalled();expect(texture).not.toHaveBeenCalled();
});
it.each(['virus','beetle','worm','boss','aithreat'])('%s keeps the exact articulated and static part matrices',type=>{
 const names=['virus','beetle','worm','boss','aithreat'],parts=['body','leg0L','leg1R','segment2','orbit0','nucleus'];
 const models=Object.fromEntries(names.map(name=>{const g=new THREE.Group();for(const part of parts){const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());m.name=part;g.add(m);}return[name,g];}));
 const layer=new AttackerLayer(new THREE.Scene(),models),a={id:3,alive:true,x:3,y:4,nx:4,ny:5,hp:8,maxHp:10,revealed:true,aiThreat:type==='aithreat',boss:['boss','aithreat'].includes(type),kind:type==='worm'?'lateral':'scan',avatar:type};
 layer.sync({attackers:[a],time:2},2,new THREE.Quaternion());
 const clock=2*8+3*1.37,floating=['virus','boss','aithreat'].includes(type),scale=a.boss?1.8:a.kind==='lateral'?.85:.78,root=new THREE.Object3D();
 root.position.set(3,.015+(floating?Math.sin(clock*.35)*.035:0),4);root.rotation.set(floating?Math.sin(clock*.17)*.08:0,Math.PI/4+(floating?clock*.075:0),0);root.scale.setScalar(scale);root.updateMatrix();
 for(const {part,mesh}of layer.pools[type]){const d=new THREE.Object3D(),leg=/leg(\d)([LR])/.exec(part),segment=/segment(\d)/.exec(part);
  if(leg){const phase=clock+Number(leg[1])*Math.PI*.82+(leg[2]==='L'?0:Math.PI),side=leg[2]==='L'?-1:1;d.rotation.y=Math.sin(phase)*.15;d.rotation.z=Math.max(0,Math.sin(phase))*.22*side;d.position.y=Math.max(0,Math.sin(phase))*.025;}
  if(part.startsWith('orbit'))d.rotation.y=clock*(part.includes('0')?.11:-.08);
  if(part.startsWith('nucleus'))d.scale.setScalar(1+Math.sin(clock*.6)*.06);
  if(segment){const phase=clock*.8-Number(segment[1])*.65;d.position.x=Math.sin(phase)*.055;d.rotation.y=Math.cos(phase)*.09;}
  d.updateMatrix();const expected=new Float32Array(new THREE.Matrix4().multiplyMatrices(root.matrix,d.matrix).elements);expect(mesh.instanceMatrix.array.slice(0,16)).toEqual(expected);
 }
 for(const name of names.filter(n=>n!==type))for(const {mesh}of layer.pools[name])expect(mesh.visible).toBe(false);
});
