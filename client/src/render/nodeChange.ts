/**
 * ตัดสินว่าการเปลี่ยน hp ของทรัพยากรควรแสดงผลอะไร (pure — เทสต์ได้)
 * before/after: hp ก่อน/หลัง (null = เต็ม ยังไม่เคยถูกตี หรือเพิ่งงอกคืน)
 * live: false = กำลังรับ state ที่มีอยู่แล้วตอนเพิ่งเข้าโลก → ห้ามแสดง "+1"/สั่น เพราะไม่ใช่การตีจริงตอนนี้
 */
export function nodeChange(
  before: number | null,
  after: number | null,
  fullHits: number,
  live: boolean,
): { hit: boolean; depleted: boolean } {
  const b = before ?? fullHits;
  const a = after ?? fullHits;
  return { hit: live && a < b, depleted: a === 0 };
}
