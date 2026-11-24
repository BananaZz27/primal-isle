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
