import { describe, it, expect } from "vitest";
import { DINO_KINDS, dinoDef } from "@primal/shared";
import { dinoArt } from "../src/art/hd/dinoArt";
import { SPECIES_IDS } from "../src/art/hd/species";
import { HD_SCALE } from "../src/display";
import { dinoFeetY, dinoTopY } from "../src/render/dinoLayout";

const bounds = (c: { width: number; height: number; alpha(x: number, y: number): number }) => {
  let minX = c.width, maxX = -1, minY = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (c.alpha(x, y) > 200) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y);
  }
  return { minX, maxX, minY };
};

describe("dino art placed for the game", () => {
  for (const id of SPECIES_IDS) {
    it(`${id}: centred so turning around doesn't jump; both frames share one shift; top = first drawn row`, () => {
      const art = dinoArt(id);
      const [b0, b1] = art.frames.map(bounds);
      const centre = (b: typeof b0) => (b.minX + b.maxX + 1) / 2;
      expect(Math.abs(centre(b0) - art.frames[0].width / 2), id).toBeLessThanOrEqual(1);
      expect(Math.abs(centre(b1) - centre(b0)), id).toBeLessThanOrEqual(4); // ขาก้าวต่างกันได้นิดหน่อย
      expect(art.top).toBe(Math.min(b0.minY, b1.minY));
    });
  }

  it("HP bar / label anchor sits on the top of the drawing, not the top of the canvas", () => {
    for (const kind of DINO_KINDS) {
      const art = dinoArt(kind);
      expect(dinoTopY(kind)).toBeCloseTo(dinoFeetY(kind) - (art.groundY - art.top) * HD_SCALE);
      expect(dinoTopY(kind)).toBeLessThan(-dinoDef(kind).half * 0.5); // ยังอยู่เหนือกลางตัว
    }
  });
});
