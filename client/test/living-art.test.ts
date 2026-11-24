import { describe, it, expect } from "vitest";
import { ITEM_IDS } from "@primal/shared";
import { actionFor, useHint } from "../src/ui/inventory";

describe("what tapping an inventory slot does", () => {
  it("food, bottled water and bandages are used; buildings are placed; materials do nothing", () => {
    for (const id of ["berry", "roast", "meat", "steak", "canned", "bottle", "bandage"] as const) expect(actionFor(id), id).toBe("eat");
    for (const id of ["campfire", "wall", "door", "bed", "chest"] as const) expect(actionFor(id), id).toBe("place");
    for (const id of ["wood", "stone", "fiber", "axe", "hammer", "spear"] as const) expect(actionFor(id), id).toBeUndefined();
  });

  it("every usable item has a Thai hint, and drinking/bandaging say so", () => {
    for (const id of ITEM_IDS) if (actionFor(id)) expect(useHint(id).length, id).toBeGreaterThan(0);
    expect(useHint("bottle")).toContain("ดื่ม");
    expect(useHint("bandage")).toContain("พันแผล");
    expect(useHint("chest")).toContain("วาง");
  });
});
