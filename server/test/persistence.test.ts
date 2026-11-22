import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
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

describe("JsonFileStore under concurrent saves", () => {
  const save = (code: string, seed: number, pad = 0) => ({
    version: 1 as const, code, seed, savedAt: 1, nodes: [], structures: [], drops: [],
    players: Object.fromEntries(Array.from({ length: pad }, (_, i) => [`tok${String(i).padStart(17, "0")}`, { x: 1, y: 1, health: 1, hunger: 1, thirst: 1, colorIndex: 0, inventory: {} }])),
  });

  // review: บันทึกตามรอบ 30 วิ ชนกับบันทึกตอนปิดห้อง → ไฟล์ .tmp เดียวกันถูกเขียนสองทาง
  it("two overlapping saves of one world both succeed and the last one wins", async () => {
    const store = new JsonFileStore(mkdtempSync(join(tmpdir(), "primal-race-")));
    await Promise.all([store.save("RACEAA", save("RACEAA", 1, 3000)), store.save("RACEAA", save("RACEAA", 2))]);
    expect((await store.load("RACEAA"))?.seed).toBe(2);
  });

  // review: เปิดโลกระหว่างที่ห้องเก่ากำลังบันทึกครั้งสุดท้าย → ต้องได้ข้อมูลล่าสุด
  it("loading waits for a save that is still being written", async () => {
    const store = new JsonFileStore(mkdtempSync(join(tmpdir(), "primal-wait-")));
    await store.save("WTAAAA", save("WTAAAA", 1));
    const pending = store.save("WTAAAA", save("WTAAAA", 2, 3000));
    expect((await store.load("WTAAAA"))?.seed).toBe(2);
    await pending;
  });

  it("a parseable file with a broken shape loads as null", async () => {
    const dir = mkdtempSync(join(tmpdir(), "primal-shape-"));
    writeFileSync(join(dir, "SHAPEA.json"), JSON.stringify({ version: 1, code: "SHAPEA", seed: 1, nodes: null, players: {} }));
    expect(await new JsonFileStore(dir).load("SHAPEA")).toBeNull();
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

  // review: กด F5 แล้วต้องกลับเข้าตัวเดิมได้ทันที ไม่ใช่โดนบอกว่า "เล่นอยู่อีกหน้าต่าง" 20 วิ
  it("reloading the page takes over your own character straight away", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: 1 });
    const c = await colyseus.connectTo(room, { name: "a", token: TOKEN_A });
    const p = room.state.players.get(c.sessionId)!;
    p.inventory.set("wood", 5);
    c.reconnection.enabled = false;
    (c as any).connection.close(4999, "page reload"); // ปิดแท็บ/รีโหลด = หลุดแบบไม่ได้ตั้งใจออก
    await sleep(200);
    const again = await colyseus.connectTo(room, { name: "a", token: TOKEN_A });
    expect(room.state.players.size).toBe(1);
    expect(room.state.players.get(again.sessionId)?.inventory.get("wood")).toBe(5);
    await sleep(200);
    expect(room.state.players.get(again.sessionId)?.inventory.get("wood")).toBe(5); // ตัวเก่าหมดเวลาแล้วต้องไม่ลบตัวใหม่
  });

  // review: เปิดโลกไม่สำเร็จต้องไม่บันทึกทับไฟล์เดิม
  it("a save file that fails to open is left untouched", async () => {
    const bad = JSON.stringify({ version: 1, code: "BRKNXY", seed: 5, savedAt: 1, nodes: null, structures: [], players: { [TOKEN_A]: {} } });
    writeFileSync(join(DIR, "BRKNXY.json"), bad);
    await expect(colyseus.createRoom("world", { code: "BRKNXY" })).rejects.toBeTruthy();
    await sleep(300);
    expect(readFileSync(join(DIR, "BRKNXY.json"), "utf8")).toBe(bad);
  });

  it("opening an unknown or malformed code fails", async () => {
    await expect(colyseus.createRoom("world", { code: "ZZZZZZ" })).rejects.toBeTruthy();
    await expect(colyseus.createRoom("world", { code: "../../x" })).rejects.toBeTruthy();
  });
});
