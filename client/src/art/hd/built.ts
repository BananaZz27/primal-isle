import { PixelCanvas, rng, type Ramp } from "./canvas";
import { RAMPS } from "./nature";

/**
 * สิ่งที่ผู้เล่นสร้าง/ของบนพื้น HD (32 texel ต่อช่อง): กำแพง ประตู ที่นอน กล่องเก็บของ กองไฟ ถุงของ ลังเสบียง
 * ใช้ ramp และแสงซ้ายบนชุดเดียวกับธรรมชาติ → เข้ากันทั้งเกม
 */

const WOOD: Ramp = ["#4a2c18", "#6a4224", "#8a5a32", "#a8743f", "#c49058"];
const PLANK: Ramp = ["#5a3a20", "#7a5230", "#9a6c40", "#b88a54", "#d2a874"];
const ROPE = "#d8c690";
const METAL: Ramp = ["#3a3e44", "#5a5f66", "#7e848c", "#a8aeb4"];
const BRASS = "#e8b838";
const CLOTH: Ramp = ["#6a5a3e", "#8e7a54", "#b09a6c", "#cdb98a", "#e6d6aa"];

function box(c: PixelCanvas, x0: number, y0: number, w: number, h: number, col: string): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.set(x, y, col);
}

/** กำแพงซุง: ซุง 4 ท่อนวางซ้อนแนวนอน ปลายเห็นหน้าตัด มีเชือกมัด */
export function wall(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 30, 15, 2);
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 6.5;
    // ซุง = ทรงกระบอกนอน: แสงจากบน → แถวบนสว่าง แถวล่างมืด
    for (let yy = 0; yy < 7; yy++) {
      const light = 0.85 - yy * 0.12;
      for (let x = 2; x < 30; x++) c.set(x, y + yy, WOOD[Math.max(0, Math.min(4, Math.round(light * 4)))]);
    }
    // ลายเปลือก
    for (let x = 4 + i * 3; x < 28; x += 7) c.line(x, y + 2, x + 3, y + 2, WOOD[1]);
    // หน้าตัดปลายซุง (ซ้าย)
    c.sphere(3, y + 3, 2.2, 3, ["#8a6a42", "#b08a5a", "#d2ae7a", "#ecd2a0"], 0.1);
  }
  // เชือกมัด 2 เส้น
  for (const x of [9, 23]) {
    c.line(x, 4, x, 29, ROPE);
    c.line(x + 1, 4, x + 1, 29, "#b0a070");
  }
  c.outline();
  return c;
}

/** ประตูไม้กระดาน: กรอบซุง + แผ่นไม้ตั้ง 4 แผ่น + ไม้คาดทแยง + มือจับ */
export function door(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 30, 15, 2);
  c.cylinder(2, 3, 4, 27, WOOD);
  c.cylinder(26, 3, 4, 27, WOOD);
  for (let x = 2; x < 30; x++) for (let y = 2; y < 5; y++) c.set(x, y, WOOD[4 - (y - 2)]);
  for (let p = 0; p < 4; p++) {
    c.cylinder(6 + p * 5, 5, 5, 24, PLANK, p === 0 ? 0.05 : 0);
    c.line(6 + p * 5, 5, 6 + p * 5, 28, PLANK[0]);
  }
  // ไม้คาด Z
  for (const y of [9, 23]) box(c, 6, y, 20, 2, PLANK[1]);
  c.line(7, 21, 24, 11, PLANK[1]);
  c.line(7, 22, 24, 12, PLANK[0]);
  // มือจับ
  c.set(23, 17, BRASS);
  c.set(23, 18, "#a07a20");
  c.outline();
  return c;
}

/** ที่นอน: ฟางปูบนใบไม้ หมอนผ้า — แบนกับพื้น */
export function bed(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const r = rng(9100);
  c.shadow(16, 28, 15, 3, 0.22);
  // ใบไม้รองพื้น (ขอบหยัก)
  c.sphere(16, 23, 15, 6, RAMPS.leaf, 0.05);
  // ฟางสีทอง
  const straw: Ramp = ["#8a6a2a", "#b08c3a", "#d0aa4e", "#e8c86a", "#f4dc8e"];
  c.sphere(16, 22.5, 13, 4.5, straw, 0.05);
  for (let i = 0; i < 40; i++) {
    const x = 4 + Math.floor(r() * 24);
    const y = 19 + Math.floor(r() * 7);
    if (c.alpha(x, y) < 255) continue;
    c.line(x, y, x + 2, y + (r() < 0.5 ? 0 : 1), straw[r() < 0.5 ? 1 : 4]);
  }
  // หมอนผ้า
  c.sphere(8, 20, 4.5, 2.6, CLOTH, 0.1, false);
  c.outline(0.5);
  return c;
}

/** กล่องเก็บของ: หีบไม้ ฝาโค้ง คาดเหล็ก 2 แถบ กลอนทองเหลือง */
export function chest(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 29, 14, 2.2);
  // ตัวหีบ
  for (let y = 15; y < 28; y++) for (let x = 4; x < 28; x++) c.set(x, y, PLANK[y < 18 ? 2 : x < 8 ? 3 : 2]);
  for (const y of [19, 23]) c.line(4, y, 27, y, PLANK[1]); // ร่องแผ่นไม้
  // ฝาโค้ง
  c.cylinder(4, 8, 24, 7, PLANK, 0.05);
  for (let x = 4; x < 28; x++) {
    const bulge = Math.round(Math.sin(((x - 4) / 23) * Math.PI) * 1.5);
    for (let y = 8 - bulge; y < 8; y++) c.set(x, y, PLANK[3]);
  }
  c.line(4, 15, 27, 15, PLANK[0]); // รอยต่อฝา
  // แถบเหล็กคาด
  for (const x of [7, 23]) {
    for (let y = 6; y < 28; y++) {
      c.set(x, y, METAL[2]);
      c.set(x + 1, y, METAL[1]);
    }
  }
  // กลอน
  box(c, 14, 13, 4, 5, METAL[1]);
  box(c, 15, 14, 2, 3, BRASS);
  c.outline();
  return c;
}

/** ถุงของที่ตกตอนสลบ: ถุงผ้ามัดปาก */
export function bag(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 28, 10, 2.2);
  c.sphere(16, 20, 9, 8, CLOTH, 0, false);
  c.sphere(16, 10, 4, 3, CLOTH, 0.1, false); // ปากถุงที่รวบ
  c.line(12, 12, 20, 12, "#6a4a2a"); // เชือกมัด
  c.line(12, 13, 20, 13, "#8a6a3a");
  c.line(20, 12, 23, 15, "#6a4a2a");
  // รอยผ้าย่น
  c.line(11, 17, 13, 24, CLOTH[1]);
  c.line(20, 18, 21, 25, CLOTH[1]);
  c.outline();
  return c;
}

/** ลังเสบียงจากโลกปัจจุบัน (32×48): ร่มชูชีพลายส้ม-ขาว + เชือก + ลังไม้คาดเทปเหลือง */
export function crate(): PixelCanvas {
  const c = new PixelCanvas(32, 48);
  c.shadow(16, 46, 13, 2.2);
  // ร่ม: ครึ่งวงรี แถบสลับส้ม/ขาว แสงซ้ายบน
  const orange: Ramp = ["#9a4a14", "#c8621e", "#f08a24", "#f8aa5a"];
  const white: Ramp = ["#a8a49c", "#ccc8c0", "#eeebe4", "#ffffff"];
  for (let y = 2; y < 13; y++)
    for (let x = 3; x < 29; x++) {
      const nx = (x + 0.5 - 16) / 13;
      const ny = (y + 0.5 - 13) / 11;
      if (nx * nx + ny * ny > 1) continue;
      const stripe = Math.floor(Math.atan2(ny, nx) * 2.5) & 1;
      const light = 0.85 - (nx + 0.3) * 0.35;
      const ramp = stripe ? white : orange;
      c.set(x, y, ramp[Math.max(0, Math.min(3, Math.round(light * 3)))]);
    }
  // เชือก 4 เส้นจากขอบร่มลงมุมลัง
  for (const [x0, x1] of [[4, 8], [11, 12], [21, 20], [28, 24]]) c.line(x0, 13, x1, 24, "#e8e0c8");
  // ลังไม้
  c.cylinder(6, 24, 20, 20, PLANK);
  for (const y of [29, 35, 40]) c.line(6, y, 25, y, PLANK[1]);
  c.line(7, 25, 24, 42, PLANK[1]);
  c.line(24, 25, 7, 42, PLANK[1]);
  // เทปเหลือง + ป้ายกล่อง
  for (let y = 32; y < 35; y++) c.line(6, y, 25, y, y === 32 ? "#f8d850" : "#e0b020");
  c.line(14, 32, 17, 32, "#2a2018");
  c.outline();
  return c;
}

/** กองไฟ: วงหิน + ฟืนไขว้ + เปลวไฟ (frame 0/1 สลับรูปเปลว) */
export function campfire(frame: 0 | 1): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 28, 13, 2.5);
  // ฟืนไขว้
  c.line(6, 25, 25, 19, WOOD[1]);
  c.line(6, 26, 25, 20, WOOD[2]);
  c.line(7, 19, 26, 25, WOOD[1]);
  c.line(7, 20, 26, 26, WOOD[3]);
  // วงหิน (หน้า)
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + (i / 6) * 0.9);
    c.sphere(16 - Math.cos(a) * 12, 23 + Math.sin(a) * 4, 2.6, 2.1, RAMPS.stone, 0.05);
  }
  // เปลวไฟ 3 ชั้น (นอกแดง → กลางส้ม → ในเหลือง) รูปเปลี่ยนตามเฟรม
  const sway = frame === 0 ? -1 : 1;
  const flame = (h: number, w: number, col: string, dx: number) => {
    for (let y = 0; y < h; y++) {
      const t = y / h; // 0 โคน … 1 ปลาย
      const half = w * (1 - t) ** 0.8 * (0.8 + 0.2 * Math.sin(t * 6 + frame * 2));
      const cx = 16 + dx + sway * t * 2;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) c.set(x, 21 - y, col);
    }
  };
  flame(frame === 0 ? 16 : 14, 6, "#d8401c", 0);
  flame(frame === 0 ? 12 : 13, 4.2, "#f08a24", sway * 0.5);
  flame(frame === 0 ? 7 : 8, 2.4, "#ffd860", 0);
  // ประกายไฟลอย
  c.set(16 + sway * 4, 3 + frame, "#ffd860");
  c.set(16 - sway * 3, 6 - frame, "#f08a24");
  c.outline(0.55);
  return c;
}
