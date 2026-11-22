import { describe, it, expect } from "vitest";
import {
  BALANCE,
  canTame,
  DINO_KINDS,
  dinoDef,
  dinoInReach,
  dinoSpawnOk,
  FOOD,
  isDinoKind,
  ITEM_IDS,
  playerDamage,
  recipeCost,
  stepMover,
  stepPlayer,
  TILE_SIZE,
  TOOLS,
  type ItemId,
} from "../src/index";
import { makeMap } from "./helpers";

const has = (items: Partial<Record<ItemId, number>>) => (i: ItemId) => items[i] ?? 0;

describe("dinosaur data", () => {
  it("has the four kinds from the design", () => {
    expect([...DINO_KINDS]).toEqual(["compy", "duckbill", "raptor", "trike"]);
    expect(dinoDef("raptor")).toMatchObject({ hp: 45, meat: 2, cap: 6, temper: "aggressive", bite: 8, biteCooldownMs: 1000 });
    expect(dinoDef("trike")).toMatchObject({ hp: 150, meat: 6, cap: 4, temper: "defensive", bite: 15 });
    expect(isDinoKind("compy")).toBe(true);
    expect(isDinoKind("toString")).toBe(false);
  });

  it("only compy (berries ×3) and raptor (meat ×4) can be tamed", () => {
    expect(canTame("compy")).toEqual({ food: "berry", count: 3 });
    expect(canTame("raptor")).toEqual({ food: "meat", count: 4 });
    expect(canTame("duckbill")).toBeNull();
    expect(canTame("trike")).toBeNull();
  });

  it("adds meat, steak and the spear", () => {
    expect(ITEM_IDS).toEqual(expect.arrayContaining(["meat", "steak", "spear"]));
    expect(FOOD.meat).toBe(12);
    expect(FOOD.steak).toBe(45);
    expect(recipeCost("spear")).toEqual({ wood: 3, stone: 2, fiber: 3 });
    expect(TOOLS).toContain("spear");
  });

  it("player damage: fist 4, axe 8, spear 12 (best weapon you own)", () => {
    expect(playerDamage(has({}))).toBe(4);
    expect(playerDamage(has({ axe: 1 }))).toBe(8);
    expect(playerDamage(has({ axe: 1, spear: 1 }))).toBe(12);
  });

  it("reach to a dino counts its body size", () => {
    expect(dinoInReach(0, 0, BALANCE.gatherReach + 6, 0, 6)).toBe(true);
    expect(dinoInReach(0, 0, BALANCE.gatherReach + 7, 0, 6)).toBe(false);
  });
});

describe("stepMover", () => {
  // แถวกลางมีต้นไม้ 2 ต้นเว้นช่องว่าง 1 ช่อง (ช่อง 3)
  const map = makeMap(["........", "........", "........", "........", "........", "........", "........", "........"]);
  const solid = (tx: number, ty: number) => ty === 4 && (tx === 2 || tx === 4);

  it("a small body passes a one-tile gap, a big one does not", () => {
    const small = { x: 3.5 * TILE_SIZE, y: 2.5 * TILE_SIZE, vx: 0, vy: 0 };
    for (let i = 0; i < 40; i++) stepMover(small, 0, 1, 60, 5, 0.05, map, solid);
    expect(small.y).toBeGreaterThan(5 * TILE_SIZE);

    const big = { x: 3.5 * TILE_SIZE, y: 2.5 * TILE_SIZE, vx: 0, vy: 0 };
    for (let i = 0; i < 40; i++) stepMover(big, 0, 1, 60, 12, 0.05, map, solid);
    expect(big.y).toBeLessThan(4 * TILE_SIZE);
  });

  it("stepPlayer still moves at PLAYER_SPEED", () => {
    const p = { x: 40, y: 40, vx: 0, vy: 0 };
    stepPlayer(p, { moveX: 1, moveY: 0 }, 0.05, map);
    expect(p.x).toBeCloseTo(44);
  });
});

describe("dinoSpawnOk", () => {
  const map = makeMap(["~~~~~~~~", "~......~", "~......~", "~......~", "~......~", "~......~", "~......~", "~~~~~~~~"]);
  const none = () => false;
  it("needs dry land, no solid, and distance from players and spawn points", () => {
    expect(dinoSpawnOk(map, none, 3, 3, [], [])).toBe(true);
    expect(dinoSpawnOk(map, none, 0, 3, [], [])).toBe(false);
    expect(dinoSpawnOk(map, (x, y) => x === 3 && y === 3, 3, 3, [], [])).toBe(false);
    const near = { x: 3 * TILE_SIZE, y: 5 * TILE_SIZE };
    expect(dinoSpawnOk(map, none, 3, 3, [near], [])).toBe(false);
    expect(dinoSpawnOk(map, none, 3, 3, [], [near])).toBe(false);
  });
});
