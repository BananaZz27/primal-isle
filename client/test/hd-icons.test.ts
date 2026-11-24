import { describe, it, expect } from "vitest";
import { ITEM_IDS } from "@primal/shared";
import { hdIcon } from "../src/art/hd/icons";
import { ITEM_ICONS } from "../src/art/textures";

describe("HD inventory icons", () => {
  // สิ่งก่อสร้างใช้ภาพเดียวกับในโลก ซึ่งตั้งใจให้เต็มช่อง (กำแพงติดกันต่อกันสนิท) → ไม่ตรวจขอบ
  const REUSES_WORLD_ART = new Set(["wall", "door", "bed", "chest", "campfire", "stone"]);

  it("every item has a 32×32 HD icon with something drawn; drawn-for-inventory icons are not cut off", () => {
    for (const id of ITEM_IDS) {
      const c = hdIcon(id);
      expect([c.width, c.height], id).toEqual([32, 32]);
      let solid = 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (c.alpha(x, y) > 200) solid++;
      expect(solid, id).toBeGreaterThan(60);
      if (REUSES_WORLD_ART.has(id)) continue;
      for (let k = 0; k < 32; k++) {
        expect(c.alpha(k, 0) > 200 || c.alpha(0, k) > 200 || c.alpha(31, k) > 200 || c.alpha(k, 31) > 200, `${id} edge ${k}`).toBe(false);
      }
    }
  });

  it("no two items share the same picture", () => {
    const pics = ITEM_IDS.map((id) => Array.from(hdIcon(id).data).join());
    expect(new Set(pics).size).toBe(ITEM_IDS.length);
  });

  it("the inventory uses the HD icons for every item", () => {
    for (const id of ITEM_IDS) expect(ITEM_ICONS[id].kind, id).toBe("hd");
  });
});
