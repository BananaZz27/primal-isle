import { describe, it, expect } from "vitest";
import { parsePixelArt } from "../src/art/pixels";
import { SURVIVOR, TILES } from "../src/art/sprites";
import { PALETTE } from "../src/art/palette";
import { Tile, TILE_SIZE } from "@primal/shared";

describe("parsePixelArt", () => {
  it("turns a grid into colours with '.' as transparent", () => {
    const art = parsePixelArt(["ab", ".a"], { a: "#ff0000", b: "#00ff00" });
    expect(art.width).toBe(2);
    expect(art.height).toBe(2);
    expect(art.pixels).toEqual(["#ff0000", "#00ff00", null, "#ff0000"]);
  });

  it("throws on an unknown character, naming it", () => {
    expect(() => parsePixelArt(["aZ"], { a: "#fff" })).toThrow(/"Z"/);
  });

  it("throws when rows have different widths", () => {
    expect(() => parsePixelArt(["aa", "a"], { a: "#fff" })).toThrow(/width/);
  });
});

describe("built-in sprites", () => {
  it("survivor is one 16x16 tile and uses only palette colours", () => {
    const art = parsePixelArt(SURVIVOR, PALETTE);
    expect(art.width).toBe(TILE_SIZE);
    expect(art.height).toBe(TILE_SIZE);
  });

  it("has one 16x16 tile image per Tile value, in enum order", () => {
    expect(TILES.length).toBe(4);
    expect(Tile.Forest).toBe(3);
    for (const rows of TILES) {
      const art = parsePixelArt(rows, PALETTE);
      expect(art.width).toBe(TILE_SIZE);
      expect(art.height).toBe(TILE_SIZE);
    }
  });
});
