import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { ErrorCode } from "@colyseus/sdk";
import { MAX_PLAYERS } from "@primal/shared";
import appConfig from "../src/app.config";
import type { MoveInput } from "../src/rooms/schema/WorldState";

/**
 * ทดสอบแบบปลายทาง: ใช้ SDK ตัวจริงแบบเดียวกับหน้าเว็บ
 * คนแรกสร้างโลก คนที่สองเข้าด้วยรหัส แล้วเห็นอีกคนเดิน
 */
describe("two real clients", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  const waitFor = async (cond: () => boolean, ms = 3000) => {
    const end = Date.now() + ms;
    while (!cond()) {
      if (Date.now() > end) throw new Error("timed out");
      await new Promise((r) => setTimeout(r, 20));
    }
  };

  it("friend joins by code and sees the host walk", async () => {
    const host = await colyseus.sdk.create("world", { name: "host" });
    const friend = await colyseus.sdk.joinById(host.roomId, { name: "friend" });

    await waitFor(() => friend.state.players?.get(host.sessionId) !== undefined);
    const seen = friend.state.players.get(host.sessionId)!;
    const startX = seen.x;
    expect(friend.state.seed).toBe(host.state.seed);

    const input = host.input<MoveInput>({ mode: "reliable" });
    for (let i = 0; i < 10; i++) {
      input.data.moveX = 1;
      input.data.moveY = 0;
      input.send();
    }

    await waitFor(() => friend.state.players.get(host.sessionId)!.x > startX);
    expect(friend.state.players.get(host.sessionId)!.name).toBe("host");
  });

  it("a wrong code fails with MATCHMAKE_INVALID_ROOM_ID", async () => {
    await expect(colyseus.sdk.joinById("doesnotexist", { name: "x" })).rejects.toMatchObject({
      code: ErrorCode.MATCHMAKE_INVALID_ROOM_ID,
    });
  });

  it("a full world fails with MATCHMAKE_INVALID_ROOM_ID", async () => {
    const host = await colyseus.sdk.create("world", { name: "host" });
    for (let i = 1; i < MAX_PLAYERS; i++) await colyseus.sdk.joinById(host.roomId, { name: `p${i}` });
    await expect(colyseus.sdk.joinById(host.roomId, { name: "late" })).rejects.toMatchObject({
      code: ErrorCode.MATCHMAKE_INVALID_ROOM_ID,
    });
  });
});
