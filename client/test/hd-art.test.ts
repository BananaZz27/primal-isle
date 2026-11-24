import { describe, it, expect } from "vitest";
import { PixelCanvas, rampAt, rng } from "../src/art/hd/canvas";
import { bush, grassTile, rock, tree } from "../src/art/hd/nature";
import { raptor } from "../src/art/hd/dinos";

describe("HD art toolkit", () => {
  it("the same seed draws the same picture every time", () => {
    const a = rng(7), b = rng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(Array.from(tree(0).data)).toEqual(Array.from(tree(0).data));
  });

  it("light picks the dark end of a ramp at 0 and the bright end at 1", () => {
    const ramp = ["#000000", "#808080", "#ffffff"];
    expect(rampAt(ramp, 0, 0, 0)).toBe("#000000");
    expect(rampAt(ramp, 1, 0, 0)).toBe("#ffffff");
  });

  it("outline adds a darker ring only around solid pixels", () => {
    const c = new PixelCanvas(5, 5);
    c.set(2, 2, "#ff0000");
    c.outline(0.5);
    expect(c.alpha(2, 1)).toBe(255);
    expect(c.get(2, 1)).toBe("#800000");
    expect(c.alpha(0, 0)).toBe(0);
  });
});

describe("HD samples are 2× the old sizes", () => {
  it("grass fills its whole 32×32 tile", () => {
    const g = grassTile(0);
    expect([g.width, g.height]).toEqual([32, 32]);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) expect(g.alpha(x, y)).toBe(255);
  });

  it("tree 64×64 (2×2 tiles), rock and bush 32×32, raptor 48×36", () => {
    expect([tree(0).width, tree(0).height]).toEqual([64, 64]);
    expect([rock(0).width, bush(true).width]).toEqual([32, 32]);
    expect([raptor(0).width, raptor(0).height]).toEqual([48, 36]);
  });

  it("the two raptor walk frames differ (legs move)", () => {
    expect(Array.from(raptor(0).data)).not.toEqual(Array.from(raptor(1).data));
  });
});

describe("12 dinosaur species drawn from one rig", async () => {
  const { drawDino } = await import("../src/art/hd/dinoRig");
  const { SPECIES, SPECIES_IDS } = await import("../src/art/hd/species");

  it("has all 12 species", () => expect(SPECIES_IDS).toHaveLength(12));

  for (const id of SPECIES_IDS) {
    it(`${id}: right size, not cut off at the edges, stands on the ground, walks`, () => {
      const spec = SPECIES[id];
      const a = drawDino(spec, 0);
      expect([a.width, a.height]).toEqual([spec.width, spec.height]);
      const solid = (x: number, y: number) => a.alpha(x, y) > 200;
      for (let x = 0; x < a.width; x++) expect(solid(x, 0), `${id} top edge x=${x}`).toBe(false);
      for (let y = 0; y < a.height; y++) {
        expect(solid(0, y), `${id} left edge y=${y}`).toBe(false);
        expect(solid(a.width - 1, y), `${id} right edge y=${y}`).toBe(false);
      }
      const feet = Array.from({ length: a.width }, (_, x) => x).some((x) => solid(x, spec.groundY - 1));
      expect(feet, `${id} feet on groundY`).toBe(true);
      expect(Array.from(drawDino(spec, 1).data)).not.toEqual(Array.from(a.data));
    });
  }
});

describe("HD resources", async () => {
  const nature = await import("../src/art/hd/nature");
  const opaque = (c: { width: number; height: number; alpha(x: number, y: number): number }) => {
    let n = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (c.alpha(x, y) > 200) n++;
    return n;
  };

  it("two tree kinds (round, pine) at 64×64 that look different", () => {
    const [round, pine] = [nature.tree(0), nature.pineTree(0)];
    expect([pine.width, pine.height]).toEqual([64, 64]);
    expect(Array.from(round.data)).not.toEqual(Array.from(pine.data));
  });

  it("stump, tuft, small and big rock are one tile (32×32); the small rock is smaller", () => {
    for (const c of [nature.stump(), nature.tuft(), nature.rock(0), nature.rock(1)]) expect([c.width, c.height]).toEqual([32, 32]);
    expect(opaque(nature.rock(1))).toBeLessThan(opaque(nature.rock(0)) * 0.75);
  });

  it("a picked bush has no berries left", () => {
    const red = (c: InstanceType<typeof import("../src/art/hd/canvas").PixelCanvas>) => {
      let n = 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (c.alpha(x, y) > 200 && nature.RAMPS.berry.includes(c.get(x, y))) n++;
      return n;
    };
    expect(red(nature.bush(true))).toBeGreaterThan(5);
    expect(red(nature.bush(false))).toBe(0);
  });
});
