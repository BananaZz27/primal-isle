/**
 * ตัวคุมจังหวะการกดปุ่มโต้ตอบ (pure — ไม่แตะ Phaser จึงเทสต์ได้)
 * - กดครั้งแรก → ทำทันที
 * - กดค้าง → ทำซ้ำทุก gapMs
 * - กดใหม่เร็วกว่า gapMs → จำไว้ แล้วทำตอนถึงเวลา (ไม่ส่งเร็วเกินจนเซิร์ฟเวอร์เมิน และไม่ทิ้งการกด)
 * - กดแล้วปล่อยก่อนเฟรมถัดไป → ยังนับ
 */
export class RepeatGate {
  private lastFire = -Infinity;
  private pending = false;

  constructor(private gapMs: number) {}

  /** เรียกตอนนิ้ว/ปุ่มเริ่มกด */
  press(): void {
    this.pending = true;
  }

  /** เรียกทุกเฟรม: held = ตอนนี้ยังกดค้างอยู่ไหม · คืน true = ให้ทำตอนนี้ */
  update(now: number, held: boolean): boolean {
    if (!this.pending && !held) return false;
    if (now - this.lastFire < this.gapMs) return false;
    this.lastFire = now;
    this.pending = false;
    return true;
  }
}
