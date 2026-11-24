import { describe, it, expect } from "vitest";
import { bag, bed, campfire, chest, crate, door, wall } from "../src/art/hd/built";

const rowsUsed = (c: { width: number; height: number; alpha(x: number, y: number): number }) => {
  let top = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (c.alpha(x, y) > 200) top = Math.min(top, y);
  return c.height - top;
};

describe("HD structures", () => {
  it("one tile each (32×32); the supply crate is 1.5 tiles tall with its parachute", () => {
    for (const c of [wall(), door(), bed(), chest(), bag(), campfire(0), campfire(1)]) expect([c.width, c.height]).toEqual([32, 32]);
    expect([crate().width, crate().height]).toEqual([32, 48]);
  });

  it("walls stand tall, the bed lies flat on the ground", () => {
    expect(rowsUsed(wall())).toBeGreaterThanOrEqual(28);
    expect(rowsUsed(bed())).toBeLessThanOrEqual(16);
  });

  it("the campfire flickers (two different frames)", () => {
    expect(Array.from(campfire(0).data)).not.toEqual(Array.from(campfire(1).data));
  });
});
