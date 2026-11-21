import { createNoise2D } from "simplex-noise";
import { WORLD_SIZE } from "../constants";
import { mulberry32 } from "./rng";
import { Tile, type WorldMap } from "./tiles";

/** ขอบแผนที่กี่ช่องที่บังคับเป็นทะเล (ให้เป็นเกาะเสมอ) */
const BORDER = 2;

/** เกณฑ์ความสูง: ต่ำกว่า WATER = น้ำ, ต่ำกว่า SAND = หาดทราย, สูงกว่า FOREST = ป่า */
const WATER_LEVEL = 0.0;
const SAND_LEVEL = 0.07;
const FOREST_LEVEL = 0.62;

/**
 * สร้างเกาะจาก seed
 * ความสูง = noise สองชั้น (รูปทรงใหญ่ + รายละเอียด) − ความลาดลงทะเลตามระยะห่างจากกลางเกาะ
 */
export function generateWorld(seed: number, size: number = WORLD_SIZE): WorldMap {
  const rand = mulberry32(seed);
  const shapeNoise = createNoise2D(rand);
  const detailNoise = createNoise2D(rand);
  const forestNoise = createNoise2D(rand);

  const tiles = new Uint8Array(size * size);
  const centre = (size - 1) / 2;

  for (let ty = 0; ty < size; ty++) {
    for (let tx = 0; tx < size; tx++) {
      const i = ty * size + tx;

      if (tx < BORDER || ty < BORDER || tx >= size - BORDER || ty >= size - BORDER) {
        tiles[i] = Tile.Water;
        continue;
      }

      // ระยะจากกลางเกาะ 0 (กลาง) → 1 (ขอบ)
      const dx = (tx - centre) / centre;
      const dy = (ty - centre) / centre;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const nx = tx / size;
      const ny = ty / size;
      const noise = 0.65 * shapeNoise(nx * 3, ny * 3) + 0.35 * detailNoise(nx * 9, ny * 9);
      const height = 0.6 + 0.4 * noise - 1.0 * dist * dist;

      if (height < WATER_LEVEL) tiles[i] = Tile.Water;
      else if (height < SAND_LEVEL) tiles[i] = Tile.Sand;
      else if (height > FOREST_LEVEL || forestNoise(nx * 6, ny * 6) > 0.3) tiles[i] = Tile.Forest;
      else tiles[i] = Tile.Grass;
    }
  }

  return { seed: seed >>> 0, size, tiles };
}
