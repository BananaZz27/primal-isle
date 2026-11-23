import { describe, it, expect } from "vitest";
import { BALANCE, craftCheck, FOOD, gatherYield, ITEM_IDS, RECIPE_IDS, recipeCost, TOOLS, type ItemId } from "../src/index";

const bag = (items: Partial<Record<ItemId, number>>) => (id: ItemId) => items[id] ?? 0;

describe("items and recipes", () => {
  it("knows all items in bag order", () =>
    expect([...ITEM_IDS]).toEqual(["wood", "stone", "berry", "fiber", "axe", "hammer", "campfire", "roast", "wall", "door", "bed", "meat", "steak", "spear", "canned", "bottle", "bandage", "chest"]));

  it("recipes match the design table", () => {
    expect([...RECIPE_IDS]).toEqual(["axe", "hammer", "campfire", "wall", "door", "bed", "spear", "chest"]);
    expect(recipeCost("axe")).toEqual({ wood: 3, stone: 2, fiber: 2 });
    expect(recipeCost("hammer")).toEqual({ wood: 2, stone: 3, fiber: 2 });
    expect(recipeCost("campfire")).toEqual({ wood: 5, stone: 3 });
  });

  it("food values", () => expect(FOOD).toEqual({ berry: 20, roast: 35, meat: 12, steak: 45 }));
  it("tools", () => expect([...TOOLS]).toEqual(["axe", "hammer", "spear"]));
});

describe("craftCheck", () => {
  it("ok when everything is there", () =>
    expect(craftCheck(bag({ wood: 3, stone: 2, fiber: 2 }), "axe")).toEqual({ ok: true, missing: {} }));

  it("lists exactly what is missing", () =>
    expect(craftCheck(bag({ wood: 1, stone: 2 }), "axe")).toEqual({
      ok: false,
      missing: { wood: 2, fiber: 2 },
      reason: "missing",
    }));

  it("cannot make a second copy of a tool", () =>
    expect(craftCheck(bag({ wood: 9, stone: 9, fiber: 9, axe: 1 }), "axe")).toEqual({
      ok: false,
      missing: {},
      reason: "owned",
    }));

  it("campfires can be made again (not a tool)", () =>
    expect(craftCheck(bag({ wood: 5, stone: 3, campfire: 1 }), "campfire").ok).toBe(true));
});

describe("gatherYield", () => {
  it("1 without tools", () => {
    expect(gatherYield("wood", bag({}))).toBe(1);
    expect(gatherYield("stone", bag({}))).toBe(1);
  });
  it("2 wood with an axe, 2 stone with a hammer", () => {
    expect(gatherYield("wood", bag({ axe: 1 }))).toBe(BALANCE.toolYield);
    expect(gatherYield("stone", bag({ hammer: 1 }))).toBe(BALANCE.toolYield);
    expect(gatherYield("berry", bag({ axe: 1, hammer: 1 }))).toBe(1);
  });
});

describe("full stacks", () => {
  it("cannot craft when the product stack is already full (would waste materials)", () =>
    expect(craftCheck(bag({ wood: 9, stone: 9, campfire: BALANCE.stackMax }), "campfire")).toEqual({
      ok: false,
      missing: {},
      reason: "full",
    }));
});
