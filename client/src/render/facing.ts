/** ทิศที่ตัวละครหัน */
export type Facing = "down" | "up" | "left" | "right";

/** ระยะขยับต่อเฟรม (px) ที่น้อยกว่านี้ถือว่ายืนอยู่ (กันตัวละครสั่นตอนระบบทำนายแก้ตำแหน่งนิดๆ) */
const MOVE_EPSILON = 0.05;

/** ในไฟล์ตัวละคร: คอลัมน์ไหนคือทิศไหน */
export const FACING_COLUMN: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 };
const SHEET_COLS = 4;
const WALK_ROWS = [0, 1, 2, 3];

/** เลข frame ของท่าเดิน 4 เฟรมของทิศนี้ (แถว 0–3 ในคอลัมน์ของทิศ) */
export function walkFrames(facing: Facing): number[] {
  return WALK_ROWS.map((row) => row * SHEET_COLS + FACING_COLUMN[facing]);
}

/**
 * หาทิศจากระยะที่ขยับในเฟรมนี้
 * - ขยับน้อยมาก → ยืนนิ่ง หันทิศเดิม
 * - เดินทแยง → หันตามแกนที่ขยับมากกว่า (เท่ากันให้แนวนอนชนะ)
 */
export function facingFrom(dx: number, dy: number, prev: Facing): { facing: Facing; moving: boolean } {
  if (Math.abs(dx) + Math.abs(dy) <= MOVE_EPSILON) return { facing: prev, moving: false };
  if (Math.abs(dx) >= Math.abs(dy)) return { facing: dx > 0 ? "right" : "left", moving: true };
  return { facing: dy > 0 ? "down" : "up", moving: true };
}
