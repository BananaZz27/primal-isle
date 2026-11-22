import { inReach, PLAYER_HALF, TILE_SIZE } from "@primal/shared";
import type { Facing } from "../render/facing";

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/**
 * ช่องหน้าตัวละคร (ตามทิศที่หัน) — ใช้เป็นช่องที่จะวางสิ่งก่อสร้าง
 * นับจาก "ขอบกล่องชน" ไม่ใช่จุดกลางตัว: ถ้ายืนชิดขอบช่อง กล่องชนจะล้ำเข้าช่องข้าง ๆ
 * แล้วเซิร์ฟเวอร์จะไม่ยอมให้วางทับตัวเอง จึงเลือกช่องถัดจากขอบกล่องชนออกไปเสมอ
 */
export function frontTile(px: number, py: number, facing: Facing): { tx: number; ty: number } {
  switch (facing) {
    case "left":
      return { tx: tileOf(px - PLAYER_HALF) - 1, ty: tileOf(py) };
    case "right":
      return { tx: tileOf(px + PLAYER_HALF) + 1, ty: tileOf(py) };
    case "up":
      return { tx: tileOf(px), ty: tileOf(py - PLAYER_HALF) - 1 };
    case "down":
      return { tx: tileOf(px), ty: tileOf(py + PLAYER_HALF) + 1 };
  }
}

/** ของที่ใกล้ที่สุดในระยะเอื้อม (สิ่งก่อสร้างที่จะรื้อ / ถุงที่จะเก็บ) */
export function nearestInReach<T extends { tx: number; ty: number }>(px: number, py: number, things: T[]): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const t of things) {
    if (!inReach(px, py, t.tx, t.ty)) continue;
    const d = Math.hypot(px - (t.tx + 0.5) * TILE_SIZE, py - (t.ty + 0.5) * TILE_SIZE);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}
