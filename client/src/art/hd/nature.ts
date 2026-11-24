import { PixelCanvas, rampAt, rng, type Ramp } from "./canvas";

/** ramp ของวัสดุธรรมชาติ (มืด → สว่าง) */
export const RAMPS = {
  grass: ["#2f5d27", "#3f7a2e", "#4f9334", "#63a83b", "#7dbd48"],
  leaf: ["#173a24", "#1f5030", "#2a6a3a", "#3a8644", "#56a24f", "#7cbd5c"],
  bark: ["#3b2416", "#57351f", "#714629", "#8c5a35"],
  stone: ["#3e4048", "#575a63", "#72757d", "#8f9299", "#b2b4b8"],
  berry: ["#5c0f1e", "#9b1b2c", "#d4303c", "#f06a6a"],
} satisfies Record<string, Ramp>;

/** หญ้า 1 ช่อง (32×32) ต่อกันได้ไร้รอยต่อ — variant เปลี่ยนลายใบหญ้า */
export function grassTile(variant = 0): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const r = rng(1000 + variant);
  // พื้น: เป็นหย่อมอ่อน/เข้ม 3 ระดับ (ไม่ dither ทั้งผืน ไม่งั้นดูเป็นจุดซ่าเหมือนทีวี)
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const a = (2 * Math.PI) / 32; // คลื่นครบรอบพอดี 32 พิกเซล → ต่อกันไร้รอย
      const wave = Math.sin(x * a * 2 + variant) * 0.5 + Math.cos(y * a * 3 - variant * 2) * 0.35 + Math.sin((x + y) * a) * 0.3;
      const level = wave > 0.55 ? 3 : wave < -0.6 ? 1 : 2;
      c.set(x, y, RAMPS.grass[r() < 0.04 ? level + (r() < 0.5 ? -1 : 1) : level]);
    }
  // ใบหญ้าเป็นกอเล็กๆ: ขีดสั้น 2–3 พิกเซล โคนเข้ม ปลายอ่อน (วนรอบขอบ → ต่อกันได้)
  for (let i = 0; i < 9; i++) {
    const cx = Math.floor(r() * 32);
    const cy = Math.floor(r() * 32);
    for (let b = 0; b < 3; b++) {
      const x = cx + b * 2 - 2;
      const tall = 2 + ((b + i) % 2);
      const lean = b === 0 ? -1 : b === 2 ? 1 : 0;
      for (let k = 0; k < tall; k++) {
        const px = (x + (k === tall - 1 ? lean : 0) + 32) % 32;
        const py = (cy - k + 32) % 32;
        c.set(px, py, RAMPS.grass[k === 0 ? 1 : k === tall - 1 ? 4 : 3]);
      }
    }
  }
  return c;
}

/** ต้นไม้ (64×64 = กว้าง 2 ช่อง สูง 2 ช่อง เท่าต้นเดิม) พุ่มใบกลมหลายก้อน ลำต้นมีลายเปลือก */
export function tree(variant = 0): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const r = rng(2000 + variant);
  c.shadow(32, 59, 20, 4.5);
  // ลำต้น + โคนบาน
  c.cylinder(28, 40, 9, 19, RAMPS.bark);
  c.polygon([[24, 60], [28, 54], [37, 54], [41, 60]], RAMPS.bark, 0.35);
  for (let i = 0; i < 7; i++) {
    const x = 29 + Math.floor(r() * 7);
    const y0 = 42 + Math.floor(r() * 12);
    c.line(x, y0, x, y0 + 2 + Math.floor(r() * 3), RAMPS.bark[0]);
  }
  // พุ่มใบ: ก้อนหลัง (มืดกว่า) → ก้อนหน้า
  const blobs: [number, number, number, number, number][] = [
    [17, 33, 13, 9, -0.12],
    [47, 33, 13, 9, -0.14],
    [32, 37, 16, 8, -0.06],
    [32, 24, 22, 14, 0],
    [20, 19, 12, 9, 0.04],
    [43, 16, 12, 9, 0.05],
    [30, 10, 11, 7, 0.1],
  ];
  for (const [x, y, rx, ry, lift] of blobs) c.sphere(x, y, rx, ry, RAMPS.leaf, lift);
  // ช่อใบ: กลุ่มจุดสว่างด้านที่โดนแสง กลุ่มจุดมืดด้านเงา → ดูเป็นใบไม้ ไม่ใช่ลูกบอล
  for (let i = 0; i < 170; i++) {
    const x = 4 + Math.floor(r() * 56);
    const y = 3 + Math.floor(r() * 40);
    if (c.alpha(x, y) < 255 || c.alpha(x + 1, y) < 255 || c.alpha(x, y + 1) < 255) continue;
    const lit = (x - 32) * -0.45 + (y - 24) * -0.7 + (r() - 0.5) * 14 > 0;
    c.set(x, y, lit ? RAMPS.leaf[5] : RAMPS.leaf[1]);
    c.set(x + 1, y, lit ? RAMPS.leaf[4] : RAMPS.leaf[0]);
    if (r() < 0.5) c.set(x, y + 1, lit ? RAMPS.leaf[4] : RAMPS.leaf[1]);
  }
  c.outline();
  return c;
}

/** ก้อนหิน (32×32) ทรงมน ด้านบนเรียบ มีรอยแตก */
export function rock(variant = 0): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const r = rng(3000 + variant);
  c.shadow(16, 27, 12, 3.5);
  c.sphere(15, 19, 12, 9, RAMPS.stone);
  c.sphere(21, 21, 7, 6, RAMPS.stone, -0.08);
  c.sphere(11, 16, 6, 4, RAMPS.stone, 0.1);
  // รอยแตก
  let x = 12 + Math.floor(r() * 4);
  let y = 13;
  for (let i = 0; i < 6; i++) {
    c.set(x, y, RAMPS.stone[0]);
    c.set(x + 1, y, RAMPS.stone[1]);
    x += r() < 0.5 ? 1 : 0;
    y += 1;
  }
  // ประกายบนหิน
  for (let i = 0; i < 6; i++) c.set(8 + Math.floor(r() * 8), 13 + Math.floor(r() * 3), RAMPS.stone[4]);
  c.outline();
  return c;
}

/** พุ่มผลไม้ (32×32) — ripe = มีผลสีแดง (เก็บได้) */
export function bush(ripe = true, variant = 0): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const r = rng(4000 + variant);
  c.shadow(16, 28, 12, 3);
  c.sphere(9, 21, 7, 6, RAMPS.leaf, -0.08);
  c.sphere(23, 21, 7, 6, RAMPS.leaf, -0.1);
  c.sphere(16, 17, 9, 8, RAMPS.leaf, 0.05);
  for (let i = 0; i < 30; i++) {
    const x = 3 + Math.floor(r() * 26);
    const y = 9 + Math.floor(r() * 18);
    if (c.alpha(x, y) < 255) continue;
    c.set(x, y, (x - 16) * -0.5 + (y - 18) * -0.6 > 0 ? RAMPS.leaf[5] : RAMPS.leaf[1]);
  }
  if (ripe)
    for (let i = 0; i < 7; i++) {
      const x = 6 + Math.floor(r() * 20);
      const y = 12 + Math.floor(r() * 12);
      if (c.alpha(x, y) < 255) continue;
      c.set(x + 1, y, RAMPS.berry[1]);
      c.set(x, y + 1, RAMPS.berry[1]);
      c.set(x + 1, y + 1, RAMPS.berry[0]);
      c.set(x, y, RAMPS.berry[3]);
    }
  c.outline();
  return c;
}
