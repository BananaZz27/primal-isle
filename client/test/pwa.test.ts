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
