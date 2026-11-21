/**
 * ตัวสุ่มแบบกำหนดผลได้ (seeded PRNG) ชื่อ mulberry32
 * seed เดียวกัน → ลำดับตัวเลขเหมือนกันทุกเครื่อง ทั้ง server และ browser
 * จึงสร้างแผนที่ได้ตรงกันโดยไม่ต้องส่งแผนที่ทางเน็ต
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
