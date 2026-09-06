import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {StormClouds} from '../src/render/storm-clouds.js';
import {RainSplashes} from '../src/render/rain-splashes.js';
import {dressWetGround} from '../src/render/wet-ground.js';
import {STORM_LOOK} from '../src/render/storm-look.js';
const names=['office','tower','datacenter','warehouse','telecom','soc','engineer','car','ndr','ips','waf','wall','honeytoken','edr','virus','beetle','worm','boss','platform','aithreat'];
const glb=(v,n)=>{const b=readFileSync(new URL(`../public/models/${v}/${n}.glb`,import.meta.url));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));};
const bounds=g=>{const accessors=g.meshes.flatMap(m=>m.primitives.map(p=>g.accessors[p.attributes.POSITION]));return [0,1,2].flatMap(i=>[Math.min(...accessors.map(a=>a.min[i])),Math.max(...accessors.map(a=>a.max[i]))]);};
it.each(names)('%s storm export preserves mesh bounds, articulation names and valid normals',name=>{
 const old=glb('v9',name),g=glb('v21',name);
 expect(g.nodes.some(n=>new RegExp(`^CISO_${name}(?:[._]?\\d+)?$`).test(n.name))).toBe(true);
 const oldParts=old.nodes.filter(n=>n.mesh!=null).map(n=>n.name.replace(/\.\d+$/,''));
 const newParts=g.nodes.filter(n=>n.mesh!=null).map(n=>n.name.replace(/\.\d+$/,''));expect(newParts.sort()).toEqual(oldParts.sort());
 for(const m of g.meshes)for(const p of m.primitives)expect(p.attributes.NORMAL).toBeDefined();
 bounds(g).forEach((v,i)=>expect(v).toBeCloseTo(bounds(old)[i],4));
});
it('clouds use a fixed pool, stay outside the play area, and animate without sim writes',()=>{
 const s=new THREE.Scene(),c=new StormClouds(s);expect(c.mist.count).toBe(48);expect(c.mist.material.depthWrite).toBe(false);
 expect(c.mist.userData.noReflection).toBe(true);expect(c.mist.material.fragmentShader).toContain('outside');
 c.update(12);expect(c.mist.material.uniforms.time.value).toBe(12);c.configure({cloudOpacity:.4});expect(c.mist.material.uniforms.opacity.value).toBe(.4);
});
it('rain rings are pooled, depth tested, and excluded from reflections',()=>{
 const r=new RainSplashes(new THREE.Scene());expect(r.mesh.count).toBe(220);expect(r.mesh.material.depthTest).toBe(true);expect(r.mesh.userData.noReflection).toBe(true);r.update(2);expect(r.mesh.material.uniforms.time.value).toBe(2);
});
it('wet reflection shader has animated distortion, broad pools and a configurable fixed look',()=>{
 const r=new Reflector(new THREE.PlaneGeometry(32,24)),w=dressWetGround(r);w.update(5);w.configure({reflection:.6});
 expect(r.material.uniforms.stormTime.value).toBe(5);expect(r.material.uniforms.reflection.value).toBe(.6);
 for(const text of ['float wet=','float fresnel=','vec4 projected=','float ring='])expect(r.material.fragmentShader).toContain(text);
 expect(r.material.depthWrite).toBe(false);r.dispose();
});
it('production loads the revised kit and keeps the vignette black, not gray',()=>{
 expect(readFileSync(new URL('../src/render/asset-kit.js',import.meta.url),'utf8')).toContain('models/v21/');
 expect(readFileSync(new URL('../src/render/storm-look.js',import.meta.url),'utf8')).toContain('darkness.value=1.0');
 expect(STORM_LOOK.wetCoverage).toBeGreaterThan(.6);expect(STORM_LOOK.reflection).toBeLessThan(.8);
});
