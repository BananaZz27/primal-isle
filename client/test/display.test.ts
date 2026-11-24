import { describe, it, expect } from "vitest";
import { cameraZoom, HD_SCALE, screenPx, texelPixels } from "../src/display";

describe("display scaling for crisp pixels at any screen density", () => {
  it("each HD texel covers a whole number of real screen pixels", () => {
    for (const dpr of [1, 1.25, 1.5, 2, 2.625, 3]) {
      const t = texelPixels(dpr);
      expect(Number.isInteger(t), `dpr ${dpr}`).toBe(true);
      expect(t).toBeGreaterThanOrEqual(1);
      // ภาพเก่า 16px (1 texel = 1 หน่วยโลก) ก็ต้องเป็นจำนวนเต็มเช่นกัน
      expect(Number.isInteger(cameraZoom(dpr))).toBe(true);
      expect(cameraZoom(dpr)).toBe(t / HD_SCALE);
    }
  });

  it("one tile stays about 48 CSS px wide (same as before) on common screens", () => {
    for (const dpr of [1.25, 2, 2.625, 3]) {
      const cssPerTile = (cameraZoom(dpr) * 16) / dpr;
      expect(cssPerTile, `dpr ${dpr}`).toBeGreaterThanOrEqual(40);
      expect(cssPerTile, `dpr ${dpr}`).toBeLessThanOrEqual(56);
    }
    expect(cameraZoom(2)).toBe(6); // แท็บเล็ต/มือถือทั่วไป: เท่าเดิมเป๊ะ (3 CSS px ต่อหน่วยโลก)
  });

  it("HD art is drawn at half scale: 32 texels = one 16-unit tile", () => expect(32 * HD_SCALE).toBe(16));

  it("converts canvas pixels to CSS pixels for HTML overlays", () => {
    expect(screenPx(300, 2)).toBe(150);
    expect(screenPx(300, 1)).toBe(300);
  });
});

describe("canvas sizing and screen density on phones", async () => {
  const { canvasSize, effectiveDpr } = await import("../src/display");

  it("canvas = whole device pixels of the window; CSS zoom undoes the density", () => {
    expect(canvasSize(915, 412, 2.625)).toEqual({ width: 2402, height: 1082, zoom: 1 / 2.625 });
    expect(canvasSize(800, 500, 1)).toEqual({ width: 800, height: 500, zoom: 1 });
  });

  it("touch devices render at most at density 2 (fewer pixels to fill per frame); mice keep up to 3", () => {
    expect(effectiveDpr(3, true)).toBe(2);
    expect(effectiveDpr(2.625, true)).toBe(2);
    expect(effectiveDpr(3, false)).toBe(3);
    expect(effectiveDpr(0.5, false)).toBe(1);
  });

  it("at density 1 a tile is 64 CSS px (closest whole-pixel size to 48) — documented trade-off", () =>
    expect((cameraZoom(1) * 16) / 1).toBe(64));
});
