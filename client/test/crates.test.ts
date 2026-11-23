import { describe, it, expect } from "vitest";
import { DecorKind, TILE_SIZE, Tile, type WorldMap } from "@primal/shared";
import { pickTarget } from "../src/input/interact";
import { edgeArrow, nearestCrate } from "../src/ui/crateArrow";
import { lootGained, lootText } from "../src/ui/loot";

const map: WorldMap = { seed: 0, size: 12, tiles: new Uint8Array(144).fill(Tile.Grass) };
const P = { x: 5 * TILE_SIZE + 8, y: 5 * TILE_SIZE + 8 };
const none = () => false;
const tree = [{ kind: DecorKind.Tree, tx: 6, ty: 5, variant: 0 }];
const wild = (dx: number) => ({ key: "d1", kind: "compy", x: P.x + dx, y: P.y, owner: "" });
const crate = (tx: number, ty: number, key = "c1") => ({ key, tx, ty });
const chest = (tx: number, ty: number, key = "s1") => ({ key, tx, ty });

describe("pickTarget priority: bag → supply crate → wild dino → storage chest → resource", () => {
  it("a dropped bag beats a supply crate", () => {
    const t = pickTarget(P.x, P.y, { decor: [], map, isDepleted: none, drops: [{ key: "b", tx: 5, ty: 6 }], crates: [crate(4, 5)] });
    expect(t).toEqual({ kind: "drop", key: "b" });
  });

  it("a supply crate beats a wild dino", () => {
    const t = pickTarget(P.x, P.y, { decor: [], map, isDepleted: none, crates: [crate(4, 5)], dinos: [wild(12)] });
    expect(t).toEqual({ kind: "crate", key: "c1" });
  });

  it("a wild dino beats the storage chest", () => {
    const t = pickTarget(P.x, P.y, { decor: [], map, isDepleted: none, dinos: [wild(12)], chests: [chest(5, 6)] });
    expect(t).toEqual({ kind: "dino", key: "d1" });
  });

  it("the storage chest beats a tree", () => {
    const t = pickTarget(P.x, P.y, { decor: tree, map, isDepleted: none, chests: [chest(4, 5)] });
    expect(t).toEqual({ kind: "chest", key: "s1" });
  });

  it("picks the nearest of several crates / chests", () => {
    const p = { x: P.x + 4, y: P.y };
    expect(pickTarget(p.x, p.y, { decor: [], map, isDepleted: none, crates: [crate(4, 5, "far"), crate(6, 5, "near")] })).toEqual({ kind: "crate", key: "near" });
    expect(pickTarget(p.x, p.y, { decor: [], map, isDepleted: none, chests: [chest(4, 5, "far"), chest(6, 5, "near")] })).toEqual({ kind: "chest", key: "near" });
  });

  it("crates and chests out of reach are ignored", () => {
    const t = pickTarget(P.x, P.y, { decor: tree, map, isDepleted: none, crates: [crate(8, 5)], chests: [chest(5, 8)] });
    expect(t).toEqual({ kind: "node", id: 0 });
  });
});

describe("nearestCrate", () => {
  it("the closest crate anywhere on the island, with its distance in tiles", () => {
    const n = nearestCrate(P.x, P.y, [crate(5, 15, "a"), crate(9, 5, "b")]);
    expect(n?.key).toBe("b");
    expect(n?.tiles).toBe(4);
    expect(nearestCrate(P.x, P.y, [])).toBeNull();
  });
});

describe("edgeArrow (screen 800×400, margin 30)", () => {
  const arrow = (x: number, y: number) => edgeArrow(x, y, 800, 400, { top: 30, right: 30, bottom: 30, left: 30 });

  it("hidden while the crate is on screen", () => expect(arrow(700, 100)).toBeNull());

  it("crate far right → arrow on the right edge pointing right", () => {
    const a = arrow(2000, 200)!;
    expect(a.x).toBeCloseTo(770);
    expect(a.y).toBeCloseTo(200);
    expect(a.angle).toBeCloseTo(0);
  });

  it("crate straight up → top edge, pointing up", () => {
    const a = arrow(400, -900)!;
    expect(a.x).toBeCloseTo(400);
    expect(a.y).toBeCloseTo(30);
    expect(a.angle).toBeCloseTo(-Math.PI / 2);
  });

  it("crate below-left → stays inside the screen and points down-left", () => {
    const a = arrow(-1000, 1400)!;
    expect(a.x).toBeGreaterThanOrEqual(30);
    expect(a.y).toBeLessThanOrEqual(370);
    expect(a.angle).toBeCloseTo(Math.atan2(1200, -1400));
  });
});

describe("edgeArrow keeps clear of the inventory bar", () => {
  it("a crate straight below lands above the bottom inset, still pointing down", () => {
    const a = edgeArrow(400, 3000, 800, 400, { top: 30, right: 30, bottom: 90, left: 30 })!;
    expect(a.y).toBeCloseTo(310);
    expect(a.x).toBeCloseTo(400);
    expect(a.angle).toBeCloseTo(Math.PI / 2);
  });

  it("the arrow always stays inside the inset box, whatever the direction", () => {
    const inset = { top: 60, right: 44, bottom: 90, left: 44 };
    for (let deg = 0; deg < 360; deg += 7) {
      const r = (deg * Math.PI) / 180;
      const a = edgeArrow(400 + Math.cos(r) * 5000, 200 + Math.sin(r) * 5000, 800, 400, inset)!;
      expect(a.x).toBeGreaterThanOrEqual(inset.left - 1e-6);
      expect(a.x).toBeLessThanOrEqual(800 - inset.right + 1e-6);
      expect(a.y).toBeGreaterThanOrEqual(inset.top - 1e-6);
      expect(a.y).toBeLessThanOrEqual(400 - inset.bottom + 1e-6);
    }
  });
});

describe("loot message", () => {
  it("lists only what went up, in inventory order", () => {
    const gained = lootGained({ wood: 2, canned: 0 }, { wood: 9, canned: 2, stone: 0 });
    expect(gained).toEqual([["wood", 7], ["canned", 2]]);
    expect(lootText(gained)).toBe("📦 ได้ ไม้ ×7, อาหารกระป๋อง ×2");
  });

  it("nothing gained → empty list", () => expect(lootGained({ wood: 3 }, { wood: 3 })).toEqual([]));
});
