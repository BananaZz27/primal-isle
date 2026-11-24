import { ITEM_IDS, type ItemId } from "@primal/shared";

/**
 * ชื่อ texture ใน Phaser + ตารางไอคอน — ภาพทุกชิ้นวาดด้วยโค้ดใน art/hd (ไม่มีไฟล์ภาพแล้ว)
 * ภาพ HD = 32 texel ต่อช่อง ต้องแสดงที่ HD_SCALE (ดู display.ts)
 */
export const TEX = {
  survivor: (id: string) => `survivor-${id}`, // แผ่นภาพ 4 ทิศ × 4 ท่าเดิน (art/hd/survivor.ts)
  campfire: "campfire", // 2 เฟรม (เปลวไฟสลับ)
  structure: (kind: string) => `structure-${kind}`, // กำแพง ประตู ที่นอน กล่องเก็บของ
  bag: "drop-bag",
  dino: (kind: string) => `dino-${kind}`, // 2 เฟรม (ขาสลับ) จากโครงไดโน
  crate: "supply-crate", // ลังเสบียงมีร่มชูชีพ
  glow: "fire-glow", // วงแสงกองไฟ (ไล่สีวงกลม)
  hd: {
    tree: (variant: number) => `hd-tree-${variant % 2}`, // 0 ต้นกลม · 1 ต้นสน
    stump: "hd-stump",
    rock: (variant: number) => `hd-rock-${variant % 2}`, // 0 ก้อนเล็ก · 1 ก้อนใหญ่
    bush: (ripe: boolean) => (ripe ? "hd-bush-ripe" : "hd-bush-picked"),
    tuft: "hd-tuft",
    ground: "hd-ground", // แผ่นภาพพื้น (art/hd/ground.ts)
  },
};

/** ไอคอน HD 32×32 วาดด้วยโค้ด (art/hd/icons.ts) */
export interface Icon {
  kind: "hd";
  id: ItemId | "heart";
}

export const ITEM_ICONS: Record<ItemId, Icon> = Object.fromEntries(ITEM_IDS.map((id) => [id, { kind: "hd", id }])) as Record<ItemId, Icon>;

/** ไอคอนแถบสถานะ: เลือด ความอิ่ม น้ำ */
export const STAT_ICONS: Record<"health" | "hunger" | "thirst", Icon> = {
  health: { kind: "hd", id: "heart" },
  hunger: { kind: "hd", id: "steak" },
  thirst: { kind: "hd", id: "bottle" },
};
