import { describe, it, expect } from "vitest";
import { Tile, type WorldMap } from "@primal/shared";
import { groundFrame } from "../src/art/groundFrames";
import { GROUND, SAND_RIM, SHORE } from "../src/art/ninjaAtlas";

const LEGEND: Record<string, Tile> = { "~": Tile.Water, s: Tile.Sand, ".": Tile.Grass, f: Tile.Forest };

/** แผนที่จัตุรัสจากข้อความ ช่องที่ไม่ได้เขียนเป็นน้ำ */
function map(rows: string[]): WorldMap {
  const size = Math.max(rows.length, ...rows.map((r) => r.length));
  const tiles = new Uint8Array(size * size).fill(Tile.Water);
  rows.forEach((row, ty) => Array.from(row).forEach((ch, tx) => (tiles[ty * size + tx] = LEGEND[ch])));
  return { seed: 0, size, tiles };
}

describe("groundFrame — water", () => {
  it("open sea", () => expect(groundFrame(map(["~~~", "~~~", "~~~"]), 1, 1)).toBe(GROUND.water));
  it("land only on a diagonal is still open water", () =>
    expect(groundFrame(map([".~~", "~~~", "~~~"]), 1, 1)).toBe(GROUND.water));
  it("land to the north", () => expect(groundFrame(map(["~.~", "~~~", "~~~"]), 1, 1)).toBe(SHORE.n));
  it("land to the east", () => expect(groundFrame(map(["~~~", "~~.", "~~~"]), 1, 1)).toBe(SHORE.e));
  it("land to the south", () => expect(groundFrame(map(["~~~", "~~~", "~s~"]), 1, 1)).toBe(SHORE.s));
  it("land to the west", () => expect(groundFrame(map(["~~~", "f~~", "~~~"]), 1, 1)).toBe(SHORE.w));
  it("north-west corner", () => expect(groundFrame(map(["~.~", ".~~", "~~~"]), 1, 1)).toBe(SHORE.nw));
  it("south-east corner", () => expect(groundFrame(map(["~~~", "~~.", "~.~"]), 1, 1)).toBe(SHORE.se));
  it("narrow channel (land on opposite sides) falls back to water", () =>
    expect(groundFrame(map(["~.~", "~~~", "~.~"]), 1, 1)).toBe(GROUND.water));
  it("three land sides fall back to water", () =>
    expect(groundFrame(map(["~.~", ".~.", "~~~"]), 1, 1)).toBe(GROUND.water));
  it("outside the map counts as water, not land", () => expect(groundFrame(map(["~~", "~~"]), 0, 0)).toBe(GROUND.water));
});

describe("groundFrame — land", () => {
  it("inland sand is plain", () => expect(groundFrame(map(["sss", "sss", "sss"]), 1, 1)).toBe(GROUND.sand));
  it("grass and forest", () => {
    expect(groundFrame(map(["...", "...", "..."]), 1, 1)).toBe(GROUND.grass);
    expect(groundFrame(map(["fff", "fff", "fff"]), 1, 1)).toBe(GROUND.forestFloor);
  });
  it("sand with water on one side gets the matching rim", () => {
    expect(groundFrame(map(["s~s", "sss", "sss"]), 1, 1)).toBe(SAND_RIM.n);
    expect(groundFrame(map(["sss", "ss~", "sss"]), 1, 1)).toBe(SAND_RIM.e);
  });
  it("sand with water only on a diagonal gets the corner rim", () =>
    expect(groundFrame(map(["sss", "sss", "ss~"]), 1, 1)).toBe(SAND_RIM.se));
  it("sand with water on two sides stays plain (no matching piece)", () =>
    expect(groundFrame(map(["s~s", "ss~", "sss"]), 1, 1)).toBe(GROUND.sand));
  it("grass next to water has no rim", () => expect(groundFrame(map([".~.", "...", "..."]), 1, 1)).toBe(GROUND.grass));
});
