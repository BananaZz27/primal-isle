import { describe, it, expect } from "vitest";
import { BALANCE, TILE_SIZE } from "@primal/shared";
import { chestStillOpen, chestTitle, slotList } from "../src/ui/chestPanel";
import { describeJoinError } from "../src/net/errors";
import { PLAYER_NAME_Y, tamedTagY } from "../src/render/labelLayout";
import { demolishTarget } from "../src/input/building";

describe("chest window", () => {
  it("lists only items you have, in inventory order", () => {
    expect(slotList(new Map([["chest", 1], ["wood", 4], ["stone", 0], ["canned", 2]]))).toEqual([
      ["wood", 4],
      ["canned", 2],
      ["chest", 1],
    ]);
    expect(slotList(undefined)).toEqual([]);
  });

  it("title shows how many kinds the chest holds out of the limit", () =>
    expect(chestTitle(3)).toBe(`📦 กล่องเก็บของ (${3}/${BALANCE.chestKinds} ชนิด)`));

  it("stays open next to the chest, closes past 32px or when the chest is gone", () => {
    const s = { tx: 5, ty: 5 };
    const cx = 5 * TILE_SIZE + 8;
    expect(chestStillOpen(cx + 20, cx, s)).toBe(true);
    expect(chestStillOpen(cx + 31, cx, s)).toBe(true);
    expect(chestStillOpen(cx + 33, cx, s)).toBe(false);
    expect(chestStillOpen(cx, cx, undefined)).toBe(false);
  });
});

describe("join errors", () => {
  it('"world already open" → full, or someone is opening it right now (retry may work)', () =>
    expect(describeJoinError(new Error("world already open"))).toBe("โลกเต็มแล้ว (สูงสุด 8 คน) หรือกำลังเปิดอยู่ ลองใหม่อีกครั้ง"));
});

describe("labels above heads", () => {
  it("the tamed ❤️ tag sits under the dino's feet, so it never covers a player name", () => {
    expect(PLAYER_NAME_Y).toBeLessThan(0);
    for (const half of [4, 6, 9, 12]) expect(tamedTagY(half)).toBeGreaterThan(half);
  });
});

describe("🪓 demolish target", () => {
  const P = { x: 5 * TILE_SIZE + 8, y: 5 * TILE_SIZE + 8 };
  const items = (counts: Record<string, number>) => (key: string) => counts[key] ?? 0;

  it("skips a chest that still has things inside and takes the wall behind it", () => {
    const list = [{ key: "c", kind: "chest", tx: 6, ty: 5 }, { key: "w", kind: "wall", tx: 5, ty: 7 }];
    expect(demolishTarget(P.x, P.y, list, items({ c: 3 }))).toEqual({ key: "w" });
  });

  it("an empty chest can be demolished", () => {
    expect(demolishTarget(P.x, P.y, [{ key: "c", kind: "chest", tx: 6, ty: 5 }], items({}))).toEqual({ key: "c" });
  });

  it("only full chests in reach → says why instead of doing nothing", () => {
    expect(demolishTarget(P.x, P.y, [{ key: "c", kind: "chest", tx: 6, ty: 5 }], items({ c: 1 }))).toEqual({ blocked: "chest" });
    expect(demolishTarget(P.x, P.y, [], items({}))).toBeNull();
  });
});
