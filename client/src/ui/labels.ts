import type { ItemId } from "@primal/shared";

const ITEM_LABELS: Record<ItemId, string> = {
  wood: "ไม้",
  stone: "หิน",
  berry: "ผลไม้",
  fiber: "เส้นใย",
};

/** ชื่อของภาษาไทย */
export function itemLabel(id: ItemId): string {
  return ITEM_LABELS[id];
}
