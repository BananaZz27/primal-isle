import balanceJson from "../data/balance.json";
import { TILE_SIZE } from "../constants";
import { DecorKind, type Decor } from "../world/decor";
import { Tile, tileAt, type WorldMap } from "../world/tiles";

/**
 * ตัวเลขสมดุลเกมทั้งหมด (แก้ที่ไฟล์ data/balance.json ไม่ต้องแก้โค้ด)
 * ทั้ง server และ client อ่านจากที่เดียวกัน
 */
export const BALANCE = balanceJson;

/** ของทุกชนิดในเกม: วัตถุดิบ 4 อย่าง + ของที่คราฟต์/ปรุงได้ */
export type ItemId =
  | "wood"
  | "stone"
  | "berry"
  | "fiber"
  | "axe"
  | "hammer"
  | "campfire"
  | "roast"
  | "wall"
  | "door"
  | "bed";
/** ลำดับนี้ = ลำดับช่องในกระเป๋า */
export const ITEM_IDS: readonly ItemId[] = [
  "wood",
  "stone",
  "berry",
  "fiber",
  "axe",
  "hammer",
  "campfire",
  "roast",
  "wall",
  "door",
  "bed",
];

export interface NodeDef {
  item: ItemId;
  hits: number;
  regrowSec: number;
  solid: boolean;
}

const KIND_TO_NODE: Partial<Record<DecorKind, keyof typeof BALANCE.nodes>> = {
  [DecorKind.Tree]: "tree",
  [DecorKind.Pebble]: "rock",
  [DecorKind.Bush]: "bush",
  [DecorKind.Tuft]: "tuft",
};

/** ของตกแต่งชนิดนี้เก็บได้ไหม ได้อะไร — ดอกไม้คืน null */
export function nodeDef(kind: DecorKind): NodeDef | null {
  const key = KIND_TO_NODE[kind];
  return key ? (BALANCE.nodes[key] as NodeDef) : null;
}

/** ผู้เล่นที่ (px, py) เอื้อมถึงช่อง (tx, ty) ไหม — วัดจากกลางตัวถึงกลางช่อง */
export function inReach(px: number, py: number, tx: number, ty: number): boolean {
  const cx = tx * TILE_SIZE + TILE_SIZE / 2;
  const cy = ty * TILE_SIZE + TILE_SIZE / 2;
  return Math.hypot(px - cx, py - cy) <= BALANCE.gatherReach;
}

/** มีน้ำอยู่ในระยะเอื้อมไหม (ใช้ตอนดื่ม) */
export function touchesWater(map: WorldMap, px: number, py: number): boolean {
  const ctx = Math.floor(px / TILE_SIZE);
  const cty = Math.floor(py / TILE_SIZE);
  for (let ty = cty - 2; ty <= cty + 2; ty++)
    for (let tx = ctx - 2; tx <= ctx + 2; tx++)
      if (tileAt(map, tx, ty) === Tile.Water && inReach(px, py, tx, ty)) return true;
  return false;
}

/**
 * สร้างฟังก์ชัน "ช่องนี้ชนไหม" จากทรัพยากรบนเกาะ: ต้นไม้/หินที่ยังไม่หมด = ของแข็ง
 * isDepleted(id) บอกว่าทรัพยากร id นั้นถูกเก็บหมดอยู่ไหม (มาจาก state ของเซิร์ฟเวอร์)
 */
export function solidFromNodes(
  map: WorldMap,
  decor: Decor[],
  isDepleted: (id: number) => boolean,
): (tx: number, ty: number) => boolean {
  const solidId = new Map<number, number>(); // ช่อง → id ทรัพยากรที่เป็นของแข็ง
  decor.forEach((d, id) => {
    if (nodeDef(d.kind)?.solid) solidId.set(d.ty * map.size + d.tx, id);
  });
  return (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= map.size || ty >= map.size) return false;
    const id = solidId.get(ty * map.size + tx);
    return id !== undefined && !isDepleted(id);
  };
}
