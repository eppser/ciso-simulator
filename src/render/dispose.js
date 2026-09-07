// copyAsset/Building clones own materials but share the authored geometry and
// texture resources. Retiring a placed control must not destroy that shared kit.
export function disposeClonedMaterials(root){
 const materials=new Set();root.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
 for(const material of materials)material.dispose();
}
