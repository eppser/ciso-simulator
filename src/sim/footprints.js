import {inBounds,key} from './grid.js';
// Grid cells are centered on integers. Touching edges do not share a tile.
export function footprintCells({minX,maxX,minZ,maxZ}){
 const cells=[],epsilon=1e-5;
 for(let x=Math.floor(minX+.5+epsilon);x<Math.ceil(maxX+.5-epsilon);x++)
  for(let z=Math.floor(minZ+.5+epsilon);z<Math.ceil(maxZ+.5-epsilon);z++)cells.push([x,z]);
 return cells;
}
// Authored SOC envelope at scale 1.5, shared by simulation and visual placement.
export const SECURITY_OPERATIONS={x:19,z:20,scale:1.5,minX:17.5,maxX:20.5,minZ:18.53,maxZ:21.605};
export const SECURITY_OPERATIONS_CELLS=footprintCells(SECURITY_OPERATIONS);
export const cellToken=(x,z)=>`${x},${z}`;

// Vehicles are decoration: structures win occupancy; building on a vehicle removes it.
export function claimVehicleFootprint(bounds,map,structures,vehicles){
 const cells=footprintCells(bounds);
 if(cells.some(([x,z])=>structures.has(cellToken(x,z))||vehicles.has(cellToken(x,z))||(inBounds(x,z)&&map.blocked[key(x,z)]!==0)))return false;
 for(const [x,z]of cells)vehicles.add(cellToken(x,z));
 return true;
}
