import type { ItemId, RecipeId } from "@primal/shared";

const ITEM_LABELS: Record<ItemId, string> = {
  wood: "ไม้",
  stone: "หิน",
  berry: "ผลไม้",
  fiber: "เส้นใย",
  axe: "ขวานหิน",
  hammer: "ค้อนหิน",
  campfire: "กองไฟ",
  roast: "ผลไม้ย่าง",
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
};
