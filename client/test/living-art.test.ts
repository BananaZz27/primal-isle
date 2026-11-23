import { describe, it, expect } from "vitest";
import { ITEM_IDS } from "@primal/shared";
import { ITEM_ICONS } from "../src/art/ninjaAtlas";
import { parsePixelArt } from "../src/art/pixels";
import { BUILD_PALETTE, CHEST } from "../src/art/structures";
import { CRATE, LIVING_PALETTE } from "../src/art/living";
import { actionFor, useHint } from "../src/ui/inventory";

describe("M7 art", () => {
  it("the storage chest is a 16×16 picture", () => {
    const art = parsePixelArt(CHEST, BUILD_PALETTE);
    expect([art.width, art.height]).toEqual([16, 16]);
  });

  it("the supply crate (with parachute) is 16 wide and parses", () => {
    const art = parsePixelArt(CRATE, LIVING_PALETTE);
    expect(art.width).toBe(16);
    expect(art.height).toBeGreaterThanOrEqual(16);
  });

  it("the new items have hand-drawn 16×16 icons that parse", () => {
    for (const id of ["canned", "bottle", "bandage", "chest"] as const) {
      const icon = ITEM_ICONS[id];
      expect(icon.kind, id).toBe("pixels");
      if (icon.kind !== "pixels") continue;
      const art = parsePixelArt(icon.rows, icon.palette);
      expect([art.width, art.height], id).toEqual([16, 16]);
    }
  });
});

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
