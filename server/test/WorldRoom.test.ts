import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import {
  findSpawn,
  generateWorld,
  MAX_PLAYERS,
  PLAYER_SPEED,
  TICK_RATE,
  DEFAULT_NAME,
  MAX_CATCHUP_STEPS,
} from "@primal/shared";

import appConfig from "../src/app.config";
import type { MoveInput } from "../src/rooms/schema/WorldState";
import type { WorldRoom } from "../src/rooms/WorldRoom";

describe("WorldRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  it("creates the world from the given seed", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    expect(room.state.seed).toBe(1234);
  });

  it("picks a random seed when none is given", async () => {
    const a = await colyseus.createRoom<WorldRoom>("world", {});
    const b = await colyseus.createRoom<WorldRoom>("world", {});
    expect(Number.isInteger(a.state.seed)).toBe(true);
    expect(a.state.seed).not.toBe(b.state.seed);
  });

  it("spawns a joining player on land with a sanitized name", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const c = await colyseus.connectTo(room, { name: "  <Rex>  " });
    const p = room.state.players.get(c.sessionId)!;
    expect(p.name).toBe("Rex");
    expect({ x: p.x, y: p.y }).toEqual(findSpawn(generateWorld(1234), 0));
  });

  it("uses the default name when none is given", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1 });
    const c = await colyseus.connectTo(room, {});
    expect(room.state.players.get(c.sessionId)!.name).toBe(DEFAULT_NAME);
  });

  it("applies a buffered input exactly one step", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const c = await colyseus.connectTo(room, { name: "a" });
    const p = room.state.players.get(c.sessionId)!;
    const startX = p.x;

    const input = c.input<MoveInput>({ mode: "reliable" });
    input.data.moveX = 1;
    input.data.moveY = 0;
    input.send();

    await room.waitForNextMessage();
    await room.waitForNextTimestep();

    expect(p.x).toBeCloseTo(startX + PLAYER_SPEED / TICK_RATE);
  });

  it("clamps a cheating input of 100 to 1", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const c = await colyseus.connectTo(room, { name: "a" });
    const p = room.state.players.get(c.sessionId)!;
    const startX = p.x;

    const input = c.input<MoveInput>({ mode: "reliable" });
    input.data.moveX = 100 as any;
    input.send();

    await room.waitForNextMessage();
    await room.waitForNextTimestep();

    expect(p.x).toBeCloseTo(startX + PLAYER_SPEED / TICK_RATE);
  });

  it("a burst of 60 inputs cannot move faster than the catch-up budget (speed hack)", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const c = await colyseus.connectTo(room, { name: "cheater" });
    const p = room.state.players.get(c.sessionId)!;
    const startX = p.x;

    const input = c.input<MoveInput>({ mode: "reliable" });
    for (let i = 0; i < 60; i++) {
      input.data.moveX = 1;
      input.data.moveY = 0;
      input.send();
    }
    await room.waitForNextMessage();
    await room.waitForNextTimestep();

    expect(p.x - startX).toBeLessThanOrEqual((MAX_CATCHUP_STEPS * PLAYER_SPEED) / TICK_RATE + 0.001);
  });

  it("buffered inputs are not lost — they are applied over the following ticks", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const c = await colyseus.connectTo(room, { name: "a" });
    const p = room.state.players.get(c.sessionId)!;
    const startX = p.x;

    const input = c.input<MoveInput>({ mode: "reliable" });
    for (let i = 0; i < 8; i++) {
      input.data.moveX = 1;
      input.data.moveY = 0;
      input.send();
    }
    await room.waitForNextMessage();
    for (let t = 0; t < 12; t++) await room.waitForNextTimestep();

    expect(p.x - startX).toBeCloseTo((8 * PLAYER_SPEED) / TICK_RATE);
  });

  it("keeps a dropped player in the world while they reconnect", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const c = await colyseus.connectTo(room, { name: "phone" });
    c.reconnection.enabled = false; // เทสต์ฝั่งเซิร์ฟเวอร์อย่างเดียว ไม่ให้ SDK ต่อกลับเอง
    (c as any).connection.close(4999, "wifi lost"); // ปิดแบบไม่ใช่การออกปกติ = หลุด
    await new Promise((r) => setTimeout(r, 300));
    expect(room.state.players.has(c.sessionId)).toBe(true);
  });

  it("two players see each other in state", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const a = await colyseus.connectTo(room, { name: "a" });
    const b = await colyseus.connectTo(room, { name: "b" });
    await room.waitForNextPatch();
    expect(room.state.players.size).toBe(2);
    expect(a.state.players.size).toBe(2);
    expect(b.state.players.get(a.sessionId)?.name).toBe("a");
  });

  it("gives players different spawn points and colours", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const a = await colyseus.connectTo(room, { name: "a" });
    const b = await colyseus.connectTo(room, { name: "b" });
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    expect(`${pa.x},${pa.y}`).not.toBe(`${pb.x},${pb.y}`);
    expect(pa.colorIndex).not.toBe(pb.colorIndex);
  });

  it(`rejects player number ${MAX_PLAYERS + 1}`, async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    for (let i = 0; i < MAX_PLAYERS; i++) await colyseus.connectTo(room, { name: `p${i}` });
    await expect(colyseus.connectTo(room, { name: "late" })).rejects.toBeTruthy();
    expect(room.state.players.size).toBe(MAX_PLAYERS);
  });

  it("removes a player who leaves", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    const a = await colyseus.connectTo(room, { name: "a" });
    await colyseus.connectTo(room, { name: "b" });
    await a.leave();
    await room.waitForNextPatch();
    expect(room.state.players.size).toBe(1);
  });
});
