import { describe, it, expect } from "vitest";
import { sanitizeName, NAME_MAX, DEFAULT_NAME } from "../src/index";

describe("sanitizeName", () => {
  it("trims spaces", () => expect(sanitizeName("  โบ๊ท  ")).toBe("โบ๊ท"));

  it("falls back when empty or not a string", () => {
    expect(sanitizeName("")).toBe(DEFAULT_NAME);
    expect(sanitizeName("    ")).toBe(DEFAULT_NAME);
    expect(sanitizeName(undefined)).toBe(DEFAULT_NAME);
    expect(sanitizeName(42)).toBe(DEFAULT_NAME);
  });

  it("cuts to NAME_MAX code points", () => {
    expect(Array.from(sanitizeName("ก".repeat(40))).length).toBe(NAME_MAX);
  });

  it("removes angle brackets and control chars", () => {
    expect(sanitizeName("<b>Rex</b>\n")).toBe("bRex/b");
  });

  it("keeps emoji intact", () => expect(sanitizeName("🦖Dino")).toBe("🦖Dino"));
});
