/**
 * ภาพพิกเซลทั้งหมดของขั้นที่ 1–2 — Claude วาดเองด้วยโค้ด (ดูสีใน palette.ts)
 * ทุกภาพขนาด 16×16
 */

/** ผู้รอดชีวิต (มองจากด้านหน้า-บน) — ส่วน `w` คือเสื้อ จะถูกย้อมสีตามผู้เล่น */
export const SURVIVOR = [
  "................",
  "......kkkk......",
  ".....khhhhk.....",
  "....khhhhhhk....",
  "....khsssshk....",
  "....kskssksk....",
  "....kssssssk....",
  ".....kkssskk....",
  "....kwwwwwwk....",
  "...kswwwwwwsk...",
  "...kswwwwwwsk...",
  "....kwwwwwwk....",
  "....kppppppk....",
  "....kppkkppk....",
  "....kbbk.kbbk...",
  "................",
];

/** เฉพาะส่วนเสื้อ ใช้วางทับแล้วย้อมสี (tint) โดยไม่ทำให้ผิวเปลี่ยนสี */
export const SURVIVOR_SHIRT = SURVIVOR.map((row) => row.replace(/[^w]/g, "."));

/**
 * สร้างภาพ 16×16 จากสูตร: เลือกตัวอักษรของแต่ละพิกเซลด้วยฟังก์ชัน
 * ใช้ "แฮช" ของพิกัดแทนการสุ่ม ภาพจึงออกมาเหมือนเดิมทุกครั้ง
 */
function tile(pick: (x: number, y: number, n: number) => string): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 16; y++) {
    let row = "";
    for (let x = 0; x < 16; x++) row += pick(x, y, (x * 7 + y * 13 + x * y) % 17);
    rows.push(row);
  }
  return rows;
}

const WATER = tile((x, y, n) => {
  // เส้นคลื่นสั้นๆ 2 แถว
  if ((y === 4 && x >= 2 && x <= 6) || (y === 11 && x >= 9 && x <= 13)) return "3";
  return n < 4 ? "2" : "1";
});

const SAND = tile((_x, _y, n) => (n < 3 ? "5" : "4"));

const GRASS = tile((x, y, n) => {
  // ต้นหญ้าเล็กๆ ประปราย
  if ((x === 3 && (y === 5 || y === 6)) || (x === 11 && (y === 10 || y === 11))) return "8";
  return n < 4 ? "7" : "6";
});

const FOREST = tile((x, y, n) => {
  // ทรงพุ่มกลม + ลำต้น บนพื้นหญ้าเข้ม
  const dx = x - 7.5;
  const dy = y - 6;
  const inCanopy = dx * dx + dy * dy <= 30;
  if (inCanopy) {
    if (dx * dx + dy * dy > 22) return "B";
    return dx + dy < -2 ? "A" : "9";
  }
  if ((x === 7 || x === 8) && y >= 11 && y <= 13) return "T";
  return n < 5 ? "9" : "7";
});

/** ภาพพื้น 4 แบบ เรียงตามค่าใน enum Tile (Water, Sand, Grass, Forest) */
export const TILES: string[][] = [WATER, SAND, GRASS, FOREST];
