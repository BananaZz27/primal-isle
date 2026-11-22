import { PLAYER_HALF, TILE_SIZE } from "../constants";
import { isWalkable, tileAt, type WorldMap } from "../world/tiles";
import { BALANCE } from "./resources";

/** สิ่งที่วางบนพื้นได้ */
export type StructureKind = keyof typeof BALANCE.structures;
export const STRUCTURE_DEFS = BALANCE.structures as Record<StructureKind, { solid: boolean }>;

export function isStructureKind(v: unknown): v is StructureKind {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BALANCE.structures, v);
}

/** ข้อมูลโลกที่ต้องใช้ตัดสินว่าวางได้ไหม (ส่งเข้ามา จะได้เป็นฟังก์ชันล้วน) */
export interface PlaceWorld {
  map: WorldMap;
  /** ช่องนี้มีของตกแต่ง/ทรัพยากรอยู่ไหม */
  occupied: (tx: number, ty: number) => boolean;
  structures: { kind: string; tx: number; ty: number }[];
  /** ตัวที่ยืนอยู่ (ผู้เล่น/ไดโน) — half = ครึ่งกล่องชน (ไม่ใส่ = ขนาดผู้เล่น) */
  players: { x: number; y: number; half?: number }[];
}

/**
 * วางสิ่งก่อสร้างชนิด kind ที่ช่อง (tx, ty) ได้ไหม — ใช้ทั้ง client (แสดงผล) และ server (ตัดสินจริง)
 * กติกา: ช่องเป็นจำนวนเต็ม, อยู่ในระยะเอื้อม, เป็นบก, ไม่มีของตกแต่ง/สิ่งก่อสร้าง/ผู้เล่นทับ,
 * กองไฟห้ามติดสิ่งก่อสร้างอื่น, ไม่เกินจำนวนสูงสุดของโลก
 */
export function placeCheck(
  w: PlaceWorld,
  by: { x: number; y: number },
  kind: unknown,
  tx: unknown,
  ty: unknown,
): boolean {
  if (!isStructureKind(kind) || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;
  const x = tx as number;
  const y = ty as number;
  if (!inPlaceReach(by.x, by.y, x, y)) return false;
  if (!isWalkable(tileAt(w.map, x, y)) || w.occupied(x, y)) return false;
  if (w.structures.length >= BALANCE.maxStructures) return false;
  if (kind === "campfire" && w.structures.filter((s) => s.kind === "campfire").length >= BALANCE.maxCampfires) return false;

  for (const s of w.structures) {
    const gap = Math.max(Math.abs(s.tx - x), Math.abs(s.ty - y));
    if (gap === 0) return false;
    if (gap === 1 && (kind === "campfire" || s.kind === "campfire")) return false;
  }
  for (const p of w.players) if (hitboxTouches(p.x, p.y, x, y, p.half)) return false;
  return true;
}

/**
 * ระยะวางของ (32px) ยาวกว่าระยะเก็บของ (24px) เพราะช่องหน้าตัวนับจากขอบกล่องชน
 * ไกลสุดคือ hypot(1.5 ช่อง + PLAYER_HALF, ครึ่งช่อง) ≈ 30px
 */
export function inPlaceReach(px: number, py: number, tx: number, ty: number): boolean {
  const cx = tx * TILE_SIZE + TILE_SIZE / 2;
  const cy = ty * TILE_SIZE + TILE_SIZE / 2;
  return Math.hypot(px - cx, py - cy) <= BALANCE.placeReach;
}

/** กล่องชนของผู้เล่นที่ (px, py) ทับช่อง (tx, ty) ไหม — คณิตเดียวกับ stepPlayer */
export function hitboxTouches(px: number, py: number, tx: number, ty: number, half = PLAYER_HALF): boolean {
  const left = Math.floor((px - half) / TILE_SIZE);
  const right = Math.floor((px + half) / TILE_SIZE);
  const top = Math.floor((py - half) / TILE_SIZE);
  const bottom = Math.floor((py + half) / TILE_SIZE);
  return tx >= left && tx <= right && ty >= top && ty <= bottom;
}

/** ตัวอักษรของรหัสโลก — ตัด 0/O และ 1/I ที่อ่านสับสน */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** รหัสโลกถาวร 6 ตัว (ใช้เป็นชื่อไฟล์บันทึกด้วย จึงต้องตรวจรูปแบบเสมอ) */
export function newWorldCode(rand: () => number): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return code;
}

export function isWorldCode(v: unknown): v is string {
  return typeof v === "string" && CODE_RE.test(v);
}

/** token จำตัวผู้เล่น (สุ่มในเบราว์เซอร์) */
export function isToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);
}
