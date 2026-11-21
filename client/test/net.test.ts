import { describe, it, expect } from "vitest";
import { resolveServerUrl } from "../src/net/serverUrl";
import { buildInviteLink, readInviteCode } from "../src/net/invite";
import { describeJoinError } from "../src/net/errors";

describe("resolveServerUrl", () => {
  it("uses the page's host on port 2567 over ws for http pages", () =>
    expect(resolveServerUrl(undefined, { protocol: "http:", hostname: "192.168.1.5" })).toBe(
      "ws://192.168.1.5:2567",
    ));

  it("uses wss for https pages", () =>
    expect(resolveServerUrl(undefined, { protocol: "https:", hostname: "x.io" })).toBe("wss://x.io:2567"));

  it("prefers VITE_SERVER_URL when set", () =>
    expect(resolveServerUrl("wss://game.example", { protocol: "http:", hostname: "a" })).toBe(
      "wss://game.example",
    ));

  it("ignores an empty VITE_SERVER_URL", () =>
    expect(resolveServerUrl("  ", { protocol: "http:", hostname: "a" })).toBe("ws://a:2567"));
});

describe("invite links", () => {
  it("round-trips the world code and replaces an old one", () =>
    expect(readInviteCode(buildInviteLink("http://h:5173/?w=old&x=1", "AbC123xyz"))).toBe("AbC123xyz"));

  it("keeps other query parameters", () =>
    expect(new URL(buildInviteLink("http://h:5173/game/?x=1", "abc")).searchParams.get("x")).toBe("1"));

  it("returns null when there is no code", () => expect(readInviteCode("http://h:5173/")).toBeNull());

  it("returns null when the code is blank", () => expect(readInviteCode("http://h:5173/?w=%20%20")).toBeNull());

  it("trims spaces around the code", () => expect(readInviteCode("http://h/?w=%20abc%20")).toBe("abc"));
});

describe("describeJoinError", () => {
  it("explains an unknown or full world in Thai", () =>
    expect(describeJoinError({ code: 522 })).toBe("ไม่พบโลกนี้ หรือโลกเต็มแล้ว (สูงสุด 8 คน)"));

  it("falls back to a generic connection message", () => {
    expect(describeJoinError(new Error("boom"))).toBe("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
    expect(describeJoinError(undefined)).toBe("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
  });
});
