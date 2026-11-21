import { describe, it, expect } from "vitest";
import {
  generateWorld,
  findSpawn,
  tileAt,
  isWalkable,
  Tile,
  MAX_PLAYERS,
  TILE_SIZE,
  WORLD_SIZE,
} from "../src/index";

describe("generateWorld", () => {
  it("same seed → identical tiles", () =>
    expect(generateWorld(1234).tiles).toEqual(generateWorld(1234).tiles));

  it("different seeds → different tiles", () =>
    expect(generateWorld(1).tiles).not.toEqual(generateWorld(2).tiles));

  it("uses WORLD_SIZE by default", () => {
    const m = generateWorld(5);
    expect(m.size).toBe(WORLD_SIZE);
    expect(m.tiles.length).toBe(WORLD_SIZE * WORLD_SIZE);
  });

  it("is an island: 2-tile border is all water", () => {
    for (const seed of [1, 99, 123456]) {
      const m = generateWorld(seed);
      for (let i = 0; i < m.size; i++) {
        for (let b = 0; b < 2; b++) {
          expect(tileAt(m, i, b)).toBe(Tile.Water);
          expect(tileAt(m, i, m.size - 1 - b)).toBe(Tile.Water);
          expect(tileAt(m, b, i)).toBe(Tile.Water);
          expect(tileAt(m, m.size - 1 - b, i)).toBe(Tile.Water);
        }
      }
    }
  });

  it("has 35%–75% land for many seeds", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const m = generateWorld(seed);
      let land = 0;
      for (const t of m.tiles) if (isWalkable(t)) land++;
      const ratio = land / (m.size * m.size);
      expect(ratio, `seed ${seed}`).toBeGreaterThanOrEqual(0.35);
      expect(ratio, `seed ${seed}`).toBeLessThanOrEqual(0.75);
    }
  });

  it("centre 9x9 contains land", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const m = generateWorld(seed);
      const c = Math.floor(m.size / 2);
      let found = false;
      for (let y = c - 4; y <= c + 4; y++)
        for (let x = c - 4; x <= c + 4; x++) if (isWalkable(tileAt(m, x, y))) found = true;
      expect(found, `seed ${seed}`).toBe(true);
    }
  });

  it("tileAt outside the map is water", () => {
    const m = generateWorld(7);
    expect(tileAt(m, -1, 0)).toBe(Tile.Water);
    expect(tileAt(m, m.size, 5)).toBe(Tile.Water);
    expect(tileAt(m, 3, -10)).toBe(Tile.Water);
  });
});

describe("findSpawn", () => {
  it("spawns are walkable and distinct for 50 seeds × MAX_PLAYERS", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const map = generateWorld(seed);
      const seen = new Set<string>();
      for (let i = 0; i < MAX_PLAYERS; i++) {
        const p = findSpawn(map, i);
        const tile = tileAt(map, Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE));
        expect(isWalkable(tile), `seed ${seed} player ${i}`).toBe(true);
        seen.add(`${p.x},${p.y}`);
      }
      expect(seen.size).toBe(MAX_PLAYERS);
    }
  });

  it("returns the centre of a tile in pixels", () => {
    const p = findSpawn(generateWorld(3), 0);
    expect(p.x % TILE_SIZE).toBe(TILE_SIZE / 2);
    expect(p.y % TILE_SIZE).toBe(TILE_SIZE / 2);
  });
});
