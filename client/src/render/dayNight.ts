import { BALANCE, darkness, isNight } from "@primal/shared";
import { NIGHT_MAX_ALPHA } from "../config";

/** กติกาการแสดงผลกลางวัน/กลางคืน (ไม่แตะ Phaser เลย จึงเทสต์ได้) — ตัววาดอยู่ใน night.ts */

/** เตือน "ใกล้ค่ำ" ล่วงหน้ากี่วินาที */
const DUSK_WARNING_SEC = 60;

/** ความเข้มของแผ่นมืด 0..NIGHT_MAX_ALPHA ตามเวลาในวัน */
export function nightAlpha(clockSec: number): number {
  return darkness(clockSec) * NIGHT_MAX_ALPHA;
}

/** ความสว่างของวงแสงกองไฟ — กลางวันมองไม่เห็น กลางคืนสว่างเต็ม */
export function glowAlpha(clockSec: number): number {
  return darkness(clockSec) * 0.9;
}

export type DayPhase = "day" | "dusk" | "night";

/**
 * ช่วงเวลาสำหรับชิปบน HUD:
 * night = มืดเกินครึ่ง · dusk = 1 นาทีก่อนค่ำจนเกือบมืด (เตือนให้กลับฐาน) · ที่เหลือ = day (รวมตอนฟ้าสาง)
 */
export function dayPhase(clockSec: number): DayPhase {
  if (isNight(clockSec)) return "night";
  const t = ((clockSec % BALANCE.dayLengthSec) + BALANCE.dayLengthSec) % BALANCE.dayLengthSec;
  const nightAt = BALANCE.dayLengthSec * BALANCE.nightFrom;
  if (t >= nightAt - DUSK_WARNING_SEC && t < nightAt + BALANCE.duskSec) return "dusk";
  return "day";
}

const CHIP_TEXT: Record<DayPhase, string> = { day: "☀️ กลางวัน", dusk: "🌅 ใกล้ค่ำ", night: "🌙 กลางคืน" };
export const dayChip = (phase: DayPhase): string => CHIP_TEXT[phase];
