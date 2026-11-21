import { describe, it, expect } from "vitest";
import {
  BALANCE,
  DecorKind,
  findSpawn,
  generateDecor,
  generateWorld,
  inReach,
  MAX_PLAYERS,
  nodeDef,
  solidFromNodes,
  TILE_SIZE,
  touchesWater,
} from "../src/index";
import { makeMap } from "./helpers";

describe("nodeDef", () => {
  it("matches the design table", () => {
    expect(nodeDef(DecorKind.Tree)).toEqual({ item: "wood", hits: 3, regrowSec: 120, solid: true });
    expect(nodeDef(DecorKind.Pebble)).toEqual({ item: "stone", hits: 3, regrowSec: 180, solid: true });
    expect(nodeDef(DecorKind.Bush)).toEqual({ item: "berry", hits: 2, regrowSec: 60, solid: false });
    expect(nodeDef(DecorKind.Tuft)).toEqual({ item: "fiber", hits: 1, regrowSec: 60, solid: false });
  });
  it("flowers are not resources", () => expect(nodeDef(DecorKind.Flower)).toBeNull());
});

describe("inReach", () => {
  const cx = 5 * TILE_SIZE + TILE_SIZE / 2;
  it(`reaches at exactly ${BALANCE.gatherReach}px`, () => expect(inReach(cx + BALANCE.gatherReach, 88, 5, 5)).toBe(true));
  it("does not reach 1px further", () => expect(inReach(cx + BALANCE.gatherReach + 1, 88, 5, 5)).toBe(false));
});

describe("touchesWater", () => {
  const m = makeMap(["~~~~~", "~...~", "~...~", "~...~", "~~~~~"]);
  it("true next to the shore", () => expect(touchesWater(m, 1.5 * TILE_SIZE, 2.5 * TILE_SIZE)).toBe(true));
  it("false far from water", () =>
    expect(touchesWater(makeMap(Array(9).fill(".........")), 4.5 * TILE_SIZE, 4.5 * TILE_SIZE)).toBe(false));
});

describe("solidFromNodes", () => {
  const map = generateWorld(3);
  const decor = generateDecor(map);
  const idOf = (kind: DecorKind) => decor.findIndex((d) => d.kind === kind);

  it("trees and rocks are solid, bushes and tufts are not", () => {
    const solid = solidFromNodes(map, decor, () => false);
    for (const kind of [DecorKind.Tree, DecorKind.Pebble]) {
      const d = decor[idOf(kind)];
      expect(solid(d.tx, d.ty), DecorKind[kind]).toBe(true);
    }
    for (const kind of [DecorKind.Bush, DecorKind.Tuft, DecorKind.Flower]) {
      const d = decor[idOf(kind)];
      expect(solid(d.tx, d.ty), DecorKind[kind]).toBe(false);
    }
  });

  it("a depleted tree is not solid", () => {
    const id = idOf(DecorKind.Tree);
    const solid = solidFromNodes(map, decor, (n) => n === id);
    expect(solid(decor[id].tx, decor[id].ty)).toBe(false);
  });

  it("no spawn point is solid (50 seeds × MAX_PLAYERS)", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const m = generateWorld(seed);
      const solid = solidFromNodes(m, generateDecor(m), () => false);
      for (let i = 0; i < MAX_PLAYERS; i++) {
        const s = findSpawn(m, i);
        expect(solid(Math.floor(s.x / TILE_SIZE), Math.floor(s.y / TILE_SIZE)), `seed ${seed} p${i}`).toBe(false);
      }
    }
  });
});

describe("generateDecor bushes", () => {
  it("places some berry bushes on grass", () => {
    const decor = generateDecor(generateWorld(2));
    expect(decor.filter((d) => d.kind === DecorKind.Bush).length).toBeGreaterThan(10);
  });
});
