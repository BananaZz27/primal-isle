import { Tile, type WorldMap } from "../src/index";

const LEGEND: Record<string, Tile> = {
  "~": Tile.Water,
  s: Tile.Sand,
  ".": Tile.Grass,
  f: Tile.Forest,
};

/**
 * สร้างแผนที่เล็กๆ จากข้อความ สำหรับใช้ในเทสต์
 * `~` = น้ำ, `s` = ทราย, `.` = หญ้า, `f` = ป่า
 */
export function makeMap(rows: string[]): WorldMap {
  const size = rows.length;
  const tiles = new Uint8Array(size * size).fill(Tile.Water);
  rows.forEach((row, ty) => {
    Array.from(row).forEach((ch, tx) => {
      const tile = LEGEND[ch];
      if (tile === undefined) throw new Error(`unknown map char "${ch}"`);
      tiles[ty * size + tx] = tile;
    });
  });
  return { seed: 0, size, tiles };
}
