import { darken, PixelCanvas, type Ramp } from "./canvas";

/**
 * ผู้รอดชีวิต HD (คนสมัยใหม่ที่ติดเกาะ) — สัดส่วนหัวโต 32×32 ต่อเฟรม
 * แผ่นภาพ 4×4: คอลัมน์ = ทิศ (ลง ขึ้น ซ้าย ขวา) · แถว = ท่าเดิน (ยืน ก้าว ยืน ก้าวอีกข้าง) — ตรงกับ walkFrames()
 * ทิศขวา = ทิศซ้ายกลับด้าน
 */

export type Hair = "short" | "long" | "ponytail" | "afro" | "buzz" | "bun";
export type Hat = "none" | "safari" | "cap" | "bandana" | "beanie";

export interface Outfit {
  skin: string;
  hair: string;
  hairStyle: Hair;
  hat: Hat;
  hatColour?: string;
  shirt: string;
  pants: string;
  shoes: string;
  /** กางเกงขาสั้น (เห็นขา) */
  shorts?: boolean;
  /** เป้หลัง (เห็นตอนหันหลัง/ด้านข้าง) */
  backpack?: string;
}

/** id ของชุด (ใช้ตั้งชื่อ texture/animation) — ลำดับเดียวกับ OUTFITS */
export const survivorIdOf = (colorIndex: number): string => String(colorIndex % OUTFITS.length);

/** 8 แบบตาม colorIndex ของผู้เล่น */
export const OUTFITS: Outfit[] = [
  { skin: "#d9a066", hair: "#4a2e1a", hairStyle: "short", hat: "safari", hatColour: "#c8b282", shirt: "#b39a62", pants: "#6a4a2e", shoes: "#3a2a1c", backpack: "#7a5a32" },
  { skin: "#f0c8a0", hair: "#8a5a2a", hairStyle: "short", hat: "cap", hatColour: "#c83a2e", shirt: "#3a6ab0", pants: "#3a4a6a", shoes: "#e8e4dc" },
  { skin: "#c88a58", hair: "#2a1c14", hairStyle: "ponytail", hat: "none", shirt: "#4a8a48", pants: "#2e3038", shoes: "#5a3a24" },
  { skin: "#8a5a3a", hair: "#1c1410", hairStyle: "buzz", hat: "bandana", hatColour: "#e07a2e", shirt: "#ece6da", pants: "#a89270", shoes: "#4a3a2a", shorts: true },
  { skin: "#6a4228", hair: "#1a1210", hairStyle: "afro", hat: "none", shirt: "#e8b832", pants: "#5a5e66", shoes: "#2a2a2e", backpack: "#3a5a8a" },
  { skin: "#f4d2b2", hair: "#e8c870", hairStyle: "long", hat: "none", shirt: "#7a4aa0", pants: "#24242a", shoes: "#6a3a2a" },
  { skin: "#d8a070", hair: "#5a3a22", hairStyle: "short", hat: "beanie", hatColour: "#6a6e74", shirt: "#5a6a3a", pants: "#5a4030", shoes: "#2e2420", backpack: "#8a3a2a" },
  { skin: "#b07a4a", hair: "#2a1a12", hairStyle: "bun", hat: "none", shirt: "#2e8a8a", pants: "#2a3456", shoes: "#d8d4cc" },
];

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.round(v + (255 - v) * amount).toString(16).padStart(2, "0");
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** สีเดียว → ramp 5 ขั้น (มืด → สว่าง) */
const rampOf = (hex: string): Ramp => [darken(hex, 0.5), darken(hex, 0.72), darken(hex, 0.87), hex, lighten(hex, 0.25)];

/** สี่เหลี่ยมทึบ */
function box(c: PixelCanvas, x0: number, y0: number, w: number, h: number, col: string): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.set(x, y, col);
}

type Step = -1 | 0 | 1; // ก้าวขาซ้าย / ยืน / ก้าวขาขวา
type View = "front" | "back" | "side";

/** ขา + รองเท้า (ด้านหน้า/หลัง): ขาที่ก้าวยกขึ้น 1 */
function legsFrontBack(c: PixelCanvas, o: Outfit, step: Step): void {
  const P = rampOf(o.pants);
  const S = rampOf(o.skin);
  for (const [side, x0] of [[-1, 12], [1, 17]] as const) {
    const lift = step === side ? 1 : 0;
    // ขาบน = กางเกง · ขาสั้น: ล่างเป็นผิว
    box(c, x0, 23, 3, o.shorts ? 2 : 5 - lift, P[side < 0 ? 3 : 2]);
    if (o.shorts) box(c, x0, 25, 3, 3 - lift, S[side < 0 ? 3 : 2]);
    box(c, x0 - (side < 0 ? 1 : 0), 28 - lift, 4, 2, o.shoes);
    c.set(x0 + (side < 0 ? 0 : 2), 28 - lift, lighten(o.shoes, 0.3));
  }
}

/** ขาด้านข้าง (หันซ้าย): ขาหน้า/หลังเหวี่ยงตาม step */
function legsSide(c: PixelCanvas, o: Outfit, step: Step): void {
  const P = rampOf(o.pants);
  const S = rampOf(o.skin);
  const legs: [number, number][] = step === 0 ? [[15, 2], [14, 3]] : [[15 + step * 2, 2], [15 - step * 2, 3]]; // [x, ความสว่าง] ขาไกลก่อน
  for (const [x0, light] of legs) {
    box(c, x0, 23, 3, o.shorts ? 2 : 5, P[light]);
    if (o.shorts) box(c, x0, 25, 3, 3, S[light]);
    box(c, x0 - 1, 28, 4, 2, o.shoes);
  }
}

/** ลำตัว + แขน */
function torso(c: PixelCanvas, o: Outfit, view: View, step: Step): void {
  const T = rampOf(o.shirt);
  const S = rampOf(o.skin);
  if (view === "side") {
    if (o.backpack) c.sphere(20, 19, 3, 4, rampOf(o.backpack)); // เป้ด้านหลัง (ขวาของคนหันซ้าย)
    c.cylinder(12, 15, 8, 9, T);
    // แขนเหวี่ยงสวนกับขา
    const swing = -step * 2;
    box(c, 15 + swing, 16, 3, 5, T[2]);
    box(c, 15 + swing, 21, 3, 2, S[3]);
    return;
  }
  c.cylinder(10, 15, 12, 9, T);
  // คอเสื้อ / แถบชายเสื้อ
  box(c, 10, 23, 12, 1, T[1]);
  if (view === "front") box(c, 14, 15, 4, 1, S[2]);
  if (view === "back" && o.backpack) {
    const B = rampOf(o.backpack);
    c.sphere(16, 19, 4.5, 4.5, B);
    box(c, 12, 16, 1, 6, B[0]);
    box(c, 19, 16, 1, 6, B[0]);
  }
  for (const [side, x0] of [[-1, 8], [1, 22]] as const) {
    const swing = step === -side ? 1 : 0; // แขนเหวี่ยงสวนกับขา
    box(c, x0, 16 + swing, 2, 5, T[side < 0 ? 3 : 1]);
    box(c, x0, 21 + swing, 2, 2, S[side < 0 ? 3 : 2]);
  }
}

/** ผมที่อยู่ "หลังหัว" (ผมยาว หางม้า) */
function hairBehind(c: PixelCanvas, o: Outfit, view: View): void {
  const H = rampOf(o.hair);
  if (o.hairStyle === "long") {
    if (view === "side") box(c, 17, 7, 5, 10, H[2]);
    else box(c, 9, 8, 14, view === "back" ? 10 : 8, H[2]);
  }
  if (o.hairStyle === "ponytail") {
    if (view === "side") c.sphere(22, 11, 2.5, 4, H, -0.1);
    if (view === "back") c.sphere(16, 15, 2.5, 4, H);
  }
}

/** หัว ใบหน้า ผม หมวก */
function head(c: PixelCanvas, o: Outfit, view: View): void {
  const S = rampOf(o.skin);
  const H = rampOf(o.hair);
  const cy = 9.5;
  c.sphere(16, cy, 7, 6.5, S, 0.1, false);
  // ผม: ด้านหลังเต็มหัว · ด้านหน้าครอบส่วนบน · ด้านข้างครอบหลังหัว
  const afro = o.hairStyle === "afro";
  if (afro) c.sphere(16, cy - 1.5, 8, 6.5, H, 0.05);
  else if (view === "back") c.sphere(16, cy, 7, 6.5, H);
  else if (o.hairStyle !== "buzz") {
    for (let y = 3; y < 16; y++)
      for (let x = 8; x < 25; x++) {
        const nx = (x + 0.5 - 16) / 7;
        const ny = (y + 0.5 - cy) / 6.5;
        if (nx * nx + ny * ny > 1) continue;
        const cover = view === "side" ? x >= 16 || y < 7 : y < 7 || (y < 10 && Math.abs(nx) > 0.75);
        if (cover) c.set(x, y, H[Math.max(0, Math.min(4, Math.round(3 - nx - ny)))]);
      }
  } else for (let x = 10; x < 23; x++) c.set(x, 4, H[2]); // ผมเกรียน: แค่แนวบน
  if (o.hairStyle === "bun") c.sphere(view === "side" ? 20 : 16, 4.2, 2.6, 2, H, 0.1);
  if (afro && view !== "back") box(c, 11, 8, 10, 1, H[1]);

  // ใบหน้า
  if (view === "front") {
    box(c, 12, 10, 2, 2, "#1c1410");
    box(c, 18, 10, 2, 2, "#1c1410");
    c.set(12, 10, "#f4ecdf");
    c.set(18, 10, "#f4ecdf");
    c.set(15, 13, darken(o.skin, 0.75));
    c.set(16, 13, darken(o.skin, 0.75));
  } else if (view === "side") {
    box(c, 11, 10, 2, 2, "#1c1410");
    c.set(11, 10, "#f4ecdf");
    c.set(9, 11, S[2]); // จมูก
    c.set(11, 13, darken(o.skin, 0.75));
  }

  // หมวก
  const K = rampOf(o.hatColour ?? o.hair);
  switch (o.hat) {
    case "safari":
      c.sphere(16, 4.5, 6, 3, K, 0.05);
      box(c, view === "side" ? 6 : 7, 6, view === "side" ? 19 : 18, 2, K[2]);
      box(c, 10, 5, 12, 1, darken(K[2], 0.7)); // แถบหมวก
      break;
    case "cap":
      c.sphere(16, 5, 7, 3, K, 0.05);
      if (view === "front") box(c, 10, 7, 12, 2, K[1]);
      if (view === "side") box(c, 5, 7, 6, 2, K[1]); // ปีกหมวกยื่นหน้า
      break;
    case "bandana":
      box(c, 9, 5, 14, 3, K[3]);
      box(c, 9, 7, 14, 1, K[1]);
      if (view !== "front") c.sphere(view === "side" ? 23 : 16, 9, 1.6, 2.2, K, -0.1); // ปมผ้า
      break;
    case "beanie":
      c.sphere(16, 5.5, 7.2, 4, K, 0.05);
      box(c, 9, 7, 14, 2, K[1]);
      break;
    case "none":
      break;
  }
}

/** วาด 1 เฟรม (หันลง/ขึ้น/ซ้าย) */
function frame(o: Outfit, view: View, step: Step): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.shadow(16, 29.5, 6.5, 1.6, 0.3);
  hairBehind(c, o, view);
  if (view === "side") legsSide(c, o, step);
  else legsFrontBack(c, o, step);
  torso(c, o, view, step);
  head(c, o, view);
  c.outline(0.42);
  return c;
}

function copyInto(dst: PixelCanvas, src: PixelCanvas, ox: number, oy: number, mirror = false): void {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + (mirror ? src.width - 1 - x : x)) * 4;
      const di = ((oy + y) * dst.width + ox + x) * 4;
      dst.data.set(src.data.subarray(si, si + 4), di);
    }
}

/** แผ่นภาพ 128×128 ของชุดนี้ (4 ทิศ × 4 ท่าเดิน: ยืน ก้าวซ้าย ยืน ก้าวขวา) */
export function survivorSheet(o: Outfit): PixelCanvas {
  const sheet = new PixelCanvas(128, 128);
  const steps: Step[] = [0, -1, 0, 1];
  steps.forEach((step, row) => {
    const views: [View, number, boolean][] = [
      ["front", 0, false],
      ["back", 1, false],
      ["side", 2, false],
      ["side", 3, true], // หันขวา = หันซ้ายกลับด้าน
    ];
    for (const [view, col, mirror] of views) copyInto(sheet, frame(o, view, step), col * 32, row * 32, mirror);
  });
  return sheet;
}
