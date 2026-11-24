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
  // พื้น: หย่อมอ่อน/เข้มวางสุ่มต่อแบบ (วนรอบขอบ → ต่อกันได้) — ไม่ใช้คลื่น sin ซึ่งทำให้เห็นเป็นตาราง
  const blobs = Array.from({ length: 6 }, (_, i) => ({ x: r() * 32, y: r() * 32, rad: 3 + r() * 4, lighter: i % 2 === 0 }));
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      let level = 2;
      for (const b of blobs) {
        const dx = Math.min(Math.abs(x - b.x), 32 - Math.abs(x - b.x));
        const dy = Math.min(Math.abs(y - b.y), 32 - Math.abs(y - b.y));
        const d = Math.hypot(dx, dy * 1.3) / b.rad;
        // หย่อมเป็นลายตาข่ายครึ่งหนึ่ง (dither) → อ่อน/เข้มขึ้นนิดเดียว ไม่เห็นเป็นจุดซ้ำ
        if (d < 1 && ((x + y) & 1) === 0) level = b.lighter ? 3 : 1;
      }
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

/** ก้อนหิน (32×32) ทรงมน มีรอยแตก · variant 0 = ก้อนใหญ่, 1 = ก้อนเล็ก */
export function rock(variant = 0): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const r = rng(3000 + variant);
  const k = variant === 1 ? 0.62 : 1; // ก้อนเล็กย่อทุกส่วน
  const by = 27; // แนวพื้น
  c.shadow(16, by, 12 * k, 3.5 * k);
  c.sphere(15, by - 8 * k, 12 * k, 9 * k, RAMPS.stone);
  c.sphere(15 + 6 * k, by - 6 * k, 7 * k, 6 * k, RAMPS.stone, -0.08);
  c.sphere(15 - 4 * k, by - 11 * k, 6 * k, 4 * k, RAMPS.stone, 0.1);
  // รอยแตก
  let x = Math.round(15 - 3 * k + r() * 3 * k);
  let y = Math.round(by - 14 * k);
  for (let i = 0; i < Math.round(6 * k); i++) {
    c.set(x, y, RAMPS.stone[0]);
    c.set(x + 1, y, RAMPS.stone[1]);
    x += r() < 0.5 ? 1 : 0;
    y += 1;
  }
  // ประกายบนหิน
  for (let i = 0; i < 6 * k; i++) c.set(15 - 7 * k + Math.floor(r() * 8 * k), by - 14 * k + Math.floor(r() * 3), RAMPS.stone[4]);
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

/** ต้นสน (64×64): ใบเป็นชั้นสามเหลี่ยมซ้อนกัน 4 ชั้น ลำต้นสั้น */
export function pineTree(variant = 0): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const r = rng(2500 + variant);
  c.shadow(32, 59, 16, 4);
  c.cylinder(29, 44, 7, 15, RAMPS.bark);
  c.polygon([[26, 60], [29, 55], [36, 55], [39, 60]], RAMPS.bark, 0.35);
  // ชั้นใบจากล่าง (กว้าง) ขึ้นบน (แคบ) — ด้านซ้ายโดนแสง ด้านขวาเงา
  const tiers: [number, number, number][] = [
    [50, 22, 16],
    [38, 18, 15],
    [27, 14, 13],
    [17, 9, 11],
  ];
  for (const [base, half, h] of tiers) {
    for (let y = base - h; y <= base; y++) {
      const w = (half * (y - (base - h))) / h;
      for (let x = Math.round(32 - w); x <= Math.round(32 + w); x++) {
        const side = (x - 32) / (w + 0.01); // -1 ซ้าย … +1 ขวา
        const light = 0.62 - side * 0.32 - ((y - (base - h)) / h) * 0.18;
        c.set(x, y, RAMPS.leaf[Math.max(0, Math.min(5, Math.round(light * 5)))]);
      }
    }
    // ขอบล่างของชั้นเป็นหยัก (ปลายกิ่ง)
    for (let x = 32 - half; x <= 32 + half; x += 3) c.set(x, base + 1, RAMPS.leaf[1]);
  }
  c.set(32, 7, RAMPS.leaf[4]);
  // จุดใบ
  for (let i = 0; i < 60; i++) {
    const x = 12 + Math.floor(r() * 40);
    const y = 8 + Math.floor(r() * 42);
    if (c.alpha(x, y) < 255) continue;
    c.set(x, y, x < 32 ? RAMPS.leaf[5] : RAMPS.leaf[0]);
  }
  c.outline();
  return c;
}

/** ตอไม้ (32×32): ต้นไม้ที่ถูกตัดหมด เห็นวงปีด้านบน */
export function stump(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 27, 10, 3);
  c.polygon([[8, 27], [10, 23], [22, 23], [24, 27]], RAMPS.bark, 0.3); // รากบาน
  c.cylinder(10, 16, 12, 9, RAMPS.bark);
  // หน้าตัดด้านบน: วงรีสีเนื้อไม้ + วงปี
  const wood = ["#8a6a42", "#b08a5a", "#d2ae7a", "#ecd2a0"];
  c.sphere(16, 16, 6, 2.4, wood, 0.15);
  for (let x = 12; x <= 20; x++) if (x % 3 === 0) c.set(x, 16, wood[0]);
  c.set(16, 16, wood[0]);
  c.outline();
  return c;
}

/** กอหญ้า (32×32): ใบหญ้ายาวโค้งเป็นกอ (เก็บได้เส้นใย) */
export function tuft(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const r = rng(4500);
  c.shadow(16, 27, 9, 2.5);
  const blades = 11;
  for (let i = 0; i < blades; i++) {
    const t = i / (blades - 1); // 0 ซ้าย … 1 ขวา
    const baseX = 11 + t * 10;
    const tipX = 4 + t * 24 + (r() - 0.5) * 3;
    const tipY = 8 + Math.abs(t - 0.5) * 12 + r() * 3;
    const light = 0.75 - t * 0.45;
    // ใบโค้ง: จากโคนตรงขึ้นแล้วเอนออก
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const x = baseX + (tipX - baseX) * u * u;
      const y = 27 - (27 - tipY) * u;
      c.set(x, y, RAMPS.grass[Math.max(0, Math.min(4, Math.round((light + u * 0.25) * 4)))]);
      if (u < 0.5) c.set(x + 1, y, RAMPS.grass[Math.max(0, Math.round(light * 4) - 1)]);
    }
  }
  c.outline(0.5);
  return c;
}
