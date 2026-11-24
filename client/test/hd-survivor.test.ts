import { describe, it, expect } from "vitest";
import { OUTFITS, survivorSheet } from "../src/art/hd/survivor";
import { walkFrames } from "../src/render/facing";

const frameAlpha = (sheet: ReturnType<typeof survivorSheet>, frame: number, x: number, y: number) =>
  sheet.alpha((frame % 4) * 32 + x, Math.floor(frame / 4) * 32 + y);
const framePixels = (sheet: ReturnType<typeof survivorSheet>, frame: number) => {
  const out: string[] = [];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const sx = (frame % 4) * 32 + x, sy = Math.floor(frame / 4) * 32 + y;
    out.push(sheet.alpha(sx, sy) > 0 ? sheet.get(sx, sy) : ".");
  }
  return out;
};

describe("HD survivors", () => {
  it("8 different looks", () => {
    expect(OUTFITS).toHaveLength(8);
    const sheets = OUTFITS.map((o) => framePixels(survivorSheet(o), 0).join());
    expect(new Set(sheets).size).toBe(8);
  });

  for (const [i, outfit] of OUTFITS.entries()) {
    it(`look ${i}: 4×4 frames of 32×32, nothing cut off, standing on the ground`, () => {
      const sheet = survivorSheet(outfit);
      expect([sheet.width, sheet.height]).toEqual([128, 128]);
      for (let f = 0; f < 16; f++) {
        for (let k = 0; k < 32; k++) {
          expect(frameAlpha(sheet, f, k, 0) > 200, `frame ${f} top`).toBe(false);
          expect(frameAlpha(sheet, f, 0, k) > 200, `frame ${f} left`).toBe(false);
          expect(frameAlpha(sheet, f, 31, k) > 200, `frame ${f} right`).toBe(false);
        }
        const feet = Array.from({ length: 32 }, (_, x) => frameAlpha(sheet, f, x, 29) > 200).some(Boolean);
        expect(feet, `frame ${f} feet`).toBe(true);
      }
    });
  }

  it("walking moves the legs; facing right is facing left mirrored", () => {
    const sheet = survivorSheet(OUTFITS[0]);
    for (const facing of ["down", "up", "left", "right"] as const) {
      const [stand, step1, , step2] = walkFrames(facing).map((f) => framePixels(sheet, f).join());
      expect(step1, facing).not.toBe(stand);
      expect(step2, facing).not.toBe(step1);
    }
    const left = framePixels(sheet, walkFrames("left")[0]);
    const right = framePixels(sheet, walkFrames("right")[0]);
    const mirrored = Array.from({ length: 32 }, (_, y) => left.slice(y * 32, y * 32 + 32).reverse()).flat();
    expect(right).toEqual(mirrored);
  });
});
