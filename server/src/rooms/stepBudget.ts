import { MAX_CATCHUP_STEPS } from "@primal/shared";

/**
 * โควตาการเดินต่อผู้เล่น (กันโปรแก้ความเร็ว / speed hack)
 *
 * ผู้เล่นปกติส่ง input ราว 1 ชิ้นต่อ tick ถ้าใช้ input ที่ค้างในบัฟเฟอร์ทั้งหมดใน tick เดียว
 * ผู้เล่นที่แก้เกมจะยิง input ทีละ 60 ชิ้นแล้ววาร์ปได้
 * จึงให้ "เครดิต" เพิ่ม 1 ต่อ tick (สะสมได้ไม่เกิน MAX_CATCHUP_STEPS เผื่อเน็ตสะดุด)
 * แต่ละ tick ใช้ input ได้ไม่เกินเครดิตที่มี ส่วนที่เหลือรออยู่ในบัฟเฟอร์ ไม่หาย
 */
export class StepBudget {
  private credits = new Map<string, number>();

  /** เรียกต้น tick: เติมเครดิตแล้วคืนจำนวน input ที่ผู้เล่นคนนี้ใช้ได้ใน tick นี้ */
  allowance(sessionId: string): number {
    const next = Math.min((this.credits.get(sessionId) ?? 0) + 1, MAX_CATCHUP_STEPS);
    this.credits.set(sessionId, next);
    return next;
  }

  /** หักเครดิตตามจำนวน input ที่ใช้ไปจริง */
  spend(sessionId: string, used: number): void {
    this.credits.set(sessionId, Math.max(0, (this.credits.get(sessionId) ?? 0) - used));
  }

  forget(sessionId: string): void {
    this.credits.delete(sessionId);
  }
}
