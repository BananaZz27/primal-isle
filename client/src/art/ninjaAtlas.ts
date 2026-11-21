/**
 * แผนที่ภาพใน asset pack ของ Pixel-boy (CC0) — บอกว่าช่องไหนใน tileset คืออะไร
 * ไฟล์ต้นทาง: github.com/sparklinlabs/superpowers-asset-packs (ninja-adventure)
 *
 * tileset.png ของเรา = ต้นฉบับ 28×40 ช่อง + แถวที่ 41 ที่เราเติมเอง (ช่อง 0 = ทรายเรียบ)
 * เลข frame = แถว × 28 + คอลัมน์
 */

export const TILESET_COLS = 28;
export const TILESET_ROWS = 41;
export const ASSET_ROOT = "assets/ninja-adventure";

export function frameAt(col: number, row: number): number {
  return row * TILESET_COLS + col;
}

/** พื้นแต่ละชนิด */
export const GROUND = {
  water: frameAt(20, 8), // กลางบ่อน้ำ
  sand: frameAt(0, 40), // ทรายเรียบ (แถวที่เราเติม)
  grass: frameAt(22, 11),
  forestFloor: frameAt(23, 11), // หญ้าเข้ม = พื้นป่า
};

/**
 * ภาพ "น้ำ" ที่มีขอบติดบก (ชุดขอบบ่อ 3×3 ที่คอลัมน์ 19–21 แถว 7–9)
 * ตั้งชื่อตามทิศที่ "บก" อยู่ เช่น n = บกอยู่ด้านบน
 */
export const SHORE = {
  nw: frameAt(19, 7),
  n: frameAt(20, 7),
  ne: frameAt(21, 7),
  w: frameAt(19, 8),
  e: frameAt(21, 8),
  sw: frameAt(19, 9),
  s: frameAt(20, 9),
  se: frameAt(21, 9),
};

/**
 * ภาพ "ทราย" ที่มีขอบแดงริมน้ำ (ช่องรอบบ่อ) ตั้งชื่อตามทิศที่ "น้ำ" อยู่
 * n/s/e/w = น้ำติดด้านนั้น, มุม = น้ำอยู่แนวทแยงอย่างเดียว
 */
export const SAND_RIM = {
  n: frameAt(20, 10),
  s: frameAt(20, 6),
  e: frameAt(18, 8),
  w: frameAt(22, 8),
  se: frameAt(18, 6),
  sw: frameAt(22, 6),
  ne: frameAt(18, 10),
  nw: frameAt(22, 10),
};

/** ของตกแต่งเตี้ยบนพื้นหญ้า (ขนาด 1 ช่อง) */
export const GROUND_DECOR = {
  flower: [frameAt(1, 8), frameAt(2, 8)],
  tuft: [frameAt(0, 8)],
  pebble: [frameAt(4, 8)],
};

/** ต้นไม้ใหญ่ (พิกเซลใน tileset) — ต้นกลม และต้นสน */
export const TREE_RECTS = [
  { x: 0, y: 160, w: 32, h: 32 },
  { x: 96, y: 160, w: 32, h: 32 },
];

/** ไฟล์ตัวละครที่ดูเป็นคนธรรมดา/นักสำรวจ ใช้ตาม colorIndex ของผู้เล่น */
export const SURVIVOR_IDS = ["14", "3", "17", "6", "9", "12", "13", "25"] as const;

/** ชื่อ texture ใน Phaser */
export const TEX = {
  tiles: "ninja-tiles", // spritesheet 16×16 ใช้กับ tilemap
  tilesImage: "ninja-tiles-image", // ภาพเต็ม ใช้ตัดต้นไม้
  tree: (i: number) => `tree-${i}`,
  survivor: (id: string) => `survivor-${id}`,
};
