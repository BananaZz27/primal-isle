import { describe, it, expect } from "vitest";
import {
  DecorKind,
  findSpawn,
  generateDecor,
  generateWorld,
  isWalkable,
  MAX_DECOR,
  MAX_PLAYERS,
  Tile,
  TILE_SIZE,
  tileAt,
} from "../src/index";

describe("generateDecor", () => {
  it("is deterministic per seed", () =>
    expect(generateDecor(generateWorld(5))).toEqual(generateDecor(generateWorld(5))));

  it("differs between seeds", () =>
    expect(generateDecor(generateWorld(5))).not.toEqual(generateDecor(generateWorld(6))));

  it("puts trees only on forest and small decor only on grass", () => {
    for (const seed of [1, 2, 3]) {
      const map = generateWorld(seed);
      for (const d of generateDecor(map)) {
        const tile = tileAt(map, d.tx, d.ty);
        expect(tile).toBe(d.kind === DecorKind.Tree ? Tile.Forest : Tile.Grass);
      }
    }
  });

  it("never places two trees next to each other (Chebyshev distance ≥ 2)", () => {
    const trees = generateDecor(generateWorld(7)).filter((d) => d.kind === DecorKind.Tree);
    const at = new Set(trees.map((t) => `${t.tx},${t.ty}`));
    for (const t of trees)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (dx || dy) expect(at.has(`${t.tx + dx},${t.ty + dy}`)).toBe(false);
  });

  it("forest looks like forest: ≥ 15% of forest tiles have a tree", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const map = generateWorld(seed);
      const forest = Array.from(map.tiles).filter((t) => t === Tile.Forest).length;
      const trees = generateDecor(map).filter((d) => d.kind === DecorKind.Tree).length;
      expect(trees / forest, `seed ${seed}`).toBeGreaterThanOrEqual(0.15);
    }
  });

  it("no tree on or next to any spawn tile", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const map = generateWorld(seed);
      const trees = generateDecor(map).filter((d) => d.kind === DecorKind.Tree);
      for (let i = 0; i < MAX_PLAYERS; i++) {
        const s = findSpawn(map, i);
        const sx = Math.floor(s.x / TILE_SIZE);
        const sy = Math.floor(s.y / TILE_SIZE);
        for (const t of trees)
          expect(Math.max(Math.abs(t.tx - sx), Math.abs(t.ty - sy)), `seed ${seed} p${i}`).toBeGreaterThan(1);
      }
    }
  });

  it("never more than MAX_DECOR pieces", () => {
    for (let seed = 1; seed <= 50; seed++) expect(generateDecor(generateWorld(seed)).length).toBeLessThanOrEqual(MAX_DECOR);
  });

  it("at most one piece per tile, all on walkable land, sorted by row then column", () => {
    const list = generateDecor(generateWorld(9));
    const map = generateWorld(9);
    expect(new Set(list.map((d) => `${d.tx},${d.ty}`)).size).toBe(list.length);
    for (const d of list) expect(isWalkable(tileAt(map, d.tx, d.ty))).toBe(true);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      expect(a.ty < b.ty || (a.ty === b.ty && a.tx < b.tx)).toBe(true);
    }
  });

  it("variant is a byte", () => {
    for (const d of generateDecor(generateWorld(4))) {
      expect(Number.isInteger(d.variant)).toBe(true);
      expect(d.variant).toBeGreaterThanOrEqual(0);
      expect(d.variant).toBeLessThan(256);
    }
  });
});
