import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const names=['office','tower','datacenter','warehouse','telecom','soc','engineer','car','ndr','ips','waf','wall','honeytoken','edr','virus','beetle','worm','boss','platform','aithreat'];
const glb=name=>{const b=readFileSync(new URL(`../public/models/v9/${name}.glb`,import.meta.url));expect(b.readUInt32LE(0)).toBe(0x46546c67);expect(b.readUInt32LE(4)).toBe(2);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());};
describe('cinematic Blender asset contract',()=>{
 it.each(names)('%s has a named authored root and valid render primitives',name=>{
  const g=glb(name),root=g.nodes.find(n=>new RegExp(`^CISO_${name}(?:[._]?\\d+)?$`).test(n.name));
  expect(root).toBeDefined();expect(root.children.length).toBeGreaterThan(0);
  for(const id of root.children){const mesh=g.meshes[g.nodes[id].mesh];expect(mesh).toBeDefined();for(const p of mesh.primitives){expect(g.accessors[p.attributes.POSITION].count).toBeGreaterThan(0);expect(p.attributes.NORMAL).toBeDefined();expect(g.materials[p.material]).toBeDefined();}}
 });
 it('keeps IPS armor and barrels in the articulated head group',()=>{const g=glb('ips');expect(g.nodes.filter(n=>/^head_/.test(n.name)).length).toBeGreaterThan(5);expect(g.materials.some(m=>m.name.includes('ceramic_armor'))).toBe(true);expect(g.materials.some(m=>m.name.includes('machined_titanium'))).toBe(true);});
 it('keeps nine organic worm segments available to the movement renderer',()=>{const g=glb('worm');for(let i=0;i<9;i++)expect(g.nodes.some(n=>n.name.startsWith('segment'+i+'_'))).toBe(true);});
 it.each(['virus','worm','aithreat'])('%s uses nonmetallic organic tissue',name=>{const g=glb(name);expect(g.materials.every(m=>m.name.includes('organic_')&&(m.pbrMetallicRoughness?.metallicFactor??1)===0)).toBe(true);});
});
