import { describe, it, expect } from "vitest";
import { BALANCE } from "@primal/shared";
import { dayChip, dayPhase, glowAlpha, nightAlpha } from "../src/render/dayNight";
import { NIGHT_MAX_ALPHA } from "../src/config";

const nightAt = BALANCE.dayLengthSec * BALANCE.nightFrom;

describe("night overlay", () => {
  it("is clear by day and at most 0.55 at night (still playable)", () => {
    expect(NIGHT_MAX_ALPHA).toBe(0.55);
    expect(nightAlpha(BALANCE.dayStartSec)).toBe(0);
    expect(nightAlpha(nightAt + BALANCE.duskSec + 10)).toBeCloseTo(0.55);
  });

  it("fades in over dusk", () => {
    const mid = nightAlpha(nightAt + BALANCE.duskSec / 2);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.35);
  });

  it("campfire glow follows the darkness (invisible by day)", () => {
    expect(glowAlpha(BALANCE.dayStartSec)).toBe(0);
    expect(glowAlpha(nightAt + 100)).toBeGreaterThan(0.5);
  });
});

describe("day/night chip", () => {
  it("day → dusk warning in the last minute → night → day again at dawn", () => {
    expect(dayPhase(BALANCE.dayStartSec)).toBe("day");
    expect(dayPhase(nightAt - 30)).toBe("dusk");
    expect(dayPhase(nightAt + 5)).toBe("dusk");
    expect(dayPhase(nightAt + 100)).toBe("night");
    expect(dayPhase(BALANCE.dayLengthSec - 3)).toBe("day");
  });

  it("shows sun/moon in Thai", () => {
    expect(dayChip("day")).toBe("☀️ กลางวัน");
    expect(dayChip("dusk")).toBe("🌅 ใกล้ค่ำ");
    expect(dayChip("night")).toBe("🌙 กลางคืน");
  });
});
