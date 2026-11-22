import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { join } from "node:path";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import {
  BALANCE,
  DINO_KINDS,
  dinoDef,
  findSpawn,
  generateDecor,
  generateWorld,
  isWalkable,
  TILE_SIZE,
  tileAt,
  type DinoKind,
} from "@primal/shared";
import appConfig from "../src/app.config";
import type { WorldRoom } from "../src/rooms/WorldRoom";
import type { DinoSystem } from "../src/rooms/dinoSystem";

const SEED = 1234;
const map = generateWorld(SEED);
const occupied = new Set(generateDecor(map).map((d) => `${d.tx},${d.ty}`));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ช่องว่าง 5×5 (ให้ไดโนตัวใหญ่ยืนได้) */
function openArea(skip = 0) {
  let n = 0;
  for (let ty = 4; ty < map.size - 4; ty++)
    for (let tx = 4; tx < map.size - 4; tx++) {
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++)
        for (let dx = -2; dx <= 2 && ok; dx++)
          if (!isWalkable(tileAt(map, tx + dx, ty + dy)) || occupied.has(`${tx + dx},${ty + dy}`)) ok = false;
      if (ok && n++ === skip) return { x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8 };
    }
  throw new Error("no open area");
}

describe("dinosaurs", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  async function setup(items: Record<string, number> = {}, token = "dinoTOKENdinoTOKEN01") {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: SEED });
    const c = await colyseus.connectTo(room, { name: "hunter", token });
    const p = room.state.players.get(c.sessionId)!;
    for (const [k, v] of Object.entries(items)) p.inventory.set(k, v);
    const dinos = (room as any).dinos as DinoSystem;
    const send = async (type: string, msg: unknown) => {
      c.send(type as any, msg);
      await room.waitForNextMessage();
    };
    /** วางไดโนนิ่งๆ ข้างผู้เล่น (ห่าง dx px) */
    const place = (kind: DinoKind, dx = 20) => {
      const at = openArea();
      Object.assign(p, at);
      const id = dinos.spawnAt(kind, at.x + dx, at.y, room.clock.currentTime);
      dinos.freeze(id); // ไม่ให้เดินหนีระหว่างเทสต์
      return id;
    };
    return { room, c, p, dinos, send, place };
  }

  /** ป้อนตามคูลดาวน์ */
  async function feed(send: (t: string, m: unknown) => Promise<void>, id: string, times: number) {
    for (let i = 0; i < times; i++) {
      await send("feed", { id });
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
  }

  /** ตีตามคูลดาวน์ */
  async function hit(send: (t: string, m: unknown) => Promise<void>, id: string, times: number) {
    for (let i = 0; i < times; i++) {
      await send("attack", { id });
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
  }

  it("a new world fills each kind up to its cap, away from player spawn points", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: SEED });
    const dinos = (room as any).dinos as DinoSystem;
    dinos.populate(room.clock.currentTime);
    const all = [...room.state.dinos.values()];
    for (const kind of DINO_KINDS) expect(all.filter((d) => d.kind === kind).length).toBe(dinoDef(kind).cap);
    const spawns = Array.from({ length: 8 }, (_, i) => findSpawn(map, i));
    for (const d of all)
      for (const s of spawns) expect(Math.hypot(d.x - s.x, d.y - s.y)).toBeGreaterThanOrEqual(BALANCE.dinoSpawnAwayFromSpawnTiles * TILE_SIZE - TILE_SIZE);
  });

  it("hunting: hits need reach and cooldown; a kill gives meat and removes the dino", async () => {
    const { room, p, send, place } = await setup();
    const id = place("compy");
    await send("attack", { id: "nope" });
    await send("attack", { id: 42 });

    const d = room.state.dinos.get(id)!;
    await send("attack", { id });
    await send("attack", { id }); // ถี่เกิน → ไม่นับ
    expect(d.hp).toBe(dinoDef("compy").hp - BALANCE.damage.fist);

    p.x -= 60; // ไกลเกิน
    await sleep(BALANCE.gatherCooldownMs + 20);
    await send("attack", { id });
    expect(d.hp).toBe(dinoDef("compy").hp - BALANCE.damage.fist);
    p.x += 60;

    await hit(send, id, 4); // มือเปล่า 4 × 5 = 20
    expect(room.state.dinos.has(id)).toBe(false);
    expect(p.inventory.get("meat")).toBe(dinoDef("compy").meat);
  });

  it("meat never goes over 99", async () => {
    const { p, send, place } = await setup({ spear: 1, meat: 99 });
    const id = place("compy");
    await hit(send, id, 2);
    expect(p.inventory.get("meat")).toBe(99);
  });

  it("a raptor next to a player bites for 8 on its cooldown", async () => {
    const { room, p, dinos, place } = await setup();
    const id = place("raptor", 12);
    dinos.unfreeze(id);
    const before = p.health;
    // เลือดฟื้นเอง 0.5/วิ ระหว่างรอ จึงเทียบเป็นช่วง (กัดแต่ละครั้ง = −8)
    const lost = () => before - p.health;
    await sleep(150);
    expect(lost()).toBeGreaterThan(7);
    expect(lost()).toBeLessThanOrEqual(8);
    await sleep(400);
    expect(lost()).toBeLessThanOrEqual(8);
    await sleep(700);
    expect(lost()).toBeGreaterThan(15);
    expect(lost()).toBeLessThanOrEqual(16);
    expect(room.state.dinos.get(id)!.mood).toBe(2);
  });

  it("taming: 3 berries tame a compy; the owner's token is never synced", async () => {
    const TOKEN = "tamerTOKENtamerTOKEN";
    const { room, c, p, send, place } = await setup({ berry: 5 }, TOKEN);
    const id = place("compy");
    await feed(send, id, 2);
    expect(room.state.dinos.get(id)!.owner).toBe("");
    await feed(send, id, 1);
    const d = room.state.dinos.get(id)!;
    expect(d.owner).toBe("hunter");
    expect(p.inventory.get("berry")).toBe(2);

    await feed(send, id, 1); // เทมแล้ว ไม่กินอีก
    expect(p.inventory.get("berry")).toBe(2);
    await room.waitForNextPatch();
    expect(JSON.stringify(c.state.toJSON())).not.toContain(TOKEN);
  });

  it("only tameable kinds, only with the right food, only in reach", async () => {
    const { room, p, send, place } = await setup({ berry: 9 });
    const trike = place("trike", 30);
    await feed(send, trike, 3);
    expect(room.state.dinos.get(trike)!.owner).toBe("");
    expect(p.inventory.get("berry")).toBe(9);

    const raptor = place("raptor", 20);
    await feed(send, raptor, 1); // แร็พเตอร์กินเนื้อ ไม่กินผลไม้
    expect(p.inventory.get("berry")).toBe(9);

    const far = place("compy", 80);
    await feed(send, far, 1);
    expect(p.inventory.get("berry")).toBe(9);
  });

  it("at most 3 tamed dinos per player", async () => {
    const { room, send, place } = await setup({ berry: 99 });
    const ids = [place("compy"), place("compy"), place("compy"), place("compy")];
    for (const id of ids) await feed(send, id, 3);
    expect(ids.map((id) => room.state.dinos.get(id)!.owner)).toEqual(["hunter", "hunter", "hunter", ""]);
  });

  it("tamed dinos can't be hit, follow their owner, and stay tamed after a restart", async () => {
    const TOKEN = "ownerTOKENownerTOKEN";
    const { room, c, p, dinos, send, place } = await setup({ berry: 3 }, TOKEN);
    const id = place("compy");
    await feed(send, id, 3);
    dinos.unfreeze(id);
    const d = room.state.dinos.get(id)!;

    await send("attack", { id });
    expect(d.hp).toBe(dinoDef("compy").hp);

    p.x += 100;
    const start = d.x;
    for (let i = 0; i < 10; i++) await room.waitForNextTimestep();
    expect(d.x).toBeGreaterThan(start + 10);

    const code = room.roomId;
    await c.leave();
    await sleep(400);
    const again = await colyseus.createRoom<WorldRoom>("world", { code });
    const back = [...again.state.dinos.values()].find((x) => x.owner === "hunter");
    expect(back?.kind).toBe("compy");
    const c2 = await colyseus.connectTo(again, { name: "hunter", token: TOKEN });
    expect(again.state.players.get(c2.sessionId)).toBeDefined();
  });

  it("no wall can be placed on a dino", async () => {
    const { room, p, send, place } = await setup({ wall: 1 });
    const id = place("duckbill", 24);
    const d = room.state.dinos.get(id)!;
    const tx = Math.floor(d.x / TILE_SIZE);
    const ty = Math.floor(d.y / TILE_SIZE);
    Object.assign(p, { x: d.x - 24, y: d.y });
    await send("place", { item: "wall", tx, ty });
    expect(room.state.structures.size).toBe(0);
    expect(p.inventory.get("wall")).toBe(1);
  });

  it("an old save without dinos (version 1) still opens", async () => {
    const dir = process.env.DATA_DIR!;
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      join(dir, "VERSNA.json"),
      JSON.stringify({ version: 1, code: "VERSNA", seed: SEED, savedAt: 1, nodes: [], structures: [], drops: [], players: {} }),
    );
    const room = await colyseus.createRoom<WorldRoom>("world", { code: "VERSNA" });
    expect(room.state.seed).toBe(SEED);
  });

  // review #1
  it("taming a raptor that was biting you doesn't make your other raptor kill it", async () => {
    const { room, p, dinos, send, place } = await setup({ meat: 8 });
    const first = place("raptor", 20);
    for (let i = 0; i < 4; i++) {
      await send("feed", { id: first });
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
    const second = dinos.spawnAt("raptor", p.x - 20, p.y, room.clock.currentTime);
    dinos.unfreeze(first);
    await sleep(1200); // ตัวที่ 2 กัดเจ้าของ → เป็นศัตรูของเจ้าของ
    for (let i = 0; i < 4; i++) {
      await send("feed", { id: second });
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
    expect(room.state.dinos.get(second)?.owner).toBe("hunter");
    const hp = () => [room.state.dinos.get(first)?.hp, room.state.dinos.get(second)?.hp];
    const before = hp();
    await sleep(2500);
    expect(hp()).toEqual(before);
  }, 20000);

  // review #2
  it("a door stops wild dinos", async () => {
    const { room, p, dinos, send } = await setup({ door: 1 });
    const at = openArea();
    const tx = Math.floor(at.x / TILE_SIZE);
    Object.assign(p, { x: at.x + 32, y: at.y });
    await send("place", { item: "door", tx, ty: Math.floor(at.y / TILE_SIZE) });
    expect(room.state.structures.size).toBe(1);
    const raptor = dinos.spawnAt("raptor", at.x - 32, at.y, room.clock.currentTime);
    const before = p.health;
    await sleep(2000);
    expect(room.state.dinos.get(raptor)!.x).toBeLessThan(tx * TILE_SIZE);
    expect(p.health).toBeGreaterThanOrEqual(before);
  });

  // review #4: ผู้เล่นชั่วคราว (ไม่มี token) เทมไม่ได้ — ไม่งั้นไดโนกำพร้าค้างโลกตลอดไป
  it("guests without a token can't tame", async () => {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: SEED });
    const c = await colyseus.connectTo(room, { name: "guest" });
    const p = room.state.players.get(c.sessionId)!;
    p.inventory.set("berry", 3);
    const dinos = (room as any).dinos as DinoSystem;
    const at = openArea();
    Object.assign(p, at);
    const id = dinos.spawnAt("compy", at.x + 20, at.y, room.clock.currentTime);
    dinos.freeze(id);
    for (let i = 0; i < 3; i++) {
      c.send("feed", { id });
      await room.waitForNextMessage();
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
    expect(room.state.dinos.get(id)!.owner).toBe("");
    expect(p.inventory.get("berry")).toBe(3);
  });

  // review #7
  it("feeding has the same cooldown as hitting (no instant tame by spamming)", async () => {
    const { room, c, p, place } = await setup({ meat: 9 });
    const id = place("raptor", 20);
    for (let i = 0; i < 4; i++) c.send("feed", { id });
    await sleep(150);
    expect(room.state.dinos.get(id)!.owner).toBe("");
    expect(p.inventory.get("meat")).toBe(8);
  });

  it("cooking prefers meat: meat → steak", async () => {
    const { room, p, send } = await setup({ campfire: 1, meat: 1, berry: 1 });
    const at = openArea();
    Object.assign(p, { x: at.x - 16, y: at.y });
    await send("place", { item: "campfire", tx: Math.floor(at.x / TILE_SIZE), ty: Math.floor(at.y / TILE_SIZE) });
    expect(room.state.structures.size).toBe(1);
    await send("cook", {});
    expect(p.inventory.get("steak")).toBe(1);
    expect(p.inventory.get("meat")).toBeUndefined();
    expect(p.inventory.get("berry")).toBe(1);
  });

  it("eating steak gives 45 food", async () => {
    const { p, send } = await setup({ steak: 1 });
    p.hunger = 10;
    await send("eat", { item: "steak" });
    expect(p.hunger).toBeCloseTo(55, 0);
  });
});
