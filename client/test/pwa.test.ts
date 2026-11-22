import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PWA_MANIFEST } from "../src/pwa/manifest";

/** ขนาดภาพ PNG จาก header (กว้าง/สูงอยู่ที่ byte 16–23) */
function pngSize(path: string): [number, number] {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe("PWA manifest", () => {
  it("opens full-screen and landscape, from the folder it was installed from", () => {
    expect(PWA_MANIFEST.name).toContain("เกาะดึกดำบรรพ์");
    expect(PWA_MANIFEST.short_name.length).toBeLessThanOrEqual(12);
    expect(PWA_MANIFEST.display).toBe("fullscreen");
    expect(PWA_MANIFEST.orientation).toBe("landscape");
    expect(PWA_MANIFEST.start_url).toBe("./");
    expect(PWA_MANIFEST.lang).toBe("th");
  });

  it("every icon file exists with the size it claims", () => {
    const sizes = PWA_MANIFEST.icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(PWA_MANIFEST.icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of PWA_MANIFEST.icons) {
      const [w, h] = pngSize(join(__dirname, "..", "public", icon.src));
      expect(`${w}x${h}`).toBe(icon.sizes);
    }
  });
});

// review: ภาพเกมใน public/assets ไม่มี hash ในชื่อไฟล์ — ถ้า service worker ไม่เก็บ revision ไว้
// มือถือที่ติดตั้งแอปแล้วจะไม่มีวันได้ภาพใหม่ (เช่น แก้ tileset.png)
describe("service worker precache", () => {
  it("tracks a revision for game art whose file names have no hash", async () => {
    const { build } = await import("vite");
    const { mkdtempSync, readFileSync: read } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const outDir = mkdtempSync(join(tmpdir(), "primal-pwa-"));
    await build({ configFile: join(__dirname, "..", "vite.config.ts"), root: join(__dirname, ".."), mode: "production", logLevel: "silent", build: { outDir, emptyOutDir: true } });
    const sw = read(join(outDir, "sw.js"), "utf8");
    // sw.js อาจย่อ (url:"…") หรือไม่ย่อ ("url": "…") แล้วแต่โหมด — รับทั้งสองแบบ
    const art = [...sw.matchAll(/"?url"?:\s*"(assets\/ninja-adventure\/[^"]+)",\s*"?revision"?:\s*(null|"[^"]+")/g)];
    expect(art.length).toBeGreaterThan(5);
    for (const [, url, rev] of art) expect(rev, url).not.toBe("null");
  }, 60_000);
});
