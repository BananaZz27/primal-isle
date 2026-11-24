import { PixelCanvas, rng, type Ramp } from "./canvas";

/** ramp ของไดโน (มืด → สว่าง) */
export const DINO_RAMPS = {
  raptorSkin: ["#4a220f", "#7a3c17", "#a95a22", "#d07f33", "#eba757"],
  raptorBelly: ["#8a7552", "#bfa676", "#e6d3a2"],
  claw: ["#2a2018", "#5a4a3a"],
} satisfies Record<string, Ramp>;

/** จุดบนเส้นโค้ง (x, y, รัศมี) ตาม t 0..1 */
type Spine = (t: number) => [number, number, number];

/** วาดส่วนที่เรียวยาว (หาง คอ) เป็นลูกกลมต่อกันตามเส้นโค้ง — ดูมีมิติกว่าหลายเหลี่ยมแบน */
function tube(c: PixelCanvas, spine: Spine, ramp: Ramp, lift = 0, steps = 24): void {
  for (let i = 0; i <= steps; i++) {
    const [x, y, r] = spine(i / steps);
    c.sphere(x, y, r, r * 0.9, ramp, lift);
  }
}

/** ขา: ต้นขาเป็นก้อน แข้งเป็นเส้นหนา 2 เท้ามีเล็บ — stride = เลื่อนเท้าไปหน้า/หลัง (px) */
function leg(c: PixelCanvas, hipX: number, hipY: number, stride: number, lift: number): void {
  const R = DINO_RAMPS.raptorSkin;
  c.sphere(hipX, hipY, 4, 5, R, lift);
  const kneeX = hipX - 2 + stride * 0.3;
  const kneeY = hipY + 5;
  const footX = hipX + stride;
  const footY = 33;
  for (const dx of [0, 1]) {
    c.line(hipX + dx, hipY + 2, kneeX + dx, kneeY, R[2 + (lift > 0 ? 1 : 0) - dx]);
    c.line(kneeX + dx, kneeY, footX + dx, footY, R[1 + (lift > 0 ? 1 : 0) - dx]);
  }
  // เท้า + เล็บ
  c.line(footX - 1, footY + 1, footX + 3, footY + 1, R[1]);
  c.set(footX + 4, footY + 1, DINO_RAMPS.claw[0]);
  c.set(footX - 2, footY + 1, DINO_RAMPS.claw[0]);
}

/** แร็พเตอร์หันขวา (48×36 = ขนาดบนจอเท่าภาพเดิม 24×18) · frame 0/1 = ท่าเดิน */
export function raptor(frame: 0 | 1): PixelCanvas {
  const c = new PixelCanvas(48, 36);
  const R = DINO_RAMPS.raptorSkin;
  const r = rng(5000);
  const stride = frame === 0 ? 3 : -3;
  c.shadow(26, 34, 14, 2.5);

  // ขาข้างไกล (มืดกว่า) วาดก่อน
  leg(c, 30, 23, -stride, -0.15);
  // หาง: จากสะโพกเรียวไปซ้าย ปลายยกขึ้นเล็กน้อย
  tube(c, (t) => [21 - 19 * t, 19 - 9 * t + Math.sin(t * Math.PI) * -2, 5.2 * (1 - t) + 0.9], R, 0, 30);
  // ลำตัว + ท้องสีครีม
  c.sphere(28, 19, 10, 6.5, R);
  c.sphere(29, 24.2, 6.5, 1.9, DINO_RAMPS.raptorBelly, -0.15);
  // คอ → หัว
  tube(c, (t) => [34 + 5 * t, 16 - 7 * t, 3.4 - 0.6 * t], R, 0.02, 12);
  c.sphere(41, 7, 5, 3.6, R, 0.05);
  c.sphere(45, 8.5, 3, 2.2, R, 0.02);
  // ปาก ตา รูจมูก
  c.line(40, 10, 47, 10, R[0]);
  c.set(42, 6, "#14100c");
  c.set(42, 5, "#f4e6b8");
  c.set(46, 7, R[1]);
  // แขนเล็ก
  c.line(35, 20, 37, 23, R[1]);
  c.line(36, 20, 38, 23, R[2]);
  c.set(38, 24, DINO_RAMPS.claw[0]);
  // ขาข้างใกล้
  leg(c, 25, 23, stride, 0.05);
  // ลายบนหลังและหาง
  for (let i = 0; i < 7; i++) {
    const x = 9 + i * 4 + Math.floor(r() * 2);
    const top = x < 20 ? 12 + (20 - x) * -0.35 + 2 : 13;
    c.line(x, top, x + 1, top + 2, R[0]);
  }
  c.outline(0.38);
  return c;
}
