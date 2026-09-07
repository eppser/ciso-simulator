// Keep fixed-capacity GPU pools, but upload only live instances and omit empty
// draws. The geometry, capacity, materials and visible instance matrices stay intact.
export function updateInstances(mesh,count){
 mesh.count=count;mesh.visible=count>0;
 if(!count)return;
 mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,count*3);mesh.instanceColor.needsUpdate=true;}
}
export function updateVertices(attribute,count){
 if(!count)return;attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*attribute.itemSize);attribute.needsUpdate=true;
}
