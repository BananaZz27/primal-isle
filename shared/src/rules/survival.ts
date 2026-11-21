import { BALANCE } from "./resources";

/** ค่าสถานะของผู้เล่น ทุกค่าอยู่ในช่วง 0..100 */
export interface Stats {
  health: number;
  hunger: number;
  thirst: number;
}

export function freshStats(): Stats {
  return { health: BALANCE.statMax, hunger: BALANCE.statMax, thirst: BALANCE.statMax };
}

const clamp = (v: number) => Math.min(BALANCE.statMax, Math.max(0, v));

/**
 * เดินเวลาไป dt วินาที: หิว/น้ำลด, หิวหรือน้ำหมด → เลือดลด, อิ่มทั้งคู่ → เลือดฟื้น
 * แก้ค่าใน s โดยตรง และ clamp ทุกค่าเสมอ (กันค่าหลุดตอน dt ยาวผิดปกติ)
 */
export function tickStats(s: Stats, dt: number): { died: boolean } {
  if (!(dt > 0)) return { died: s.health <= 0 }; // dt ติดลบ / NaN → ไม่ทำอะไร

  s.hunger = clamp(s.hunger - BALANCE.hungerPerSec * dt);
  s.thirst = clamp(s.thirst - BALANCE.thirstPerSec * dt);

  if (s.hunger <= 0 || s.thirst <= 0) {
    s.health = clamp(s.health - BALANCE.starveDamagePerSec * dt);
  } else if (s.hunger > BALANCE.regenAbove && s.thirst > BALANCE.regenAbove) {
    s.health = clamp(s.health + BALANCE.regenPerSec * dt);
  }
  return { died: s.health <= 0 };
}
