/**
 * ความคมของภาพตามความละเอียดจอ (devicePixelRatio = จำนวนพิกเซลจริงต่อ 1 CSS px)
 *
 * - canvas วาดที่พิกเซลจริงของจอ แล้วแสดงเท่าขนาด CSS → แท็บเล็ต/มือถือจอคมไม่เบลอ
 * - ภาพ HD = 32 texel ต่อช่อง วาดที่ scale 0.5 (โลกยังนับ 16 หน่วยต่อช่อง)
 * - เลือกซูมกล้องให้ 1 texel = จำนวนพิกเซลจริงที่เป็นจำนวนเต็มเสมอ → เม็ดพิกเซลหนาเท่ากันทุกเม็ด
 * ไฟล์นี้ไม่แตะ Phaser จึงเทสต์ได้
 */

/** ภาพ HD (32 texel ต่อช่อง) ต้องย่อลงเท่านี้ให้ได้ 16 หน่วยโลกต่อช่อง */
export const HD_SCALE = 0.5;

/** ขนาด texel HD ที่อยากได้บนจอ (CSS px) → 1 ช่อง ≈ 48 CSS px เท่าก่อนมีระบบนี้ */
const TARGET_CSS_PER_TEXEL = 1.5;

/** ความละเอียดจอที่ใช้จริง (จำกัดไม่เกิน 3 — เกินนั้นเปลืองแรงเครื่องโดยตาแยกไม่ออก) */
export function currentDpr(): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(3, Math.max(1, dpr));
}

/** 1 texel HD = กี่พิกเซลจริง (จำนวนเต็ม ≥ 1) */
export function texelPixels(dpr: number): number {
  return Math.max(1, Math.round(TARGET_CSS_PER_TEXEL * dpr));
}

/** ซูมกล้อง = พิกเซลจริงต่อ 1 หน่วยโลก (เป็นจำนวนเต็มเสมอ — ภาพเก่า 16px ก็คม) */
export function cameraZoom(dpr: number): number {
  return texelPixels(dpr) / HD_SCALE;
}

/** ความละเอียดตัวหนังสือในโลก (ชื่อ ป้าย) — เท่าซูมกล้อง ตัวหนังสือจึงคมไม่เบลอ */
export function textResolution(): number {
  return cameraZoom(currentDpr());
}

/** พิกเซลของ canvas → CSS px (ใช้วางของ HTML ทับตำแหน่งในโลก) */
export function screenPx(canvasPx: number, dpr: number): number {
  return canvasPx / dpr;
}
