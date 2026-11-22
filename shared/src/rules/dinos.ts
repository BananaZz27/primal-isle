import { TILE_SIZE } from "../constants";
import type { SolidFn } from "../movement/step";
import { isWalkable, tileAt, Tile, type WorldMap } from "../world/tiles";
import { BALANCE, type ItemId } from "./resources";

/** ชนิดไดโน (ลำดับ = ลำดับใน balance.json) */
export type DinoKind = keyof typeof BALANCE.dinos;
export const DINO_KINDS = Object.keys(BALANCE.dinos) as DinoKind[];

/**
 * นิสัย:
 * skittish = หนีเมื่อคนเข้าใกล้ (aggroPx) หรือโดนตี · shy = หนีเมื่อโดนตี
 * aggressive = ไล่กัดคนในระยะ aggroPx · defensive = เฉยๆ จนกว่าโดนตี แล้วไล่ช่วงหนึ่ง
 */
export type Temper = "skittish" | "shy" | "aggressive" | "defensive";

export interface DinoDef {
  /** ครึ่งความกว้างกล่องชน (px) */
  half: number;
  hp: number;
  /** ความเร็วเดินเล่น / วิ่ง (หนี ไล่ ตามเจ้าของ) px/วินาที */
  speed: number;
  runSpeed: number;
  /** ฆ่าแล้วได้เนื้อกี่ชิ้น */
  meat: number;
  /** จำนวนตัวป่าสูงสุดต่อโลก */
  cap: number;
  temper: Temper;
  /** ระยะที่เริ่มหนี (skittish) / เริ่มไล่ (aggressive) */
  aggroPx: number;
  /** ดาเมจต่อการกัด / คูลดาวน์ */
  bite: number;
  biteCooldownMs: number;
  /** เทมด้วยอะไร กี่ชิ้น (ไม่มี = เทมไม่ได้) */
  tameFood?: ItemId;
  tameCount?: number;
}

export function dinoDef(kind: DinoKind): DinoDef {
  return BALANCE.dinos[kind] as DinoDef;
}

export function isDinoKind(v: unknown): v is DinoKind {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BALANCE.dinos, v);
}

/** เทมได้ไหม ต้องป้อนอะไร กี่ชิ้น */
export function canTame(kind: DinoKind): { food: ItemId; count: number } | null {
  const d = dinoDef(kind);
  return d.tameFood && d.tameCount ? { food: d.tameFood, count: d.tameCount } : null;
}

/** ดาเมจของผู้เล่น = อาวุธที่ดีที่สุดที่มีในกระเป๋า */
export function playerDamage(has: (item: ItemId) => number): number {
  if (has("spear") > 0) return BALANCE.damage.spear;
  if (has("axe") > 0) return BALANCE.damage.axe;
  return BALANCE.damage.fist;
}

/** ผู้เล่นที่ (px, py) ตีไดโนที่ (dx, dy) ตัวขนาด half ถึงไหม — นับขนาดตัวไดโนด้วย */
export function dinoInReach(px: number, py: number, dx: number, dy: number, half: number): boolean {
  return Math.hypot(px - dx, py - dy) <= BALANCE.gatherReach + half;
}

/**
 * ช่อง (tx, ty) ใช้เป็นจุดเกิดไดโนได้ไหม:
 * หญ้า/ป่า ไม่มีของแข็ง · ห่างผู้เล่นทุกคน ≥ dinoSpawnMinTiles · ห่างจุดเกิดผู้เล่น ≥ dinoSpawnAwayFromSpawnTiles
 * (กันไดโนเกิดตรงหน้าคน และกันแร็พเตอร์ดักจุดเกิด)
 */
export function dinoSpawnOk(
  map: WorldMap,
  solid: SolidFn,
  tx: number,
  ty: number,
  players: { x: number; y: number }[],
  spawns: { x: number; y: number }[],
): boolean {
  const tile = tileAt(map, tx, ty);
  if (!isWalkable(tile) || tile === Tile.Sand || solid(tx, ty)) return false;
  const cx = (tx + 0.5) * TILE_SIZE;
  const cy = (ty + 0.5) * TILE_SIZE;
  const far = (ps: { x: number; y: number }[], tiles: number) =>
    ps.every((p) => Math.hypot(p.x - cx, p.y - cy) >= tiles * TILE_SIZE);
  return far(players, BALANCE.dinoSpawnMinTiles) && far(spawns, BALANCE.dinoSpawnAwayFromSpawnTiles);
}
