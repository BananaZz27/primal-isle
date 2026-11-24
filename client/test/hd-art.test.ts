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
