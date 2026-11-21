import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  frameAt,
  GROUND,
  GROUND_DECOR,
  SAND_RIM,
  SHORE,
  SURVIVOR_IDS,
  TILESET_COLS,
  TILESET_ROWS,
  TREE_RECTS,
} from "../src/art/ninjaAtlas";

const FRAMES = TILESET_COLS * TILESET_ROWS;
const assets = (p: string) => fileURLToPath(new URL(`../public/assets/ninja-adventure/${p}`, import.meta.url));

describe("ninja atlas", () => {
  it("indexes frames row-major over 28 columns", () => {
    expect(TILESET_COLS).toBe(28);
    expect(frameAt(0, 0)).toBe(0);
    expect(frameAt(1, 1)).toBe(29);
    expect(frameAt(27, TILESET_ROWS - 1)).toBe(FRAMES - 1);
  });

  it("every ground, shore, rim and decor frame lies inside the tileset", () => {
    const all = [
      ...Object.values(GROUND),
      ...Object.values(SHORE),
      ...Object.values(SAND_RIM),
      ...Object.values(GROUND_DECOR).flat(),
    ];
    for (const f of all) {
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(FRAMES);
    }
  });

  it("each decor kind has at least one picture", () => {
    for (const frames of Object.values(GROUND_DECOR)) expect(frames.length).toBeGreaterThan(0);
  });

  it("trees are at least 32px wide and inside the 448x656 image", () => {
    expect(TREE_RECTS.length).toBeGreaterThanOrEqual(2);
    for (const r of TREE_RECTS) {
      expect(r.w).toBeGreaterThanOrEqual(32);
      expect(r.x + r.w).toBeLessThanOrEqual(448);
      expect(r.y + r.h).toBeLessThanOrEqual(TILESET_ROWS * 16);
    }
  });

  it("has 8 distinct survivor sheets that exist on disk", () => {
    expect(SURVIVOR_IDS.length).toBe(8);
    expect(new Set(SURVIVOR_IDS).size).toBe(8);
    for (const id of SURVIVOR_IDS) expect(existsSync(assets(`characters/${id}.png`))).toBe(true);
  });

  it("the tileset file exists", () => expect(existsSync(assets("tileset.png"))).toBe(true));

  it("every survivor sheet is the full 64x112 layout (4 directions × 7 rows)", () => {
    for (const id of SURVIVOR_IDS) expect(pngSize(assets(`characters/${id}.png`)), id).toEqual({ w: 64, h: 112 });
  });

  it("the tileset is 448 wide and TILESET_ROWS tall", () =>
    expect(pngSize(assets("tileset.png"))).toEqual({ w: 448, h: TILESET_ROWS * 16 }));
});

/** อ่านขนาดภาพ PNG จาก header (IHDR) โดยไม่ต้องใช้ไลบรารีภาพ */
function pngSize(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

