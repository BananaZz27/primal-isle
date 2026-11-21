import { describe, it, expect } from "vitest";
import { MAX_CATCHUP_STEPS } from "@primal/shared";
import { quantizeStick } from "../src/input/joystick";
import { combineInputs } from "../src/input/combine";
import { clampSteps, connectionLostText } from "../src/net/frameSteps";

describe("quantizeStick", () => {
  it("is idle inside the deadzone", () => expect(quantizeStick(2, 0, 50)).toEqual({ moveX: 0, moveY: 0 }));
  it("right", () => expect(quantizeStick(40, 0, 50)).toEqual({ moveX: 1, moveY: 0 }));
  it("up-left diagonal (screen y grows downwards)", () =>
    expect(quantizeStick(-30, -30, 50)).toEqual({ moveX: -1, moveY: -1 }));
  it("~14° off right is still right", () => expect(quantizeStick(40, -10, 50)).toEqual({ moveX: 1, moveY: 0 }));
  it("straight down", () => expect(quantizeStick(0, 45, 50)).toEqual({ moveX: 0, moveY: 1 }));
  it("down-right diagonal", () => expect(quantizeStick(30, 30, 50)).toEqual({ moveX: 1, moveY: 1 }));
  it("works beyond the radius", () => expect(quantizeStick(-500, 0, 50)).toEqual({ moveX: -1, moveY: 0 }));
});

describe("combineInputs", () => {
  it("prefers the first source per axis, falls back to the second", () =>
    expect(combineInputs({ moveX: 1, moveY: 0 }, { moveX: -1, moveY: 1 })).toEqual({ moveX: 1, moveY: 1 }));
  it("both idle → idle", () =>
    expect(combineInputs({ moveX: 0, moveY: 0 }, { moveX: 0, moveY: 0 })).toEqual({ moveX: 0, moveY: 0 }));
});

describe("clampSteps", () => {
  it("never negative", () => expect(clampSteps(-3)).toBe(0));
  it("passes normal values", () => expect(clampSteps(2)).toBe(2));
  it("caps a backgrounded-tab burst", () => expect(clampSteps(600)).toBe(MAX_CATCHUP_STEPS));
  it("treats NaN as zero", () => expect(clampSteps(Number.NaN)).toBe(0));
});

it("connectionLostText is Thai", () => expect(connectionLostText()).toBe("หลุดการเชื่อมต่อกับโลก"));
