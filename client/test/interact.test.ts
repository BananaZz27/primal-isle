import { describe, it, expect } from "vitest";
import { DecorKind, TILE_SIZE, Tile, type Decor, type WorldMap } from "@primal/shared";
import { pickTarget } from "../src/input/interact";
import { barPercent } from "../src/ui/stats";

/** เกาะ 7×7 ล้อมด้วยน้ำ ข้างในเป็นหญ้า */
function island(): WorldMap {
  const size = 7;
  const tiles = new Uint8Array(size * size).fill(Tile.Grass);
  for (let i = 0; i < size; i++) {
    tiles[i] = tiles[(size - 1) * size + i] = tiles[i * size] = tiles[i * size + size - 1] = Tile.Water;
  }
  return { seed: 0, size, tiles };
}
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 });
const node = (kind: DecorKind, tx: number, ty: number): Decor => ({ kind, tx, ty, variant: 0 });

describe("pickTarget", () => {
  const map = island();

  it("picks the nearest resource in reach", () => {
    const decor = [node(DecorKind.Tree, 4, 3), node(DecorKind.Bush, 3, 4)];
    const p = at(3, 3);
    p.y += 4; // ใกล้พุ่มไม้ (ล่าง) มากกว่าต้นไม้ (ขวา)
    expect(pickTarget(p.x, p.y, decor, map, () => false)).toEqual({ kind: "node", id: 1 });
  });

  it("skips used-up resources", () => {
    const decor = [node(DecorKind.Tree, 4, 3), node(DecorKind.Bush, 3, 4)];
    const p = at(3, 3);
    expect(pickTarget(p.x, p.y, decor, map, (id) => id === 0)).toEqual({ kind: "node", id: 1 });
  });

  it("ignores flowers", () => {
    const p = at(3, 3);
    expect(pickTarget(p.x, p.y, [node(DecorKind.Flower, 3, 4)], map, () => false)).toBeNull();
  });

  it("falls back to drinking when next to water", () => {
    const p = at(1, 3);
    expect(pickTarget(p.x, p.y, [], map, () => false)).toEqual({ kind: "water" });
  });

  it("returns null when nothing is in reach", () => {
    const p = at(3, 3);
    expect(pickTarget(p.x, p.y, [node(DecorKind.Tree, 6, 6)], map, () => false)).toBeNull();
  });
});

describe("barPercent", () => {
  it("clamps and rounds", () => {
    expect(barPercent(55.4)).toBe(55);
    expect(barPercent(-3)).toBe(0);
    expect(barPercent(140)).toBe(100);
    expect(barPercent(Number.NaN)).toBe(0);
  });
});
