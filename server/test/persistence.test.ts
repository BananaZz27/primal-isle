import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ต้องตั้งก่อนเซิร์ฟเวอร์เริ่ม: เก็บไฟล์บันทึกในโฟลเดอร์ชั่วคราวของเทสต์นี้
const DIR = mkdtempSync(join(tmpdir(), "primal-worlds-"));
process.env.DATA_DIR = DIR; // ทับค่าจาก setup.ts — ไฟล์นี้ตรวจโฟลเดอร์เอง

import { ColyseusTestServer, boot } from "@colyseus/testing";
import { generateDecor, generateWorld, isWalkable, isWorldCode, TILE_SIZE, tileAt } from "@primal/shared";
import appConfig from "../src/app.config";
import type { WorldRoom } from "../src/rooms/WorldRoom";
import { JsonFileStore } from "../src/persistence/worldStore";

const TOKEN_A = "tokenAAAAAAAAAAAAAAA";
const TOKEN_B = "tokenBBBBBBBBBBBBBBB";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("JsonFileStore", () => {
  const store = new JsonFileStore(mkdtempSync(join(tmpdir(), "primal-store-")));

  it("round-trips a save", async () => {
    await store.save("ABCDEF", { version: 1, code: "ABCDEF", seed: 7, savedAt: 1, nodes: [], structures: [], drops: [], players: {} });
    expect((await store.load("ABCDEF"))?.seed).toBe(7);
  });

  it("refuses bad codes and never writes outside its folder", async () => {
    await expect(store.save("../../evil", {} as any)).rejects.toThrow();
    expect(await store.load("../../evil")).toBeNull();
    expect(await store.load("NOPE")).toBeNull();
  });

  it("a corrupt file loads as null and is kept for inspection", async () => {
    const dir = mkdtempSync(join(tmpdir(), "primal-bad-"));
    writeFileSync(join(dir, "QWERTY.json"), "{not json");
    const s = new JsonFileStore(dir);
    expect(await s.load("QWERTY")).toBeNull();
    expect(existsSync(join(dir, "QWERTY.json"))).toBe(true);
  });
});

describe("saved worlds", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  it("a new world gets a permanent 6-letter code as its room id", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1234 });
    expect(isWorldCode(room.roomId)).toBe(true);
  });

  it("everything comes back after the room closes and is reopened by code", async () => {
    const seed = 1234;
    const map = generateWorld(seed);
    const occupied = new Set(generateDecor(map).map((d) => `${d.tx},${d.ty}`));
    let t = { tx: 0, ty: 0 };
    outer: for (let ty = 3; ty < 120; ty++)
      for (let tx = 3; tx < 120; tx++)
        if ([0, -1].every((dx) => isWalkable(tileAt(map, tx + dx, ty)) && !occupied.has(`${tx + dx},${ty}`))) {
          t = { tx, ty };
          break outer;
        }

    const room = await colyseus.createRoom<WorldRoom>("world", { seed });
    const code = room.roomId;
    const c = await colyseus.connectTo(room, { name: "a", token: TOKEN_A });
    const p = room.state.players.get(c.sessionId)!;
    p.inventory.set("wall", 2);
    p.inventory.set("wood", 9);
    Object.assign(p, { x: (t.tx - 1) * TILE_SIZE + 8, y: t.ty * TILE_SIZE + 8, hunger: 42 });
    c.send("place", { item: "wall", tx: t.tx, ty: t.ty });
    await room.waitForNextMessage();
    await c.leave();
    await sleep(400); // ห้องปิด → บันทึก
    expect(readdirSync(DIR)).toContain(`${code}.json`);

    const again = await colyseus.createRoom<WorldRoom>("world", { code });
    expect(again.roomId).toBe(code);
    expect(again.state.seed).toBe(seed);
    expect([...again.state.structures.values()].map((s) => [s.kind, s.tx, s.ty])).toEqual([["wall", t.tx, t.ty]]);

    const c2 = await colyseus.connectTo(again, { name: "a", token: TOKEN_A });
    const p2 = again.state.players.get(c2.sessionId)!;
    expect(p2.inventory.get("wall")).toBe(1);
    expect(p2.inventory.get("wood")).toBe(9);
    expect(p2.x).toBe((t.tx - 1) * TILE_SIZE + 8);
    expect(p2.hunger).toBeLessThan(43);
    expect(p2.hunger).toBeGreaterThan(41);

    const stranger = await colyseus.connectTo(again, { name: "b", token: TOKEN_B });
    expect(again.state.players.get(stranger.sessionId)!.inventory.size).toBe(0);
  });

  it("the same token cannot be online twice", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1 });
    await colyseus.connectTo(room, { name: "a", token: TOKEN_A });
    await expect(colyseus.connectTo(room, { name: "a2", token: TOKEN_A })).rejects.toBeTruthy();
    expect(room.state.players.size).toBe(1);
  });

  it("opening an unknown or malformed code fails", async () => {
    await expect(colyseus.createRoom("world", { code: "ZZZZZZ" })).rejects.toBeTruthy();
    await expect(colyseus.createRoom("world", { code: "../../x" })).rejects.toBeTruthy();
  });
});
