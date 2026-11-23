import type { ItemId } from "@primal/shared";
import { CAMPFIRE_FRAMES, CAMPFIRE_PALETTE } from "./campfire";
import { BED, BUILD_PALETTE, CHEST, DOOR, WALL } from "./structures";
import { BANDAGE, BOTTLE, CANNED, LIVING_PALETTE } from "./living";
import { DINO_PALETTE, MEAT_ICON } from "./dinos";

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
  pebble: [frameAt(0, 7), frameAt(1, 7)], // หินเล็ก + หินกลาง
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
  campfire: "campfire", // วาดเองใน BootScene (2 เฟรม)
  structure: (kind: string) => `structure-${kind}`, // กำแพง/ประตู/ที่นอน วาดเองใน BootScene
  bag: "drop-bag",
  dino: (kind: string) => `dino-${kind}`, // วาดเองใน BootScene (2 เฟรม)
  crate: "supply-crate", // ลังเสบียงมีร่มชูชีพ วาดเองใน BootScene
  glow: "fire-glow", // วงแสงกองไฟ (ไล่สีวงกลม) สร้างใน BootScene
};

/** พุ่มไม้ผลไม้ (ทรัพยากร) และตอไม้ (ต้นไม้ที่ถูกตัดหมด) */
export const BUSH_FRAME = frameAt(13, 9);
export const STUMP_FRAME = frameAt(9, 8);

/**
 * ไอคอน: ช่องใน tileset, ไฟล์แยก (path สัมพัทธ์กับ ASSET_ROOT)
 * หรือภาพที่วาดเองด้วยตัวอักษร (rows + palette แบบเดียวกับ parsePixelArt)
 */
export type Icon =
  | { kind: "tile"; frame: number }
  | { kind: "file"; path: string }
  | { kind: "pixels"; rows: string[]; palette: Record<string, string> };

/** ไอคอนของในกระเป๋า */
export const ITEM_ICONS: Record<ItemId, Icon> = {
  wood: { kind: "tile", frame: STUMP_FRAME },
  stone: { kind: "tile", frame: frameAt(0, 7) },
  berry: { kind: "tile", frame: frameAt(1, 9) },
  fiber: { kind: "file", path: "items/tea-leaf.png" },
  axe: { kind: "file", path: "items/axe.png" },
  hammer: { kind: "file", path: "items/hammer.png" },
  campfire: { kind: "pixels", rows: CAMPFIRE_FRAMES[0], palette: CAMPFIRE_PALETTE },
  roast: { kind: "file", path: "items/yakitori.png" },
  wall: { kind: "pixels", rows: WALL, palette: BUILD_PALETTE },
  door: { kind: "pixels", rows: DOOR, palette: BUILD_PALETTE },
  bed: { kind: "pixels", rows: BED, palette: BUILD_PALETTE },
  meat: { kind: "pixels", rows: MEAT_ICON, palette: DINO_PALETTE },
  steak: { kind: "file", path: "items/beaf.png" },
  spear: { kind: "file", path: "items/lance.png" },
  canned: { kind: "pixels", rows: CANNED, palette: LIVING_PALETTE },
  bottle: { kind: "pixels", rows: BOTTLE, palette: LIVING_PALETTE },
  bandage: { kind: "pixels", rows: BANDAGE, palette: LIVING_PALETTE },
  chest: { kind: "pixels", rows: CHEST, palette: BUILD_PALETTE },
};

/** ไอคอนค่าสถานะ */
export const STAT_ICONS: Record<"health" | "hunger" | "thirst", Icon> = {
  health: { kind: "file", path: "items/heart.png" },
  hunger: { kind: "file", path: "items/beaf.png" },
  thirst: { kind: "file", path: "items/water-pot.png" },
};
