import { describe, it, expect } from "vitest";
import { DecorKind, DINO_KINDS, TILE_SIZE, Tile, type WorldMap } from "@primal/shared";
import { pickTarget } from "../src/input/interact";
import { feedTarget } from "../src/input/feed";
import { ITEM_ICONS } from "../src/art/textures";
import { itemLabel, recipeLabel, RECIPE_HINTS } from "../src/ui/labels";

const map: WorldMap = { seed: 0, size: 12, tiles: new Uint8Array(144).fill(Tile.Grass) };
const P = { x: 5 * TILE_SIZE + 8, y: 5 * TILE_SIZE + 8 };
const dino = (key: string, kind: string, dx: number, owner = "") => ({ key, kind, x: P.x + dx, y: P.y, owner });

describe("dino items", () => {
  it("new items have icons and Thai names", () => {
    for (const id of ["meat", "steak", "spear"] as const) {
      expect(ITEM_ICONS[id]).toBeDefined();
      expect(itemLabel(id).length).toBeGreaterThan(0);
    }
    expect(recipeLabel("spear")).toBe("หอก");
    expect(RECIPE_HINTS.spear.length).toBeGreaterThan(0);
  });
});

describe("hitting dinos", () => {
  const tree = [{ kind: DecorKind.Tree, tx: 6, ty: 5, variant: 0 }];

  it("a wild dino in reach comes before resources", () => {
    const t = pickTarget(P.x, P.y, { decor: tree, map, isDepleted: () => false, dinos: [dino("d1", "compy", -20)] });
    expect(t).toEqual({ kind: "dino", key: "d1" });
  });

  it("picks the nearest wild one and never a tamed one", () => {
    const dinos = [dino("near-tamed", "compy", 12, "เพื่อน"), dino("far", "compy", -28), dino("mid", "raptor", 20)];
    expect(pickTarget(P.x, P.y, { decor: [], map, isDepleted: () => false, dinos })).toEqual({ kind: "dino", key: "mid" });
  });

  it("out of reach → falls back to the resource", () => {
    const t = pickTarget(P.x, P.y, { decor: tree, map, isDepleted: () => false, dinos: [dino("d1", "compy", -60)] });
    expect(t).toEqual({ kind: "node", id: 0 });
  });
});

describe("feedTarget", () => {
  const has = (items: Record<string, number>) => (i: string) => items[i] ?? 0;

  it("a wild tameable dino in reach, when you carry its food", () => {
    expect(feedTarget(P.x, P.y, [dino("c", "compy", 20)], has({ berry: 1 }))).toBe("c");
    expect(feedTarget(P.x, P.y, [dino("r", "raptor", 20)], has({ meat: 1 }))).toBe("r");
  });

  it("null without the right food, out of reach, untameable or already tamed", () => {
    expect(feedTarget(P.x, P.y, [dino("c", "compy", 20)], has({ meat: 3 }))).toBeNull();
    expect(feedTarget(P.x, P.y, [dino("c", "compy", 90)], has({ berry: 3 }))).toBeNull();
    expect(feedTarget(P.x, P.y, [dino("t", "trike", 20)], has({ berry: 3, meat: 3 }))).toBeNull();
    expect(feedTarget(P.x, P.y, [dino("c", "compy", 20, "โบ๊ท")], has({ berry: 3 }))).toBeNull();
  });
});
