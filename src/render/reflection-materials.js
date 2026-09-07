// Three keeps light/program state on each material. Alternating the main camera
// and Reflector camera thrashes that state on every draw. Give the reflection its
// own material state, while sharing exactly the same textures/uniform values.
// Shader programs still share Three's program cache; this adds no render pass.
const IDENTITY=new Set(['uuid','_listeners']);
export class ReflectionMaterials{
 constructor(){this.cache=new WeakMap();this.enabled=true;this.swapped=[];this.generation=0;}
 begin(){this.generation++;}
 get(source){
  let entry=this.cache.get(source);
  if(!entry){
   const material=source.clone();entry={material};this.cache.set(source,entry);
   const release=()=>{material.dispose();this.cache.delete(source);source.removeEventListener('dispose',release);};
   source.addEventListener('dispose',release);
  }
  // Color/vector/texture references are intentionally shared; primitive changes
  // (opacity, emissive intensity, version, etc.) must also reach this view.
  if(!this.generation||entry.generation!==this.generation){for(const key of Object.keys(source))if(!IDENTITY.has(key))entry.material[key]=source[key];entry.generation=this.generation;}
  return entry.material;
 }
 swap(object){if(!this.enabled||!object.material)return;const original=object.material;this.swapped.push([object,original]);object.material=Array.isArray(original)?original.map(m=>this.get(m)):this.get(original);}
 restore(){for(const [object,material]of this.swapped)object.material=material;this.swapped.length=0;}
}
