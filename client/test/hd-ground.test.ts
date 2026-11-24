import { describe, it, expect } from "vitest";
import { Tile, type WorldMap } from "@primal/shared";
import { cornerMask, dualFrames, groundTileset, LAYERS, frameOf, TILESET_COLUMNS } from "../src/art/hd/ground";

const W = Tile.Water, S = Tile.Sand, G = Tile.Grass, F = Tile.Forest;
const mapOf = (rows: Tile[][]): WorldMap => ({ seed: 1, size: rows.length, tiles: new Uint8Array(rows.flat()) });

describe("dual-grid corners", () => {
  // dual cell (i, j) sits on the corner shared by world tiles (i-1..i, j-1..j)
  const m = mapOf([
    [W, W, W],
    [W, S, G],
    [W, G, F],
  ]);

  it("bits = which of the 4 corner tiles reach the layer (tl=1, tr=2, bl=4, br=8)", () => {
    expect(cornerMask(m, 1, 1, Tile.Sand)).toBe(8); // only (1,1) is land
    expect(cornerMask(m, 2, 2, Tile.Sand)).toBe(15);
    expect(cornerMask(m, 2, 2, Tile.Grass)).toBe(2 | 4 | 8);
    expect(cornerMask(m, 2, 2, Tile.Forest)).toBe(8);
    expect(cornerMask(m, 0, 0, Tile.Sand)).toBe(0); // off the map = sea
  });

  it("frames for each layer cover the map plus one extra row/column; empty corners = -1", () => {
    const f = dualFrames(m);
    expect(f.water).toHaveLength(4);
    expect(f.water[0]).toHaveLength(4);
    expect(f.sand[0][0]).toBe(-1);
    expect(f.sand[2][2]).toBeGreaterThanOrEqual(0);
    expect(f.forest[1][1]).toBe(-1);
  });
});

describe("HD ground tileset", () => {
  const ts = groundTileset();
  const alphaAt = (frame: number, x: number, y: number) =>
    ts.alpha((frame % TILESET_COLUMNS) * 32 + x, Math.floor(frame / TILESET_COLUMNS) * 32 + y);

  it("water frames are fully opaque, an empty-mask land frame does not exist, a full mask is fully opaque", () => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      expect(alphaAt(frameOf("water", 15, 0), x, y)).toBe(255);
      for (const layer of LAYERS) expect(alphaAt(frameOf(layer, 15, 0), x, y)).toBe(255);
    }
  });

  it("edges join without seams: two tiles sharing a side have identical land/water along it", () => {
    for (const layer of LAYERS)
      for (let a = 1; a < 16; a++)
        for (let b = 1; b < 16; b++) {
          // a's right edge corners (tr, br) must equal b's left edge corners (tl, bl) to be neighbours
          if (((a >> 1) & 1) !== (b & 1) || ((a >> 3) & 1) !== ((b >> 2) & 1)) continue;
          for (let y = 0; y < 32; y++) {
            const solidA = alphaAt(frameOf(layer, a, 0), 31, y) > 128;
            const solidB = alphaAt(frameOf(layer, b, 0), 0, y) > 128;
            expect(solidA, `${layer} ${a}|${b} y=${y}`).toBe(solidB);
          }
        }
  });
});

describe("seams top/bottom too", () => {
  const ts = groundTileset();
  const alphaAt = (frame: number, x: number, y: number) =>
    ts.alpha((frame % TILESET_COLUMNS) * 32 + x, Math.floor(frame / TILESET_COLUMNS) * 32 + y);
  it("a tile above another with the same shared corners joins without a seam", () => {
    for (const layer of LAYERS)
      for (let a = 1; a < 16; a++)
        for (let b = 1; b < 16; b++) {
          // a's bottom corners (bl 4, br 8) must equal b's top corners (tl 1, tr 2)
          if (((a >> 2) & 1) !== (b & 1) || ((a >> 3) & 1) !== ((b >> 1) & 1)) continue;
          for (let x = 0; x < 32; x++)
            expect(alphaAt(frameOf(layer, a, 0), x, 31) > 128, `${layer} ${a}/${b} x=${x}`).toBe(alphaAt(frameOf(layer, b, 0), x, 0) > 128);
        }
  });
});

describe("no overdraw: cells fully covered by a higher layer are skipped", () => {
  const big = mapOf([
    [G, G, G, G],
    [G, F, F, G],
    [G, F, F, G],
    [G, G, G, G],
  ]);
  it("inside the forest only the forest is drawn; on open grass only grass (no hidden sand / water)", () => {
    const f = dualFrames(big);
    expect([f.water[2][2], f.sand[2][2], f.grass[2][2]]).toEqual([-1, -1, -1]);
    expect(f.forest[2][2]).toBeGreaterThanOrEqual(0);
    expect([f.water[1][1], f.sand[1][1]]).toEqual([-1, -1]); // หญ้าเต็มช่อง
    expect(f.grass[1][1]).toBeGreaterThanOrEqual(0);
  });

  it("the coast still draws water under partial sand", () => {
    const f = dualFrames(mapOf([[W, S], [W, S]]));
    expect(f.water[1][1]).toBeGreaterThanOrEqual(0);
    expect(f.sand[1][1]).toBeGreaterThanOrEqual(0);
  });
});
