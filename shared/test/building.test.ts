import { describe, it, expect } from "vitest";
import {
  BALANCE,
  isToken,
  isWorldCode,
  ITEM_IDS,
  mulberry32,
  newWorldCode,
  placeCheck,
  recipeCost,
  STRUCTURE_DEFS,
  TILE_SIZE,
  type PlaceWorld,
} from "../src/index";
import { makeMap } from "./helpers";

describe("structure items", () => {
  it("adds wall, door, bed to the bag order", () =>
    expect(ITEM_IDS.slice(-3)).toEqual(["wall", "door", "bed"]));

  it("recipes match the design table", () => {
    expect(recipeCost("wall")).toEqual({ wood: 2 });
    expect(recipeCost("door")).toEqual({ wood: 3, fiber: 1 });
    expect(recipeCost("bed")).toEqual({ wood: 3, fiber: 4 });
  });

  it("only walls are solid", () => {
    expect(STRUCTURE_DEFS.wall.solid).toBe(true);
    expect(STRUCTURE_DEFS.door.solid).toBe(false);
    expect(STRUCTURE_DEFS.bed.solid).toBe(false);
    expect(STRUCTURE_DEFS.campfire.solid).toBe(false);
  });
});

describe("placeCheck", () => {
  // 7×7: น้ำรอบ, หญ้าข้างใน
  const map = makeMap(["~~~~~~~", "~.....~", "~.....~", "~.....~", "~.....~", "~.....~", "~~~~~~~"]);
  const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 });
  const world = (over: Partial<PlaceWorld> = {}): PlaceWorld => ({
    map,
    occupied: () => false,
    structures: [],
    players: [],
    ...over,
  });
  const me = at(2, 3);

  it("ok next to the player", () => expect(placeCheck(world(), me, "wall", 3, 3)).toBe(true));
  it("not out of reach", () => expect(placeCheck(world(), me, "wall", 5, 3)).toBe(false));
  it("reach for placing is 32px (longer than the 24px gather reach)", () => {
    expect(BALANCE.placeReach).toBe(32);
    // ห่างจากกลางช่อง (3,3) = 29px: เกินระยะเก็บของ แต่ยังวางได้
    expect(placeCheck(world(), { x: me.x - 13, y: me.y }, "wall", 3, 3)).toBe(true);
    // ห่าง 33px: ไกลเกิน
    expect(placeCheck(world(), { x: me.x - 17, y: me.y }, "wall", 3, 3)).toBe(false);
  });
  it("not on water", () => expect(placeCheck(world(), at(1, 1), "wall", 0, 1)).toBe(false));
  it("not on decor", () => expect(placeCheck(world({ occupied: (x, y) => x === 3 && y === 3 }), me, "wall", 3, 3)).toBe(false));
  it("not on another structure", () =>
    expect(placeCheck(world({ structures: [{ kind: "wall", tx: 3, ty: 3 }] }), me, "door", 3, 3)).toBe(false));
  it("walls may touch walls", () =>
    expect(placeCheck(world({ structures: [{ kind: "wall", tx: 3, ty: 2 }] }), me, "wall", 3, 3)).toBe(true));
  it("campfires may not touch other structures", () =>
    expect(placeCheck(world({ structures: [{ kind: "wall", tx: 3, ty: 2 }] }), me, "campfire", 3, 3)).toBe(false));
  it("not on top of any player (including yourself)", () => {
    expect(placeCheck(world({ players: [me] }), me, "wall", 2, 3)).toBe(false);
    expect(placeCheck(world({ players: [me, at(3, 3)] }), me, "wall", 3, 3)).toBe(false);
  });
  it("not past the world limit", () => {
    const many = Array.from({ length: BALANCE.maxStructures }, (_, i) => ({ kind: "wall", tx: 100 + i, ty: 100 }));
    expect(placeCheck(world({ structures: many }), me, "wall", 3, 3)).toBe(false);
  });
  it("rejects non-integer or unknown input", () => {
    expect(placeCheck(world(), me, "wall", 3.5, 3)).toBe(false);
    expect(placeCheck(world(), me, "wood", 3, 3)).toBe(false);
  });
});

describe("world codes and tokens", () => {
  it("makes 6-char codes without confusable letters", () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      const code = newWorldCode(rand);
      expect(isWorldCode(code), code).toBe(true);
      expect(code).not.toMatch(/[01OI]/);
    }
  });
  it("rejects bad codes (path tricks, wrong length, lowercase)", () => {
    for (const bad of ["../x", "ABC", "ABCDEFG", "abcdef", "ABC/EF", "", 42, null]) expect(isWorldCode(bad)).toBe(false);
  });
  it("token format", () => {
    expect(isToken("a".repeat(16))).toBe(true);
    expect(isToken("short")).toBe(false);
    expect(isToken("x".repeat(65))).toBe(false);
    expect(isToken("has space in it 123")).toBe(false);
  });
});
