import { MAX_DECOR, MAX_PLAYERS, TILE_SIZE } from "../constants";
import { mulberry32 } from "./rng";
import { findSpawn } from "./spawn";
import { Tile, tileAt, type WorldMap } from "./tiles";

/** ชนิดของตกแต่งบนเกาะ (ขั้นที่ 3 ต้นไม้จะกลายเป็นของที่ตัดได้) */
export enum DecorKind {
  Tree = 0,
  Flower = 1,
  Tuft = 2,
  Pebble = 3,
  /** พุ่มไม้ผลไม้ (ขั้นที่ 3) */
  Bush = 4,
}

export interface Decor {
  kind: DecorKind;
  tx: number;
  ty: number;
  /** เลข 0..255 ไว้เลือกแบบภาพ (เช่น ต้นกลม/ต้นสน) */
  variant: number;
}

/** โอกาสที่ช่องป่าจะมีต้นไม้ (ก่อนตัดต้นที่ติดกันออก) */
const TREE_CHANCE = 0.7;
/** โอกาสที่ช่องหญ้าจะมีของตกแต่งเล็ก */
const SMALL_CHANCE = 0.1;

/**
 * วางของตกแต่งทั้งเกาะจาก seed — ทุกเครื่องได้ผลเหมือนกันเสมอ
 * เดินทีละช่องตามแถว (ลำดับตายตัว) ใช้ตัวสุ่มแยกจากตัวที่ใช้สร้างแผนที่
 * - ต้นไม้: เฉพาะพื้นป่า, ไม่ติดต้นอื่น (ต้นไม้กว้าง 2 ช่อง), ไม่อยู่ใกล้จุดเกิด
 * - ของเล็ก (ดอกไม้/กอหญ้า/หิน/พุ่มไม้): เฉพาะพื้นหญ้า
 * ⚠️ ลำดับใน list นี้คือ id ของทรัพยากร — เปลี่ยนกติกาที่นี่ = id เปลี่ยน (ระวังเมื่อมีระบบบันทึกโลก)
 */
export function generateDecor(map: WorldMap): Decor[] {
  const rand = mulberry32((map.seed ^ 0x9e3779b9) >>> 0);
  const nearSpawn = spawnZone(map);
  const trees = new Set<number>();
  const out: Decor[] = [];

  for (let ty = 0; ty < map.size && out.length < MAX_DECOR; ty++) {
    for (let tx = 0; tx < map.size && out.length < MAX_DECOR; tx++) {
      // ดึงตัวสุ่มครบทุกช่องเสมอ เพื่อให้ผลแต่ละช่องไม่ขึ้นกับว่าช่องก่อนหน้าวางอะไร
      const roll = rand();
      const variant = Math.floor(rand() * 256);
      const tile = tileAt(map, tx, ty);

      if (tile === Tile.Forest) {
        if (roll >= TREE_CHANCE || nearSpawn.has(key(map, tx, ty)) || touchesTree(map, trees, tx, ty)) continue;
        trees.add(key(map, tx, ty));
        out.push({ kind: DecorKind.Tree, tx, ty, variant });
      } else if (tile === Tile.Grass && roll < SMALL_CHANCE) {
        const r = roll / SMALL_CHANCE; // 0..1 แบ่งเป็น 4 ชนิด: ดอกไม้ 35% กอหญ้า 30% หิน 20% พุ่มไม้ 15%
        const kind =
          r < 0.35 ? DecorKind.Flower : r < 0.65 ? DecorKind.Tuft : r < 0.85 ? DecorKind.Pebble : DecorKind.Bush;
        // หินเป็นของแข็ง ห้ามวางใกล้จุดเกิด (ผู้เล่นจะเกิดติดในหิน)
        if (kind === DecorKind.Pebble && nearSpawn.has(key(map, tx, ty))) continue;
        out.push({ kind, tx, ty, variant });
      }
    }
  }
  return out;
}

const key = (map: WorldMap, tx: number, ty: number) => ty * map.size + tx;

/** มีต้นไม้ที่วางแล้วอยู่ติดกัน (ซ้าย, บนซ้าย, บน, บนขวา) ไหม — ช่องอื่นยังไม่ถูกวาง */
function touchesTree(map: WorldMap, trees: Set<number>, tx: number, ty: number): boolean {
  return (
    trees.has(key(map, tx - 1, ty)) ||
    trees.has(key(map, tx - 1, ty - 1)) ||
    trees.has(key(map, tx, ty - 1)) ||
    trees.has(key(map, tx + 1, ty - 1))
  );
}

/** ช่องรอบจุดเกิดทุกจุด (รัศมี 1 ช่อง) ห้ามมีต้นไม้ ผู้เล่นจะได้ไม่เกิดใต้ต้นไม้ */
function spawnZone(map: WorldMap): Set<number> {
  const zone = new Set<number>();
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const s = findSpawn(map, i);
    const sx = Math.floor(s.x / TILE_SIZE);
    const sy = Math.floor(s.y / TILE_SIZE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) zone.add(key(map, sx + dx, sy + dy));
  }
  return zone;
}
