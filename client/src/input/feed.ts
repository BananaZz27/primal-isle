import { canTame, dinoDef, dinoInReach, isDinoKind, type ItemId } from "@primal/shared";

/** ไดโนบนจอ (key = id ใน state) — owner "" = ไดโนป่า */
export interface DinoOnScreen {
  key: string;
  kind: string;
  x: number;
  y: number;
  owner: string;
}

/**
 * ไดโนที่ป้อนได้ตอนนี้ (สำหรับปุ่ม 🍖 / F): ไดโนป่า, เทมได้, อยู่ในระยะ, และเรามีอาหารที่มันชอบ
 * เลือกตัวที่ใกล้ที่สุด · ไม่มี → null (ซ่อนปุ่ม) · เซิร์ฟเวอร์ตรวจซ้ำเสมอ
 */
export function feedTarget(px: number, py: number, dinos: DinoOnScreen[], has: (item: ItemId) => number): string | null {
  let best: { key: string; d: number } | null = null;
  for (const dino of dinos) {
    if (dino.owner !== "" || !isDinoKind(dino.kind)) continue;
    const tame = canTame(dino.kind);
    if (!tame || has(tame.food) <= 0) continue;
    if (!dinoInReach(px, py, dino.x, dino.y, dinoDef(dino.kind).half)) continue;
    const d = Math.hypot(px - dino.x, py - dino.y);
    if (!best || d < best.d) best = { key: dino.key, d };
  }
  return best?.key ?? null;
}
