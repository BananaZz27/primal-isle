import type { ItemId } from "@primal/shared";
import { bed, campfire, chest, door, wall } from "./built";
import { darken, PixelCanvas, type Ramp } from "./canvas";
import { RAMPS, rock } from "./nature";

/**
 * ไอคอนของในกระเป๋า HD (32×32) — ของที่สร้างได้ใช้ภาพเดียวกับในโลก ที่เหลือวาดใหม่
 * วาดครั้งแรกที่ขอแล้วจำไว้ (กระเป๋าวาดใหม่บ่อย)
 */

const WOOD: Ramp = ["#4a2c18", "#6a4224", "#8a5a32", "#a8743f", "#c49058"];
const CUT: Ramp = ["#8a6a42", "#b08a5a", "#d2ae7a", "#ecd2a0"];
const STEEL: Ramp = ["#3a3e44", "#5e646c", "#8a9098", "#b8bec4", "#e4e8ec"];
const MEAT: Ramp = ["#6a1a1e", "#9a2a2c", "#c8443e", "#e8726a"];
const COOKED: Ramp = ["#4a2412", "#74391a", "#9a5428", "#c07a42"];
const BONE: Ramp = ["#a89c86", "#d2c8b2", "#f2ecdc"];

/** แท่งยาวเอียง (ด้าม) หนา w จาก a → b */
function rod(c: PixelCanvas, ax: number, ay: number, bx: number, by: number, w: number, ramp: Ramp): void {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay));
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n;
    const y = ay + ((by - ay) * i) / n;
    for (let k = 0; k < w; k++) c.set(x + k * 0.7, y - k * 0.7, ramp[Math.min(ramp.length - 1, 1 + k)]);
  }
}

function logs(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  // ท่อนซุง 2 ท่อนวางนอนซ้อนกัน มองด้านข้าง: ตัวเป็นทรงกระบอก (บนสว่าง ล่างมืด) ปลายซ้ายเห็นหน้าตัดมีวงปี
  for (const [y0, x0] of [[17, 4], [8, 8]] as const) {
    const h = 9;
    for (let yy = 0; yy < h; yy++) {
      const light = 0.9 - (yy / (h - 1)) * 0.75;
      for (let x = x0 + 2; x < x0 + 22; x++) c.set(x, y0 + yy, WOOD[Math.max(0, Math.min(4, Math.round(light * 4)))]);
    }
    for (let x = x0 + 6; x < x0 + 20; x += 5) c.line(x, y0 + 2, x + 3, y0 + 2, WOOD[1]); // ลายเปลือก
    c.line(x0 + 9, y0 + 6, x0 + 13, y0 + 6, WOOD[0]);
    c.sphere(x0 + 2, y0 + 4.5, 3, 4.5, CUT, 0.15, false); // หน้าตัด
    c.set(x0 + 2, y0 + 4, CUT[0]);
    for (const dy of [2, 7]) c.set(x0 + 2, y0 + dy, CUT[1]);
  }
  c.outline();
  return c;
}

function berries(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.sphere(20, 8, 6, 3, RAMPS.leaf, 0.1); // ใบ
  c.line(16, 10, 15, 14, RAMPS.leaf[1]);
  for (const [x, y] of [[11, 18], [19, 17], [14, 24], [22, 24], [8, 25]] as const) {
    c.sphere(x, y, 4.2, 4.2, RAMPS.berry, 0.05, false);
    c.set(x - 2, y - 2, "#ffd0d0");
  }
  c.outline();
  return c;
}

function fiber(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  // มัดหญ้าแห้ง มัดเชือกตรงกลาง
  const straw: Ramp = ["#6a7a2a", "#8a9a3a", "#a8b44e", "#c6cc6a", "#e0e08e"];
  for (let i = 0; i < 9; i++) {
    const x0 = 9 + i * 1.6;
    c.line(x0 - 4, 4, x0 + 3, 28, straw[1 + (i % 4)]);
  }
  for (let y = 14; y < 18; y++) c.line(8, y, 24, y + 2, y === 14 ? "#c8a66a" : "#8a6a3a");
  c.outline();
  return c;
}

function axe(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  rod(c, 7, 28, 22, 6, 3, WOOD);
  // หัวขวาน: แผ่นเหล็กครึ่งวงกลมทางขวาของด้าม
  c.sphere(22, 9, 7, 6, STEEL, 0.05);
  c.polygon([[16, 4], [21, 4], [21, 14], [16, 14]], STEEL, 0.5);
  for (let y = 4; y < 15; y++) c.set(28 - Math.abs(y - 9) * 0.5, y, STEEL[4]); // คมมีด
  c.outline();
  return c;
}

function hammer(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  rod(c, 8, 28, 19, 10, 3, WOOD);
  // หัวค้อน: ก้อนหินมัดเชือก
  c.polygon([[11, 4], [27, 9], [24, 17], [8, 12]], RAMPS.stone, 0.55);
  c.line(11, 4, 27, 9, RAMPS.stone[4]);
  c.line(16, 6, 14, 14, "#c8a66a");
  c.line(18, 7, 16, 15, "#8a6a3a");
  c.outline();
  return c;
}

function spear(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  rod(c, 4, 29, 22, 9, 2, WOOD);
  // ปลายหินแหลม + เชือกมัด
  c.polygon([[21, 11], [28, 3], [25, 12]], STEEL, 0.6);
  c.polygon([[20, 10], [28, 3], [22, 13]], RAMPS.stone, 0.45);
  for (let i = 0; i < 3; i++) c.line(18 + i, 12 + i, 21 + i, 15 + i, i === 1 ? "#8a6a3a" : "#c8a66a");
  c.outline();
  return c;
}

function roast(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.line(4, 28, 27, 5, "#c8a66a"); // ไม้เสียบ
  c.line(5, 28, 28, 5, "#8a6a3a");
  const charred: Ramp = ["#3a160e", "#6a2618", "#9a3e22", "#c46638"];
  for (const t of [0.3, 0.5, 0.7]) {
    const x = 4 + 23 * t;
    const y = 28 - 23 * t;
    c.sphere(x, y, 3.8, 3.8, charred, 0.05, false);
    c.set(x - 1, y - 2, "#e8a070");
  }
  c.outline();
  return c;
}

/** น่องไดโน: ก้อนเนื้อ + กระดูกยื่น */
function drumstick(meat: Ramp): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  rod(c, 7, 26, 15, 18, 3, BONE);
  c.sphere(6, 27, 3, 2.4, BONE, 0.1, false);
  c.sphere(8, 25, 2.4, 2.4, BONE, 0.1, false);
  c.sphere(19, 13, 9, 8, meat, 0.05, false);
  if (meat === MEAT) for (const [x, y] of [[16, 10], [22, 15], [18, 17]] as const) c.line(x, y, x + 3, y - 1, "#f4c8bc"); // ลายมัน
  else for (const [x, y] of [[15, 9], [21, 12], [17, 16]] as const) c.line(x, y, x + 4, y + 2, darken(meat[0], 0.6)); // รอยย่าง
  c.outline();
  return c;
}

function canned(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  c.cylinder(8, 7, 16, 20, STEEL);
  c.cylinder(8, 11, 16, 12, ["#7a1c18", "#a82a22", "#d0402e", "#e86a50"]); // ฉลาก
  c.sphere(16, 17, 4, 3.2, ["#a85a14", "#d8862a", "#f4b04e"], 0.1, false); // รูปอาหาร
  c.sphere(16, 7, 8, 2, STEEL, 0.25, false); // ฝาบน
  c.sphere(16, 27, 8, 1.6, STEEL, -0.1, false);
  c.outline();
  return c;
}

function bottle(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const water: Ramp = ["#3a7aa8", "#5a9ac8", "#8fc8ec", "#c8e8fa"];
  c.cylinder(10, 10, 12, 19, water);
  c.cylinder(13, 6, 6, 4, water, 0.1);
  c.cylinder(13, 3, 6, 3, ["#123a6a", "#1f5a9a", "#3a7ac0"]); // ฝา
  c.cylinder(10, 15, 12, 6, ["#123a6a", "#1f5a9a", "#3a7ac0", "#6aa0d8"]); // ฉลาก
  c.line(12, 12, 12, 27, "#eef8ff"); // แสงสะท้อน
  c.outline();
  return c;
}

function bandage(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const cloth: Ramp = ["#a8a49c", "#ccc8c0", "#eeebe4", "#ffffff"];
  // ม้วนผ้า + ปลายผ้าคลี่
  c.polygon([[14, 20], [29, 23], [28, 28], [14, 26]], cloth, 0.65);
  c.sphere(12, 16, 9, 9, cloth, 0.05, false);
  c.sphere(12, 16, 3, 3, ["#8a867e", "#a8a49c"], 0, false); // แกนม้วน
  // กากบาทแดง
  for (let k = -3; k <= 3; k++) {
    c.set(22 + k, 9, "#d0342c");
    c.set(22 + k, 10, "#d0342c");
    c.set(22, 9 + k, "#d0342c");
    c.set(23, 9 + k, "#d0342c");
  }
  c.outline();
  return c;
}

/** หัวใจ (แถบเลือด) */
function heart(): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const red: Ramp = ["#7a1420", "#b0222e", "#e0403e", "#f47a6e", "#ffc0b8"];
  c.sphere(11, 12, 7, 7, red, 0.05, false);
  c.sphere(21, 12, 7, 7, red, -0.05, false);
  c.polygon([[4.5, 14], [27.5, 14], [16, 28]], red, 0.45);
  c.set(9, 9, "#ffffff");
  c.set(10, 9, "#ffe0dc");
  c.outline();
  return c;
}

/** ไอคอนที่ไม่ใช่ของในกระเป๋า (หน้าจอสถานะ) */
export type ExtraIcon = "heart";

const DRAW: Record<ItemId | ExtraIcon, () => PixelCanvas> = {
  heart,
  wood: logs,
  stone: () => rock(0),
  berry: berries,
  fiber,
  axe,
  hammer,
  campfire: () => campfire(0),
  roast,
  wall,
  door,
  bed,
  meat: () => drumstick(MEAT),
  steak: () => drumstick(COOKED),
  spear,
  canned,
  bottle,
  bandage,
  chest,
};

const cache = new Map<ItemId | ExtraIcon, PixelCanvas>();

/** ไอคอน HD ของของชิ้นนี้ (32×32) */
export function hdIcon(id: ItemId | ExtraIcon): PixelCanvas {
  let c = cache.get(id);
  if (!c) cache.set(id, (c = DRAW[id]()));
  return c;
}
