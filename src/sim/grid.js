// The map: a cell grid the attackers cross. Assets, towers and walls block cells; every
// attacker follows a flow field (BFS distance from its target) so path-finding is one
// breadth-first search per target, recomputed only when the map changes.

export const GRID = { w: 30, h: 22 };
// Each uplink is a three-row gate; attackers enter on any row of it. Nothing can be built on
// x <= NO_BUILD_X (the internet and the demarcation), so a chokepoint has to be built with
// segments inside the perimeter rather than stacked on the portal.
export const SPAWNS = [
  { id: 'A', name: 'Uplink A', x: 0, y: 4, rows: [3, 4, 5] },
  { id: 'B', name: 'Uplink B', x: 0, y: 11, rows: [10, 11, 12] },
  { id: 'C', name: 'Uplink C', x: 0, y: 18, rows: [17, 18, 19] },
];
export const NO_BUILD_X = 3;
export const ZONES = [
  { id: 'internet', name: 'Internet', x0: 0, x1: 2 },
  { id: 'dmz', name: 'Perimeter / DMZ', x0: 3, x1: 13 },
  { id: 'internal', name: 'Internal network', x0: 14, x1: 22 },
  { id: 'core', name: 'Core systems', x0: 23, x1: 29 },
];

export const key = (x, y) => y * GRID.w + x;
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < GRID.w && y < GRID.h;

export function assetCells(asset) {
  return [[asset.x, asset.y], [asset.x + 1, asset.y], [asset.x, asset.y + 1], [asset.x + 1, asset.y + 1]];
}

// Cells adjacent to a 2x2 footprint (the "doors"): reaching any of them is reaching the asset.
export function assetDoors(asset, blocked) {
  const doors = [];
  for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) {
    const inside = dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1;
    if (inside) continue;
    const x = asset.x + dx, y = asset.y + dy;
    if (!inBounds(x, y)) continue;
    if (blocked && blocked[key(x, y)]) continue;
    doors.push([x, y]);
  }
  return doors;
}

export class GridMap {
  constructor() {
    this.blocked = new Uint8Array(GRID.w * GRID.h); // 0 free, 1 asset, 2 tower, 3 wall
    this.fields = new Map();                          // targetId -> Int32Array distances (-1 unreachable)
    this.revision = 0;
  }
  block(x, y, kind) { this.blocked[key(x, y)] = kind; this.fields.clear(); this.revision++; }
  free(x, y) { this.blocked[key(x, y)] = 0; this.fields.clear(); this.revision++; }
  isFree(x, y) { return inBounds(x, y) && this.blocked[key(x, y)] === 0; }

  // BFS from the target's door cells outward over free cells (4-neighbour).
  field(targetId, doors) {
    let f = this.fields.get(targetId);
    if (f) return f;
    f = new Int32Array(GRID.w * GRID.h).fill(-1);
    const q = [];
    for (const [x, y] of doors) { if (this.isFree(x, y)) { f[key(x, y)] = 0; q.push(x, y); } }
    let head = 0;
    while (head < q.length) {
      const x = q[head++], y = q[head++];
      const d = f[key(x, y)] + 1;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (!this.isFree(nx, ny)) continue;
        const k = key(nx, ny);
        if (f[k] !== -1) continue;
        f[k] = d; q.push(nx, ny);
      }
    }
    this.fields.set(targetId, f);
    return f;
  }

  // Next step for something standing on (x,y) heading to target: the free neighbour with the
  // lowest distance. Returns null at distance 0 (arrived) or when nothing is reachable.
  step(field, x, y) {
    const here = field[key(x, y)];
    if (here <= 0) return null;
    let best = null, bd = here;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!inBounds(nx, ny)) continue;
      const d = field[key(nx, ny)];
      if (d >= 0 && d < bd) { bd = d; best = [nx, ny]; }
    }
    return best;
  }

  reachable(field, x, y) { return inBounds(x, y) && field[key(x, y)] >= 0; }
}
