import { inReach, TILE_SIZE } from "@primal/shared";
import type { Facing } from "../render/facing";

const STEP: Record<Facing, [number, number]> = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };

/** ช่องหน้าตัวละคร (ตามทิศที่หัน) — ใช้เป็นช่องที่จะวางสิ่งก่อสร้าง */
export function frontTile(px: number, py: number, facing: Facing): { tx: number; ty: number } {
  const [dx, dy] = STEP[facing];
  return { tx: Math.floor(px / TILE_SIZE) + dx, ty: Math.floor(py / TILE_SIZE) + dy };
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
