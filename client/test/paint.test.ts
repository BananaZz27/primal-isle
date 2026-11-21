import { describe, it, expect } from "vitest";
import { parsePixelArt } from "../src/art/pixels";

describe("parsePixelArt", () => {
  it("turns a grid into colours with '.' as transparent", () => {
    const art = parsePixelArt(["ab", ".a"], { a: "#ff0000", b: "#00ff00" });
    expect(art.width).toBe(2);
    expect(art.height).toBe(2);
    expect(art.pixels).toEqual(["#ff0000", "#00ff00", null, "#ff0000"]);
  });

  it("throws on an unknown character, naming it", () => {
    expect(() => parsePixelArt(["aZ"], { a: "#fff" })).toThrow(/"Z"/);
  });

  it("throws when rows have different widths", () => {
    expect(() => parsePixelArt(["aa", "a"], { a: "#fff" })).toThrow(/width/);
  });
});
