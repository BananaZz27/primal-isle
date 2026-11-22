/**
 * กองไฟ — asset pack ไม่มี จึงวาดเองด้วยตัวอักษร (16×16, เปลวไฟ 2 เฟรม)
 * `.` = โปร่งใส · สีอยู่ใน CAMPFIRE_PALETTE
 */
export const CAMPFIRE_PALETTE: Record<string, string> = {
  k: "#2b1d14", // เส้นขอบ
  w: "#7a4a24", // ฟืน
  W: "#a8683a", // ฟืนด้านสว่าง
  s: "#8d8d8d", // หินรอบกองไฟ
  S: "#bdbdbd", // หินด้านสว่าง
  r: "#e8431f", // ไฟแดง
  o: "#f59a23", // ไฟส้ม
  y: "#ffe066", // ไฟเหลือง
};

const BASE = [
  "....kwWWWWwk....",
  "..kSskwwwwksSk..",
  ".kSssskkkkssSSk.",
  "..kkkk....kkkk..",
];

export const CAMPFIRE_FRAMES: string[][] = [
  [
    "................",
    "................",
    ".......r........",
    "......rr........",
    "......ror...r...",
    ".....rooor.rr...",
    "..r..royyorror..",
    "..rr.royyyoorr..",
    "..rorroyyyyoor..",
    "...roooyyyyor...",
    "...roooyyyoor...",
    "....rrooooorr...",
    ...BASE,
  ],
  [
    "................",
    "................",
    "........r.......",
    "........rr......",
    "...r...rorr.....",
    "...rr.roooor....",
    "..rorrroyyor.r..",
    "..roorooyyoorr..",
    "..rooooyyyyor...",
    "...rooyyyyyor...",
    "...roooyyyoor...",
    "....rrooooorr...",
    ...BASE,
  ],
];
