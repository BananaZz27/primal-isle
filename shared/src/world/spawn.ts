import { TILE_SIZE } from "../constants";
import { isWalkable, tileAt, type WorldMap } from "./tiles";

/** ผู้เล่นแต่ละคนเกิดห่างกันกี่ "ลำดับช่อง" ในเส้นก้นหอย */
const SPACING = 3;

/**
 * หาจุดเกิดของผู้เล่นคนที่ index (0, 1, 2, …)
 * ค้นช่องที่เดินได้แบบวนก้นหอย (spiral) จากกลางเกาะออกไป แล้วเลือกช่องที่ index × SPACING
 * คืนค่าเป็นพิกเซลที่กลางช่อง
 */
export function findSpawn(map: WorldMap, index: number): { x: number; y: number } {
  const wanted = index * SPACING;
  const c = Math.floor(map.size / 2);
  let found = 0;

  // วนก้นหอยแบบสี่เหลี่ยม: ขยับ 1,1,2,2,3,3,… ช่อง สลับทิศ ขวา→ลง→ซ้าย→ขึ้น
  let x = c;
  let y = c;
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const visit = (): boolean => {
    if (isWalkable(tileAt(map, x, y))) {
      if (found === wanted) return true;
      found++;
    }
    return false;
  };

  if (visit()) return toPixel(x, y);
  for (let leg = 0; leg < map.size * 2; leg++) {
    const [dx, dy] = dirs[leg % 4];
    const steps = Math.floor(leg / 2) + 1;
    for (let s = 0; s < steps; s++) {
      x += dx;
      y += dy;
      if (visit()) return toPixel(x, y);
    }
  }
  throw new Error(`no walkable spawn for player ${index} (seed ${map.seed})`);
}

function toPixel(tx: number, ty: number) {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}
