import { describe, it, expect } from "vitest";
import { stepPlayer, PLAYER_SPEED, PLAYER_HALF, TICK_RATE, TILE_SIZE } from "../src/index";
import { makeMap } from "./helpers";

const DT = 1 / TICK_RATE;
const STEP = PLAYER_SPEED / TICK_RATE;
const open = makeMap(Array(10).fill(".........."));

describe("stepPlayer", () => {
  it("moves right at PLAYER_SPEED", () => {
    const e = { x: 80, y: 80, vx: 0, vy: 0 };
    stepPlayer(e, { moveX: 1, moveY: 0 }, DT, open);
    expect(e.x).toBeCloseTo(80 + STEP);
    expect(e.y).toBe(80);
    expect(e.vx).toBe(PLAYER_SPEED);
  });

  it("diagonal is not faster than a straight line", () => {
    const e = { x: 80, y: 80, vx: 0, vy: 0 };
    stepPlayer(e, { moveX: 1, moveY: 1 }, DT, open);
    expect(Math.hypot(e.x - 80, e.y - 80)).toBeCloseTo(STEP);
  });

  it("clamps input outside -1..1", () => {
    const e = { x: 80, y: 80, vx: 0, vy: 0 };
    stepPlayer(e, { moveX: 100, moveY: 0 }, DT, open);
    expect(e.x).toBeCloseTo(80 + STEP);
  });

  it("is blocked by water and stops vx", () => {
    const m = makeMap(["..~", "..~", "..~"]);
    const startX = 2 * TILE_SIZE - PLAYER_HALF - 0.5;
    const e = { x: startX, y: 24, vx: 0, vy: 0 };
    stepPlayer(e, { moveX: 1, moveY: 0 }, DT, m);
    expect(e.x).toBe(startX);
    expect(e.vx).toBe(0);
  });

  it("slides along a wall when moving diagonally", () => {
    const m = makeMap(["..~", "..~", "..~"]);
    const startX = 2 * TILE_SIZE - PLAYER_HALF - 0.5;
    const e = { x: startX, y: 20, vx: 0, vy: 0 };
    stepPlayer(e, { moveX: 1, moveY: 1 }, DT, m);
    expect(e.x).toBe(startX);
    expect(e.y).toBeGreaterThan(20);
    expect(e.vy).toBeGreaterThan(0);
  });

  it("cannot walk off the map edge", () => {
    const e = { x: PLAYER_HALF + 0.5, y: 80, vx: 0, vy: 0 };
    stepPlayer(e, { moveX: -1, moveY: 0 }, DT, open);
    expect(e.x).toBe(PLAYER_HALF + 0.5);
  });

  it("no input → no movement, velocity zero", () => {
    const e = { x: 80, y: 80, vx: 50, vy: -50 };
    stepPlayer(e, { moveX: 0, moveY: 0 }, DT, open);
    expect(e).toEqual({ x: 80, y: 80, vx: 0, vy: 0 });
  });
});
