import { TILE_SIZE } from "../constants";
import type { SolidFn } from "../movement/step";
import { isWalkable, tileAt, Tile, type WorldMap } from "../world/tiles";
import { BALANCE, ITEM_IDS, type ItemId } from "./resources";

// ---------------- กลางวัน / กลางคืน ----------------

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const wrap = (sec: number) => ((sec % BALANCE.dayLengthSec) + BALANCE.dayLengthSec) % BALANCE.dayLengthSec;

/**
 * ความมืด 0 (กลางวัน) – 1 (กลางคืน) ที่วินาทีที่ clockSec ของวัน (วนรอบ dayLengthSec)
 * กลางคืนเริ่มที่ nightFrom ของวัน · ค่อยๆ มืดช่วง duskSec แรก และค่อยๆ สว่างช่วง duskSec สุดท้ายของวัน
 */
export function darkness(clockSec: number): number {
  const t = wrap(clockSec);
  const nightAt = BALANCE.dayLengthSec * BALANCE.nightFrom;
  if (t < nightAt) return 0;
  const sinceDusk = t - nightAt;
  const untilDawn = BALANCE.dayLengthSec - t;
  return clamp01(Math.min(sinceDusk, untilDawn) / BALANCE.duskSec);
}

/** กลางคืน (มืดเกินครึ่ง) — ใช้กับกติกา เช่น แร็พเตอร์ไล่ไกลขึ้น */
export function isNight(clockSec: number): boolean {
  return darkness(clockSec) > 0.5;
}

// ---------------- ของกิน/ดื่ม/รักษา ----------------

export interface Effect {
  hunger?: number;
  thirst?: number;
  health?: number;
}

/** ของที่ใช้แล้วหมดไป → เพิ่มค่าสถานะอะไรเท่าไร */
export const CONSUMABLES = BALANCE.consumables as Partial<Record<ItemId, Effect>>;

export function isConsumable(v: unknown): v is ItemId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BALANCE.consumables, v);
}

// ---------------- กล่องเสบียง ----------------

interface LootEntry {
  item: ItemId;
  min: number;
  max: number;
  weight: number;
}
const LOOT = BALANCE.loot as LootEntry[];

/** สุ่มของในกล่องเสบียง: 2–3 ชนิดไม่ซ้ำ สุ่มตามน้ำหนัก จำนวนในช่วง min..max */
export function rollLoot(rand: () => number): Partial<Record<ItemId, number>> {
  const kinds = 2 + Math.floor(rand() * 2);
  const pool = [...LOOT];
  const out: Partial<Record<ItemId, number>> = {};
  for (let k = 0; k < kinds && pool.length > 0; k++) {
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = rand() * total;
    let i = 0;
    while (i < pool.length - 1 && r >= pool[i].weight) r -= pool[i++].weight;
    const e = pool.splice(i, 1)[0];
    out[e.item] = e.min + Math.floor(rand() * (e.max - e.min + 1));
  }
  return out;
}

/** กล่องเสบียงตกที่ช่องนี้ได้ไหม: หญ้า/ป่า ไม่มีของแข็ง ห่างผู้เล่นทุกคน ≥ crateMinTiles */
export function crateSpawnOk(map: WorldMap, solid: SolidFn, tx: number, ty: number, players: { x: number; y: number }[]): boolean {
  const tile = tileAt(map, tx, ty);
  if (!isWalkable(tile) || tile === Tile.Sand || solid(tx, ty)) return false;
  const cx = (tx + 0.5) * TILE_SIZE;
  const cy = (ty + 0.5) * TILE_SIZE;
  return players.every((p) => Math.hypot(p.x - cx, p.y - cy) >= BALANCE.crateMinTiles * TILE_SIZE);
}

// ---------------- กล่องเก็บของ ----------------

/**
 * ย้ายของ item จำนวน n จากที่หนึ่ง (มี fromCount) ไปอีกที่ (มี toCount, มีของอยู่ toKinds ชนิด จำกัด kindLimit ชนิด)
 * ได้จริงกี่ชิ้น — 0 = ปฏิเสธ (ชนิดมั่ว, n ไม่ใช่จำนวนเต็มบวก, ปลายทางเต็ม)
 * ใช้ทั้งใส่กล่องและหยิบออก (กระเป๋า: kindLimit = Infinity)
 */
export function moveAmount(item: unknown, n: unknown, fromCount: number, toCount: number, toKinds: number, kindLimit: number): number {
  if (typeof item !== "string" || !ITEM_IDS.includes(item as ItemId)) return 0;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) return 0;
  if (toCount === 0 && toKinds >= kindLimit) return 0;
  return Math.max(0, Math.min(n, fromCount, BALANCE.stackMax - toCount));
}
