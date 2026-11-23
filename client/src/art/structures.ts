/**
 * สิ่งก่อสร้างและถุงของ — วาดเองด้วยตัวอักษร 16×16 (asset pack ไม่มีแบบช่องเดียวที่ใช้ได้)
 * โทนสีไม้/เส้นขอบให้เข้ากับ tileset ของ Pixel-boy
 */
export const BUILD_PALETTE: Record<string, string> = {
  k: "#2b1d14", // เส้นขอบ
  w: "#7a4a24", // ไม้เข้ม
  W: "#a8683a", // ไม้กลาง
  L: "#c98a52", // ไม้สว่าง
  r: "#b8382f", // ผ้าห่มแดง
  R: "#e25a4a", // ผ้าห่มสว่าง
  c: "#f1e3c6", // หมอน/ผ้า
  b: "#8a6a3e", // ถุงผ้า
  B: "#b8925a", // ถุงสว่าง
  t: "#5a3a1e", // เชือก
  m: "#6e737a", // แถบเหล็ก
  y: "#f2c230", // กลอนทองเหลือง
};

/** กำแพงไม้: ซุงตั้ง 4 ต้น ปลายแหลม */
export const WALL = [
  ".k..k..k..k..k..",
  "kWk.kWkkWkkWkkWk",
  "kWLkkWLkWLkWLkWk",
  "kWLwkWLwWLwWLwWk",
  "kWLwkWLwWLwWLwWk",
  "kkkkkkkkkkkkkkkk",
  "kWLwkWLwWLwWLwWk",
  "kWLwkWLwWLwWLwWk",
  "kWLwkWLwWLwWLwWk",
  "kWLwkWLwWLwWLwWk",
  "kkkkkkkkkkkkkkkk",
  "kWLwkWLwWLwWLwWk",
  "kWLwkWLwWLwWLwWk",
  "kWLwkWLwWLwWLwWk",
  "kwwwkwwwwwwwwwwk",
  "kkkkkkkkkkkkkkkk",
];

/** ประตูไม้ (เปิดอยู่: เห็นกรอบและบานเปิด) */
export const DOOR = [
  "................",
  "kkkkkkkkkkkkkkkk",
  "kWLWLWLWLWLWLWLk",
  "kWk..........kWk",
  "kWk..........kLk",
  "kWk..........kLk",
  "kWk..........kLk",
  "kWk..........kLk",
  "kWk.........kLLk",
  "kWk........kLWLk",
  "kWk.......kLWWLk",
  "kWk......kLWtWLk",
  "kWk.......kWWWLk",
  "kWk........kWWLk",
  "kwk.........kwwk",
  "kkk..........kkk",
];

/** ที่นอน: ฟูกผ้าห่มแดง + หมอน */
export const BED = [
  "................",
  "................",
  "..kkkkkkkkkkkk..",
  ".kcccckRRRRRRRk.",
  ".kcccckRrRRrRRk.",
  ".kcccckRRRRRRRk.",
  ".kkkkkkRrRRrRRk.",
  ".kRRRRRRRRRRRRk.",
  ".kRrRRrRRrRRrRk.",
  ".kRRRRRRRRRRRRk.",
  ".krrrrrrrrrrrrk.",
  ".kwwwwwwwwwwwwk.",
  ".kkkkkkkkkkkkkk.",
  "................",
  "................",
  "................",
];

/** กล่องเก็บของ: หีบไม้คาดแถบเหล็ก มีกลอนตรงกลาง */
export const CHEST = [
  "................",
  "................",
  "................",
  "..kkkkkkkkkkkk..",
  ".kLLLLLLLLLLLLk.",
  ".kWWWWWWWWWWWWk.",
  ".kmmmmmmmmmmmmk.",
  ".kWWWWWkkWWWWWk.",
  ".kkkkkkyykkkkkk.",
  ".kWWWWWyyWWWWWk.",
  ".kWLLLLkkLLLLWk.",
  ".kmmmmmmmmmmmmk.",
  ".kWLLLLLLLLLLWk.",
  ".kwwwwwwwwwwwwk.",
  ".kkkkkkkkkkkkkk.",
  "................",
];

/** ถุงของที่ตกตอนสลบ */
export const BAG = [
  "................",
  "................",
  "................",
  "......kkkk......",
  ".....ktttk......",
  "......kttk......",
  ".....kBBBBk.....",
  "....kBBbBBBk....",
  "...kBBbBBBBBk...",
  "...kBbBBBBBBk...",
  "..kBBbBBBBBbBk..",
  "..kBBBBBBBBbBk..",
  "..kbBBBBBBBbbk..",
  "...kbbbbbbbbk...",
  "....kkkkkkkk....",
  "................",
];
