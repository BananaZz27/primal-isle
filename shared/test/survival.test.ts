import { describe, it, expect } from "vitest";
import { BALANCE, freshStats, tickStats } from "../src/index";

describe("tickStats", () => {
  it("fresh stats are full", () => expect(freshStats()).toEqual({ health: 100, hunger: 100, thirst: 100 }));

  it("hunger and thirst drop over time at the balance rates", () => {
    const s = freshStats();
    tickStats(s, 60);
    expect(s.hunger).toBeCloseTo(100 - 60 * BALANCE.hungerPerSec);
    expect(s.thirst).toBeCloseTo(100 - 60 * BALANCE.thirstPerSec);
    expect(s.health).toBe(100);
  });

  it("starving hurts", () => {
    const s = { health: 50, hunger: 0, thirst: 80 };
    tickStats(s, 10);
    expect(s.health).toBeCloseTo(50 - 10 * BALANCE.starveDamagePerSec);
  });

  it("well fed heals", () => {
    const s = { health: 50, hunger: 90, thirst: 90 };
    tickStats(s, 10);
    expect(s.health).toBeCloseTo(50 + 10 * BALANCE.regenPerSec);
  });

  it("a one-hour gap stays within 0..100 and is never NaN", () => {
    const s = freshStats();
    const r = tickStats(s, 3600);
    for (const v of Object.values(s)) {
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(r.died).toBe(true);
  });

  it("reports death only when health reaches 0", () => {
    expect(tickStats({ health: 0.5, hunger: 0, thirst: 0 }, 1).died).toBe(true);
    expect(tickStats({ health: 80, hunger: 0, thirst: 0 }, 1).died).toBe(false);
  });

  it("ignores negative or NaN dt", () => {
    const s = freshStats();
    tickStats(s, -5);
    tickStats(s, Number.NaN);
    expect(s).toEqual(freshStats());
  });
});
