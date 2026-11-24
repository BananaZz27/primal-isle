import { describe, it, expect } from "vitest";
import { DINO_KINDS, dinoDef } from "@primal/shared";
import { dinoFeetY, hasHdArt } from "../src/render/dinoLayout";
import { tamedTagY } from "../src/render/labelLayout";

describe("where a dino's picture sits around its collision box", () => {
  it("every dino in the game has HD art", () => {
    for (const kind of DINO_KINDS) expect(hasHdArt(kind), kind).toBe(true);
  });

  it("feet sit a little below the box centre (top of the drawing: see dino-art.test.ts)", () => {
    for (const kind of DINO_KINDS) {
      const half = dinoDef(kind).half;
      expect(dinoFeetY(kind)).toBeGreaterThan(0);
      expect(dinoFeetY(kind)).toBeLessThanOrEqual(half);
    }
  });

  it("the tamed ❤️ tag stays below the feet", () => {
    for (const kind of DINO_KINDS) expect(tamedTagY(dinoDef(kind).half)).toBeGreaterThan(dinoFeetY(kind));
  });
});
