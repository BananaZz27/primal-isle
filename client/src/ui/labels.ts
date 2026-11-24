import { BALANCE, type ItemId, type RecipeId } from "@primal/shared";

const ITEM_LABELS: Record<ItemId, string> = {
  wood: "ไม้",
  stone: "หิน",
  berry: "ผลไม้",
  fiber: "เส้นใย",
  axe: "ขวานหิน",
  hammer: "ค้อนหิน",
  campfire: "กองไฟ",
  roast: "ผลไม้ย่าง",
  wall: "กำแพงไม้",
  door: "ประตูไม้",
  bed: "ที่นอน",
  meat: "เนื้อดิบ",
  steak: "เนื้อย่าง",
  spear: "หอก",
  canned: "อาหารกระป๋อง",
  bottle: "น้ำขวด",
  bandage: "ผ้าพันแผล",
  chest: "กล่องเก็บของ",
};

/** ชื่อของภาษาไทย */
export function itemLabel(id: ItemId): string {
  return ITEM_LABELS[id];
}

/** ชื่อสูตรคราฟต์ = ชื่อของที่ได้ */
export function recipeLabel(id: RecipeId): string {
  return ITEM_LABELS[id];
}

/** คำอธิบายสั้นๆ ในหน้าคราฟต์ */
export const RECIPE_HINTS: Record<RecipeId, string> = {
  axe: "ตีต้นไม้ได้ไม้ 2 ต่อครั้ง",
  hammer: "ทุบหินได้หิน 2 ต่อครั้ง",
  campfire: "วางบนพื้น แล้วย่างผลไม้ (อิ่มกว่าเดิม)",
  wall: "กั้นทาง ไดโนเสาร์และคนเดินผ่านไม่ได้",
  door: "ช่องทางเข้าฐาน เดินผ่านได้",
  bed: "สลบแล้วฟื้นที่นี่ (คนละ 1 ที่)",
  spear: "ตีไดโนแรงขึ้น (12 ต่อครั้ง)",
  chest: `เก็บของได้ ${BALANCE.chestKinds} ชนิด ทุกคนในโลกใช้ร่วมกัน`,
};

/** ชื่อทรัพยากรบนแผนที่ (ตามชื่อใน balance.json → nodes) */
export const NODE_LABELS: Record<string, string> = {
  tree: "ต้นไม้",
  rock: "ก้อนหิน",
  bush: "พุ่มผลไม้",
  tuft: "กอหญ้า",
};

/** ชื่อไดโนแต่ละชนิด */
export const DINO_LABELS: Record<string, string> = {
  compy: "ไดโนจิ๋ว",
  duckbill: "ปากเป็ด",
  raptor: "แร็พเตอร์",
  trike: "ไทรเซอราทอปส์",
};
