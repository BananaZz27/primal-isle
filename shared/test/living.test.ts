import { describe, it, expect } from "vitest";
import {
  BALANCE,
  CONSUMABLES,
  crateSpawnOk,
  darkness,
  hurt,
  isConsumable,
  isNight,
  ITEM_IDS,
  moveAmount,
  newBrain,
  recipeCost,
  rollLoot,
  STRUCTURE_DEFS,
  think,
  TILE_SIZE,
  type DinoView,
  type ItemId,
} from "../src/index";
import { mulberry32 } from "../src/world/rng";
import { makeMap } from "./helpers";

const DAY = BALANCE.dayLengthSec;
const NIGHT_AT = DAY * BALANCE.nightFrom;

describe("day and night", () => {
  it("is light by day, dark at night, with a smooth dusk and dawn", () => {
    expect(darkness(60)).toBe(0);
    expect(darkness(NIGHT_AT + BALANCE.duskSec + 10)).toBe(1);
    const dusk = darkness(NIGHT_AT + BALANCE.duskSec / 2);
    expect(dusk).toBeGreaterThan(0.3);
    expect(dusk).toBeLessThan(0.7);
    const dawn = darkness(DAY - BALANCE.duskSec / 2);
    expect(dawn).toBeGreaterThan(0.3);
    expect(dawn).toBeLessThan(0.7);
    expect(isNight(NIGHT_AT + 60)).toBe(true);
    expect(isNight(30)).toBe(false);
    expect(darkness(DAY + 60)).toBe(darkness(60)); // วนรอบ
  });

  it("raptors chase from further away at night", () => {
    const view = (aggroMul: number): DinoView => ({ players: [{ id: "p", x: 630, y: 500 }], dinos: [], owner: null, ownerFoe: null, aggroMul });
    expect(think(newBrain("raptor", 500, 500), view(1), 0, () => 0.5).bite).toBeNull();
    const day = think(newBrain("raptor", 500, 500), view(1), 0, () => 0.5);
    const night = think(newBrain("raptor", 500, 500), view(BALANCE.nightAggroMul), 0, () => 0.5);
    expect(day.speed).toBeLessThanOrEqual(50); // เดินเล่น (130px เกิน 96)
    expect(night.speed).toBe(90); // ไล่ (130px ไม่เกิน 144)
  });

  it("a raptor that can't get home gives up after 8s and settles where it is", () => {
    const b = newBrain("raptor", 500, 500);
    b.x = 700; // ไกลบ้านเกินสายจูง
    hurt(b, { type: "player", id: "p" }, 0);
    const v: DinoView = { players: [{ id: "p", x: 720, y: 500 }], dinos: [], owner: null, ownerFoe: null };
    think(b, v, 0, () => 0.5); // → กลับบ้าน
    expect(b.mode).toBe("home");
    think(b, v, BALANCE.homeTimeoutMs + 1, () => 0.5);
    expect(b.mode).not.toBe("home");
    expect(b.homeX).toBe(700);
  });
});

describe("modern-world items", () => {
  it("canned food, bottled water and bandages are consumables", () => {
    expect(ITEM_IDS).toEqual(expect.arrayContaining(["canned", "bottle", "bandage", "chest"]));
    expect(CONSUMABLES.canned).toEqual({ hunger: 40 });
    expect(CONSUMABLES.bottle).toEqual({ thirst: 50 });
    expect(CONSUMABLES.bandage).toEqual({ health: 35 });
    expect(CONSUMABLES.steak).toEqual({ hunger: 45 });
    expect(isConsumable("bottle")).toBe(true);
    expect(isConsumable("wood")).toBe(false);
    expect(isConsumable("constructor")).toBe(false);
  });

  it("a chest costs 6 wood + 2 stone and blocks walking", () => {
    expect(recipeCost("chest")).toEqual({ wood: 6, stone: 2 });
    expect(STRUCTURE_DEFS.chest.solid).toBe(true);
  });

  it("a crate holds 2–3 different things in sane amounts, every time", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const loot = rollLoot(rand);
      const kinds = Object.keys(loot) as ItemId[];
      expect(kinds.length).toBeGreaterThanOrEqual(2);
      expect(kinds.length).toBeLessThanOrEqual(3);
      for (const k of kinds) {
        expect(ITEM_IDS).toContain(k);
        expect(Number.isInteger(loot[k])).toBe(true);
        expect(loot[k]!).toBeGreaterThan(0);
        expect(loot[k]!).toBeLessThanOrEqual(10);
      }
    }
  });

  it("crates land on open grass away from players", () => {
    const map = makeMap(["~~~~~~~~", "~ss....~", "~......~", "~......~", "~......~", "~......~", "~......~", "~~~~~~~~"]);
    const none = () => false;
    expect(crateSpawnOk(map, none, 4, 4, [])).toBe(true);
    expect(crateSpawnOk(map, none, 0, 4, [])).toBe(false);
    expect(crateSpawnOk(map, (x, y) => x === 4 && y === 4, 4, 4, [])).toBe(false);
    expect(crateSpawnOk(map, none, 4, 4, [{ x: 2 * TILE_SIZE, y: 4 * TILE_SIZE }])).toBe(false);
  });
});

describe("moveAmount (bag ↔ chest)", () => {
  it("moves what fits, never more than you have or than 99", () => {
    expect(moveAmount("wood", 5, 3, 0, 0, 12)).toBe(3);
    expect(moveAmount("wood", 50, 80, 60, 1, 12)).toBe(39);
    expect(moveAmount("wood", 5, 5, 99, 1, 12)).toBe(0);
  });

  it("refuses junk", () => {
    expect(moveAmount("toString", 1, 5, 0, 0, 12)).toBe(0);
    expect(moveAmount("wood", -2, 5, 0, 0, 12)).toBe(0);
    expect(moveAmount("wood", 1.5, 5, 0, 0, 12)).toBe(0);
    expect(moveAmount("wood", "3", 5, 0, 0, 12)).toBe(0);
  });

  it("a full chest (12 kinds) takes more of what it has but no new kind", () => {
    expect(moveAmount("stone", 1, 5, 0, 12, 12)).toBe(0);
    expect(moveAmount("stone", 1, 5, 4, 12, 12)).toBe(1);
  });
});
