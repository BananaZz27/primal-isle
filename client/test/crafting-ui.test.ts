import { describe, it, expect } from "vitest";
import { ITEM_IDS, RECIPE_IDS } from "@primal/shared";
import { itemLabel, RECIPE_HINTS, recipeLabel } from "../src/ui/labels";
import { costChips } from "../src/ui/craftPanel";

describe("labels", () => {
  it("every item has a Thai name", () => {
    expect(ITEM_IDS.map(itemLabel)).toEqual([
      "ไม้", "หิน", "ผลไม้", "เส้นใย", "ขวานหิน", "ค้อนหิน", "กองไฟ", "ผลไม้ย่าง", "กำแพงไม้", "ประตูไม้", "ที่นอน", "เนื้อดิบ", "เนื้อย่าง", "หอก",
      "อาหารกระป๋อง", "น้ำขวด", "ผ้าพันแผล", "กล่องเก็บของ",
    ]);
  });
  it("recipe names", () => expect(recipeLabel("campfire")).toBe("กองไฟ"));
  it("every recipe has a hint, including the new chest", () => {
    for (const id of RECIPE_IDS) expect(RECIPE_HINTS[id].length, id).toBeGreaterThan(0);
    expect(recipeLabel("chest")).toBe("กล่องเก็บของ");
  });
});

describe("costChips", () => {
  it("shows need/have and whether there is enough, in recipe order", () => {
    const has = (id: string) => ({ wood: 4, stone: 1 } as Record<string, number>)[id] ?? 0;
    expect(costChips(has, "axe")).toEqual([
      { item: "wood", need: 3, have: 4, enough: true },
      { item: "stone", need: 2, have: 1, enough: false },
      { item: "fiber", need: 2, have: 0, enough: false },
    ]);
  });
});
