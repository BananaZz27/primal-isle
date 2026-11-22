import { BALANCE, type ItemId } from "./resources";

/** สูตรที่คราฟต์ได้ (ลำดับ = ลำดับในหน้าคราฟต์) */
export type RecipeId = keyof typeof BALANCE.recipes;
export const RECIPE_IDS = Object.keys(BALANCE.recipes) as RecipeId[];

/** เครื่องมือ: มีได้ชิ้นเดียวต่อชนิด */
export const TOOLS: readonly ItemId[] = ["axe", "hammer", "spear"];

/** ของที่กินได้ → เพิ่มความอิ่มเท่าไร */
export const FOOD: Partial<Record<ItemId, number>> = {
  berry: BALANCE.berryFood,
  roast: BALANCE.roastFood,
  meat: BALANCE.meatFood,
  steak: BALANCE.steakFood,
};

export function recipeCost(id: RecipeId): Partial<Record<ItemId, number>> {
  return { ...(BALANCE.recipes[id] as Partial<Record<ItemId, number>>) };
}

export function isRecipe(id: unknown): id is RecipeId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(BALANCE.recipes, id);
}

export interface CraftCheck {
  ok: boolean;
  /** ของที่ยังขาด → ขาดอีกกี่ชิ้น */
  missing: Partial<Record<ItemId, number>>;
  reason?: "missing" | "owned" | "full";
}

/**
 * ทำของสูตรนี้ได้ไหม — ใช้ทั้งหน้าคราฟต์ (แสดงผล) และเซิร์ฟเวอร์ (ตัดสินจริง)
 * has(item) = จำนวนที่มีในกระเป๋า
 */
export function craftCheck(has: (item: ItemId) => number, id: RecipeId): CraftCheck {
  const product = id as ItemId;
  if (TOOLS.includes(product) && has(product) > 0) return { ok: false, missing: {}, reason: "owned" };
  // ของที่จะได้เต็ม stack แล้ว → ห้ามทำ ไม่งั้นเสียวัตถุดิบฟรี
  if (has(product) >= BALANCE.stackMax) return { ok: false, missing: {}, reason: "full" };

  const missing: Partial<Record<ItemId, number>> = {};
  for (const [item, need] of Object.entries(recipeCost(id)) as [ItemId, number][]) {
    const short = need - has(item);
    if (short > 0) missing[item] = short;
  }
  return Object.keys(missing).length === 0 ? { ok: true, missing } : { ok: false, missing, reason: "missing" };
}

/** ตีทรัพยากร 1 ครั้งได้ของกี่ชิ้น — มีขวานได้ไม้เพิ่ม, มีค้อนได้หินเพิ่ม */
export function gatherYield(item: ItemId, has: (item: ItemId) => number): number {
  if (item === "wood" && has("axe") > 0) return BALANCE.toolYield;
  if (item === "stone" && has("hammer") > 0) return BALANCE.toolYield;
  return 1;
}
