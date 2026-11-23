import { describe, it, expect } from "vitest";
import { BALANCE, TILE_SIZE } from "@primal/shared";
import { chestStillOpen, chestTitle, slotList } from "../src/ui/chestPanel";
import { describeJoinError } from "../src/net/errors";
import { PLAYER_NAME_Y, tamedTagY } from "../src/render/labelLayout";

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
  it('"world already open" (the room is full and locked) → world full', () =>
    expect(describeJoinError(new Error("world already open"))).toBe("โลกเต็มแล้ว (สูงสุด 8 คน)"));
});

describe("labels above heads", () => {
  it("the tamed ❤️ tag sits under the dino's feet, so it never covers a player name", () => {
    expect(PLAYER_NAME_Y).toBeLessThan(0);
    for (const half of [4, 6, 9, 12]) expect(tamedTagY(half)).toBeGreaterThan(half);
  });
});
