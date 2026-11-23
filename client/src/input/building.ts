import { inPlaceReach, inReach, PLAYER_HALF, TILE_SIZE } from "@primal/shared";
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

type ReachFn = (px: number, py: number, tx: number, ty: number) => boolean;

/**
 * ของที่ใกล้ที่สุดในระยะเอื้อม (ถุงที่จะเก็บ = ระยะเก็บของ, สิ่งก่อสร้างที่จะรื้อ = ส่ง inPlaceReach)
 * ต้องใช้ระยะเดียวกับที่เซิร์ฟเวอร์ตรวจ ไม่งั้นกดแล้วไม่เกิดอะไร
 */
export function nearestInReach<T extends { tx: number; ty: number }>(
  px: number,
  py: number,
  things: T[],
  reach: ReachFn = inReach,
): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const t of things) {
    if (!reach(px, py, t.tx, t.ty)) continue;
    const d = Math.hypot(px - (t.tx + 0.5) * TILE_SIZE, py - (t.ty + 0.5) * TILE_SIZE);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

/**
 * สิ่งก่อสร้างที่ปุ่ม 🪓 จะรื้อ: ชิ้นที่ใกล้ที่สุดในระยะวาง — ข้ามกล่องเก็บของที่ยังมีของ (เซิร์ฟเวอร์ไม่ยอมรื้ออยู่แล้ว
 * ถ้าเลือกมันจะกดแล้วไม่เกิดอะไร และรื้อกำแพงข้างๆ ไม่ได้)
 * ในระยะมีแต่กล่องที่มีของ → { blocked: "chest" } ให้บอกผู้เล่นว่าต้องเอาของออกก่อน · ไม่มีอะไร → null
 */
export function demolishTarget(
  px: number,
  py: number,
  structures: { key: string; kind: string; tx: number; ty: number }[],
  chestItemKinds: (key: string) => number,
): { key: string } | { blocked: "chest" } | null {
  const full = (s: { key: string; kind: string }) => s.kind === "chest" && chestItemKinds(s.key) > 0;
  const target = nearestInReach(px, py, structures.filter((s) => !full(s)), inPlaceReach);
  if (target) return { key: target.key };
  return nearestInReach(px, py, structures.filter(full), inPlaceReach) ? { blocked: "chest" } : null;
}
