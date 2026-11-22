import { describe, it, expect } from "vitest";
import { ITEM_IDS } from "@primal/shared";
import { itemLabel, recipeLabel } from "../src/ui/labels";
import { costChips } from "../src/ui/craftPanel";

describe("labels", () => {
  it("every item has a Thai name", () => {
    expect(ITEM_IDS.map(itemLabel)).toEqual(["ไม้", "หิน", "ผลไม้", "เส้นใย", "ขวานหิน", "ค้อนหิน", "กองไฟ", "ผลไม้ย่าง"]);
  });
  it("recipe names", () => expect(recipeLabel("campfire")).toBe("กองไฟ"));
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
