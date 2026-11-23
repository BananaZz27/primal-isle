/**
 * ภาพของขั้นที่ 7 (โลกมีชีวิต) — วาดเองด้วยตัวอักษร (asset pack ไม่มีของสมัยใหม่)
 * ไอคอน 16×16: อาหารกระป๋อง น้ำขวด ผ้าพันแผล · ลังเสบียงมีร่มชูชีพ 16×24
 * `.` = โปร่งใส · สีอยู่ใน LIVING_PALETTE
 */
export const LIVING_PALETTE: Record<string, string> = {
  k: "#2b1d14", // เส้นขอบ
  s: "#9aa3ab", // เหล็กกระป๋อง
  S: "#d5dbe0", // เหล็กด้านสว่าง
  R: "#c0392b", // ฉลากแดง / กากบาทเงา
  r: "#e74c3c", // กากบาทแดง
  c: "#f4f1ea", // ขาว (ฉลาก ผ้า ร่ม)
  C: "#c9c3b6", // ขาวเงา
  o: "#f08a24", // ส้ม (อาหาร ร่ม)
  a: "#8fd3f4", // น้ำในขวด
  A: "#e3f6ff", // แสงสะท้อนขวด
  b: "#1f6fb2", // ฉลากขวด / ฝา
  t: "#e8e0c8", // เชือกร่ม
  w: "#7a4a24", // ไม้เข้ม
  W: "#a8683a", // ไม้กลาง
  L: "#c98a52", // ไม้สว่าง
  y: "#f2c230", // เทปเหลือง (ของสมัยใหม่)
};

/** อาหารกระป๋อง: กระป๋องเหล็ก ฉลากแดง รูปอาหารสีส้ม */
export const CANNED = [
  "................",
  "................",
  "....kkkkkkkk....",
  "...kSSSSSSSSk...",
  "...kSssssssSk...",
  "...kkkkkkkkkk...",
  "...kRRRRRRRRk...",
  "...kRccccccRk...",
  "...kRcoooocRk...",
  "...kRcoooocRk...",
  "...kRccccccRk...",
  "...kRRRRRRRRk...",
  "...kssssssssk...",
  "...kkkkkkkkkk...",
  "................",
  "................",
];

/** น้ำขวด: ขวดใส ฝาน้ำเงิน ฉลากน้ำเงิน */
export const BOTTLE = [
  "................",
  "......kkkk......",
  "......kbbk......",
  "......kkkk......",
  ".....kaaaak.....",
  "....kaaaaaak....",
  "....kaAaaaak....",
  "....kbbbbbbk....",
  "....kbccccbk....",
  "....kbbbbbbk....",
  "....kaAaaaak....",
  "....kaAaaaak....",
  "....kaaaaaak....",
  "....kaaaaaak....",
  ".....kkkkkk.....",
  "................",
];

/** ผ้าพันแผล: แผ่นผ้าขาวมีกากบาทแดง */
export const BANDAGE = [
  "................",
  "................",
  ".kkkkkkkkkkkkkk.",
  ".kcccccccccccCk.",
  ".kccccrrrrcccCk.",
  ".kccccrrrrcccCk.",
  ".kcrrrrrrrrrrRk.",
  ".kcrrrrrrrrrrRk.",
  ".kcrrrrrrrrrrRk.",
  ".kcrrrrrrrrrrRk.",
  ".kccccrrrrcccCk.",
  ".kccccrrrrcccCk.",
  ".kCCCCRRRRCCCCk.",
  ".kkkkkkkkkkkkkk.",
  "................",
  "................",
];

/** ลังเสบียงจากโลกปัจจุบัน: ร่มชูชีพลายส้ม-ขาว + เชือก + ลังไม้คาดเทปเหลือง (16×24) */
export const CRATE = [
  "....kkkkkkkk....",
  "..kkoocCoocCkk..",
  ".koccoocCoocCok.",
  "koccoocCoocCoock",
  "kkkkkkkkkkkkkkkk",
  ".t...t....t...t.",
  ".t...t....t...t.",
  "..t..t....t..t..",
  "..t...t..t...t..",
  "...t..t..t..t...",
  "...t..t..t..t...",
  "..kkkkkkkkkkkk..",
  "..kwLLLLLLLLwk..",
  "..kWwWWWWWWwWk..",
  "..kWWwWWWWwWWk..",
  "..kWWWwWWwWWWk..",
  "..kyyyykkyyyyk..",
  "..kyyyykkyyyyk..",
  "..kWWWwWWwWWWk..",
  "..kWWwWWWWwWWk..",
  "..kWwWWWWWWwWk..",
  "..kwWWWWWWWWwk..",
  "..kkkkkkkkkkkk..",
  "................",
];
