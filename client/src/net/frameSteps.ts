import { MAX_CATCHUP_STEPS } from "@primal/shared";

/**
 * จำกัดจำนวน step ที่จะส่งในเฟรมนี้
 * ตอนพับจอ/สลับแอปแล้วกลับมา ตัวจับเวลาอาจบอกว่าค้างไว้หลายร้อย step
 * ถ้าส่งหมดจะยิง input รัวจนตัวละครพุ่ง — จึงตัดไว้ไม่เกิน MAX_CATCHUP_STEPS
 */
export function clampSteps(steps: number): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  return Math.min(Math.floor(steps), MAX_CATCHUP_STEPS);
}

/** ข้อความเมื่อหลุดจากโลก */
export function connectionLostText(): string {
  return "หลุดการเชื่อมต่อกับโลก";
}
