import { describe, it, expect } from "vitest";
import { hitboxTouches, isToken, placeCheck, Tile, TILE_SIZE, type PlaceWorld } from "@primal/shared";
import type { Facing } from "../src/render/facing";
import { frontTile, nearestInReach } from "../src/input/building";
import { newToken } from "../src/net/token";
import { describeJoinError } from "../src/net/errors";
import { itemLabel } from "../src/ui/labels";

const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 });

describe("frontTile", () => {
  it("is the tile the player faces", () => {
    const p = at(5, 5);
    expect(frontTile(p.x, p.y, "right")).toEqual({ tx: 6, ty: 5 });
    expect(frontTile(p.x, p.y, "up")).toEqual({ tx: 5, ty: 4 });
    expect(frontTile(p.x, p.y, "left")).toEqual({ tx: 4, ty: 5 });
    expect(frontTile(p.x, p.y, "down")).toEqual({ tx: 5, ty: 6 });
  });

  // บั๊กจากเทสต์เบราว์เซอร์: เดินนิดเดียวแล้วกล่องชนล้ำเข้าช่องหน้า → เซิร์ฟเวอร์ไม่ยอมให้วาง
  it("never overlaps the player's own hitbox, and the server accepts it, at any spot in a tile", () => {
    const facings: Facing[] = ["left", "right", "up", "down"];
    const open: Omit<PlaceWorld, "players"> = { map: { seed: 0, size: 20, tiles: new Uint8Array(400).fill(Tile.Grass) }, occupied: () => false, structures: [] };
    for (let ox = 0; ox < TILE_SIZE; ox++)
      for (let oy = 0; oy < TILE_SIZE; oy++)
        for (const f of facings) {
          const x = 8 * TILE_SIZE + ox;
          const y = 8 * TILE_SIZE + oy;
          const t = frontTile(x, y, f);
          expect(hitboxTouches(x, y, t.tx, t.ty), `${f} @${ox},${oy}`).toBe(false);
          expect(placeCheck({ ...open, players: [{ x, y }] }, { x, y }, "wall", t.tx, t.ty), `${f} @${ox},${oy}`).toBe(true);
        }
  });
});

describe("nearestInReach", () => {
  it("picks the closest thing within reach, or null", () => {
    const p = at(5, 5);
    const things = [
      { key: "far", tx: 9, ty: 9 },
      { key: "near", tx: 5, ty: 6 },
      { key: "side", tx: 6, ty: 6 },
    ];
    expect(nearestInReach(p.x, p.y, things)?.key).toBe("near");
    expect(nearestInReach(p.x, p.y, [things[0]])).toBeNull();
  });
});

describe("token", () => {
  it("makes valid, different tokens", () => {
    const a = newToken();
    expect(isToken(a)).toBe(true);
    expect(newToken()).not.toBe(a);
  });
});

describe("join errors", () => {
  it("unknown saved world", () =>
    expect(describeJoinError(new Error("world not found"))).toBe("ไม่พบโลกนี้ ตรวจรหัสอีกครั้ง"));
  it("same player in another window", () =>
    expect(describeJoinError(new Error("already playing in another window"))).toBe("คุณเล่นโลกนี้อยู่ในอีกหน้าต่างแล้ว"));
});

describe("labels", () => {
  it("names the building items in Thai", () => {
    expect(itemLabel("wall")).toBe("กำแพงไม้");
    expect(itemLabel("door")).toBe("ประตูไม้");
    expect(itemLabel("bed")).toBe("ที่นอน");
  });
});
