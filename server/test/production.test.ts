import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// เซิร์ฟเวอร์จริง (NODE_ENV=production) ต้องไม่เปิดเครื่องมือดีบัก — ใครก็เข้าดู/ปิดห้องได้
process.env.NODE_ENV = "production";
const { default: appConfig } = await import("../src/app.config");

describe("production server", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  beforeAll(async () => {
    colyseus = await boot(appConfig, 2581);
  });
  afterAll(async () => {
    await colyseus.shutdown();
    process.env.NODE_ENV = "test";
  });

  it("answers the health check", async () => {
    const res = await colyseus.http.get("/health");
    expect(res.data).toEqual({ ok: true });
  });

  it("does not expose /monitor or the playground", async () => {
    await expect(colyseus.http.get("/monitor")).rejects.toMatchObject({ statusCode: 404 });
    // "/" ของ Colyseus ตอบแค่เลขเวอร์ชัน (ไม่ใช่หน้า playground ที่สร้างห้อง/ส่งข้อความได้)
    const root = await colyseus.http.get("/");
    expect(String(root.data)).not.toMatch(/<html/i);
  });
});
