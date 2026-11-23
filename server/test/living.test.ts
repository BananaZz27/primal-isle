import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import {
  BALANCE,
  crateSpawnOk,
  DecorKind,
  generateDecor,
  generateWorld,
  isNight,
  isWalkable,
  TILE_SIZE,
  tileAt,
} from "@primal/shared";
import appConfig from "../src/app.config";
import type { WorldRoom } from "../src/rooms/WorldRoom";

const SEED = 1234;
const map = generateWorld(SEED);
const occupied = new Set(generateDecor(map).map((d) => `${d.tx},${d.ty}`));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ช่องว่าง 5×5 → คืนช่องกลาง */
function openTile(skip = 0) {
  let n = 0;
  for (let ty = 4; ty < map.size - 4; ty++)
    for (let tx = 4; tx < map.size - 4; tx++) {
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++)
        for (let dx = -2; dx <= 2 && ok; dx++)
          if (!isWalkable(tileAt(map, tx + dx, ty + dy)) || occupied.has(`${tx + dx},${ty + dy}`)) ok = false;
      if (ok && n++ === skip) return { tx, ty };
    }
  throw new Error("no open tile");
}
const centre = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8 });

describe("living world", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  async function setup(items: Record<string, number> = {}, token = "liveTOKENliveTOKEN01", name = "boat") {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: SEED });
    const c = await colyseus.connectTo(room, { name, token });
    const p = room.state.players.get(c.sessionId)!;
    for (const [k, v] of Object.entries(items)) p.inventory.set(k, v);
    const send = async (type: string, msg: unknown) => {
      c.send(type as any, msg);
      await room.waitForNextMessage();
    };
    return { room, c, p, send };
  }

  /** วางกล่องเก็บของข้างตัว คืน key */
  async function placeChest(room: WorldRoom, p: any, send: (t: string, m: unknown) => Promise<void>) {
    const t = openTile();
    Object.assign(p, centre(t.tx - 1, t.ty));
    p.inventory.set("chest", (p.inventory.get("chest") ?? 0) + 1);
    await send("place", { item: "chest", tx: t.tx, ty: t.ty });
    const key = [...room.state.structures.entries()].find(([, s]) => s.kind === "chest")?.[0];
    expect(key).toBeDefined();
    return key!;
  }

  it("a new world starts in the morning and the clock moves", async () => {
    const { room } = await setup();
    const start = room.state.clock;
    expect(isNight(start)).toBe(false);
    await sleep(1300);
    expect(room.state.clock).toBeGreaterThan(start);
  });

  it("bottled water and bandages work anywhere", async () => {
    const { p, send } = await setup({ bottle: 1, bandage: 1 });
    p.thirst = 20;
    p.health = 30;
    await send("eat", { item: "bottle" });
    await send("eat", { item: "bandage" });
    expect(p.thirst).toBeCloseTo(70, 0);
    expect(p.health).toBeGreaterThan(64);
    expect(p.inventory.size).toBe(0);
  });

  describe("supply crates", () => {
    it("land only on open grass away from players", async () => {
      const { room, p } = await setup();
      const crates = (room as any).crates;
      const solid = (room as any).solid;
      for (let i = 0; i < 20; i++) crates.spawnRandom(room.clock.currentTime);
      expect(room.state.crates.size).toBeGreaterThan(0);
      for (const c of room.state.crates.values()) expect(crateSpawnOk(map, solid, c.tx, c.ty, [p])).toBe(true);
    });

    it("never land on a wall, a chest or any decor tile (a tree could regrow on top)", async () => {
      const { room, p, send } = await setup({ wall: 1 });
      await placeChest(room, p, send);
      const chestAt = [...room.state.structures.values()].find((s) => s.kind === "chest")!;
      const w = openTile(40);
      Object.assign(p, centre(w.tx - 1, w.ty));
      await send("place", { item: "wall", tx: w.tx, ty: w.ty });
      expect([...room.state.structures.values()].some((s) => s.kind === "wall")).toBe(true);
      const bush = generateDecor(map).find((d) => d.kind === DecorKind.Bush && isWalkable(tileAt(map, d.tx, d.ty)))!;
      const free = openTile(80);
      Object.assign(p, centre(free.tx + 30, free.ty)); // ผู้เล่นอยู่ไกลช่องว่าง (≥ 10 ช่อง) จะได้ไม่ใช่เหตุที่ถูกปฏิเสธ
      const tiles = [chestAt, { tx: w.tx, ty: w.ty }, bush, free];
      // สุ่มแบบกำหนดเอง: แต่ละรอบ spawnRandom อ่าน rand() 2 ครั้ง (tx, ty)
      const seq = tiles.flatMap((t) => [(t.tx + 0.5) / map.size, (t.ty + 0.5) / map.size]);
      const crates = (room as any).crates;
      crates.rand = () => seq.shift() ?? 0;
      crates.spawnRandom(room.clock.currentTime);
      expect([...room.state.crates.values()].map((c) => [c.tx, c.ty])).toEqual([[free.tx, free.ty]]);
    });

    it("open once, in reach, for 2–3 kinds of loot", async () => {
      const { room, p, send } = await setup();
      const t = openTile();
      const key = (room as any).crates.spawnAt(t.tx, t.ty, room.clock.currentTime);
      Object.assign(p, centre(t.tx + 5, t.ty));
      await send("open", { key });
      expect(room.state.crates.has(key)).toBe(true);
      Object.assign(p, centre(t.tx + 1, t.ty));
      await send("open", { key });
      expect(room.state.crates.has(key)).toBe(false);
      expect(p.inventory.size).toBeGreaterThanOrEqual(2);
    });

    it("two players opening the same crate: only one gets the loot", async () => {
      const { room, c, p } = await setup();
      const c2 = await colyseus.connectTo(room, { name: "friend", token: "friendTOKENfriend001" });
      const p2 = room.state.players.get(c2.sessionId)!;
      const t = openTile();
      const key = (room as any).crates.spawnAt(t.tx, t.ty, room.clock.currentTime);
      Object.assign(p, centre(t.tx + 1, t.ty));
      Object.assign(p2, centre(t.tx - 1, t.ty));
      c.send("open", { key });
      c2.send("open", { key });
      await sleep(200);
      expect([p.inventory.size > 0, p2.inventory.size > 0].filter(Boolean).length).toBe(1);
    });
  });

  describe("storage chests", () => {
    it("put and take move exactly what fits", async () => {
      const { room, p, send } = await setup({ wood: 10 });
      const key = await placeChest(room, p, send);
      await send("chest", { key, item: "wood", n: 4, dir: "put" });
      expect(p.inventory.get("wood")).toBe(6);
      expect(room.state.chests.get(key)!.items.get("wood")).toBe(4);
      await send("chest", { key, item: "wood", n: 50, dir: "take" });
      expect(p.inventory.get("wood")).toBe(10);
      expect(room.state.chests.get(key)!.items.has("wood")).toBe(false);
    });

    it("junk requests change nothing", async () => {
      const { room, p, send } = await setup({ wood: 5 });
      const key = await placeChest(room, p, send);
      for (const bad of [
        { key, item: "wood", n: -3, dir: "put" },
        { key, item: "wood", n: 1.5, dir: "put" },
        { key, item: "toString", n: 1, dir: "put" },
        { key, item: "wood", n: 1, dir: "sideways" },
        { key: "nope", item: "wood", n: 1, dir: "put" },
      ])
        await send("chest", bad);
      expect(p.inventory.get("wood")).toBe(5);
      expect(room.state.chests.get(key)!.items.size).toBe(0);
    });

    it("never over 99 either way; out of reach does nothing", async () => {
      const { room, p, send } = await setup({ wood: 99 });
      const key = await placeChest(room, p, send);
      room.state.chests.get(key)!.items.set("wood", 98);
      await send("chest", { key, item: "wood", n: 5, dir: "put" });
      expect(room.state.chests.get(key)!.items.get("wood")).toBe(99);
      expect(p.inventory.get("wood")).toBe(98);
      await send("chest", { key, item: "wood", n: 5, dir: "take" });
      expect(p.inventory.get("wood")).toBe(99);
      expect(room.state.chests.get(key)!.items.get("wood")).toBe(98);
      p.x += 200;
      await send("chest", { key, item: "wood", n: 1, dir: "take" });
      expect(p.inventory.get("wood")).toBe(99);
    });

    it("two players taking the last item: only one gets it", async () => {
      const { room, c, p, send } = await setup();
      const key = await placeChest(room, p, send);
      const c2 = await colyseus.connectTo(room, { name: "friend", token: "friendTOKENfriend001" });
      const p2 = room.state.players.get(c2.sessionId)!;
      Object.assign(p2, { x: p.x, y: p.y + 4 });
      room.state.chests.get(key)!.items.set("stone", 1);
      c.send("chest", { key, item: "stone", n: 1, dir: "take" });
      c2.send("chest", { key, item: "stone", n: 1, dir: "take" });
      await sleep(200);
      expect((p.inventory.get("stone") ?? 0) + (p2.inventory.get("stone") ?? 0)).toBe(1);
    });

    it("a chest with things inside can't be demolished; an empty one can", async () => {
      const { room, p, send } = await setup({ wood: 1 });
      const key = await placeChest(room, p, send);
      await send("chest", { key, item: "wood", n: 1, dir: "put" });
      await send("demolish", { key });
      expect(room.state.structures.has(key)).toBe(true);
      await send("chest", { key, item: "wood", n: 1, dir: "take" });
      await send("demolish", { key });
      expect(room.state.structures.has(key)).toBe(false);
      expect(room.state.chests.has(key)).toBe(false);
      expect(p.inventory.get("chest")).toBe(1);
    });
  });

  it("demolishing while holding 99 of that piece is refused (nothing lost)", async () => {
    const { room, p, send } = await setup({ wall: 1 });
    const t = openTile();
    Object.assign(p, centre(t.tx - 1, t.ty));
    await send("place", { item: "wall", tx: t.tx, ty: t.ty });
    p.inventory.set("wall", 99);
    const key = [...room.state.structures.keys()][0];
    await send("demolish", { key });
    expect(room.state.structures.has(key)).toBe(true);
    expect(p.inventory.get("wall")).toBe(99);
  });

  it("chest contents, crates and the time of day survive a restart", async () => {
    const TOKEN = "saveTOKENsaveTOKEN01";
    const { room, c, p, send } = await setup({ stone: 7 }, TOKEN);
    const key = await placeChest(room, p, send);
    await send("chest", { key, item: "stone", n: 7, dir: "put" });
    const t = openTile(3);
    (room as any).crates.spawnAt(t.tx, t.ty, room.clock.currentTime);
    const clock = room.state.clock;
    const code = room.roomId;
    await c.leave();
    await sleep(400);
    const again = await colyseus.createRoom<WorldRoom>("world", { code });
    const chestKey = [...again.state.structures.entries()].find(([, s]) => s.kind === "chest")![0];
    expect(again.state.chests.get(chestKey)!.items.get("stone")).toBe(7);
    expect([...again.state.crates.values()].map((x) => [x.tx, x.ty])).toEqual([[t.tx, t.ty]]);
    expect(Math.abs(again.state.clock - clock)).toBeLessThanOrEqual(2);
  });

  it("a version 2 save (no chests/crates/clock) still opens", async () => {
    writeFileSync(
      join(process.env.DATA_DIR!, "VERTWB.json"),
      JSON.stringify({ version: 2, code: "VERTWB", seed: SEED, savedAt: 1, nodes: [], structures: [], drops: [], players: {}, dinos: [] }),
    );
    const room = await colyseus.createRoom<WorldRoom>("world", { code: "VERTWB" });
    expect(room.state.seed).toBe(SEED);
  });

  it("a save with junk chest items keeps only real items, whole numbers, up to the kind limit", async () => {
    const t = openTile();
    const kinds = ["wood", "stone", "berry", "fiber", "axe", "hammer", "campfire", "roast", "wall", "door", "bed", "meat", "steak", "spear"];
    const items: Record<string, number> = { bogus: 3, toString: 1, berry: 2.7 };
    for (const k of kinds) items[k] ??= 1;
    writeFileSync(
      join(process.env.DATA_DIR!, "CHSTWB.json"),
      JSON.stringify({
        version: 3, code: "CHSTWB", seed: SEED, savedAt: 1, nodes: [], drops: [], players: {}, dinos: [], crates: [], clock: 100,
        structures: [{ kind: "chest", tx: t.tx, ty: t.ty, owner: "", items }],
      }),
    );
    const room = await colyseus.createRoom<WorldRoom>("world", { code: "CHSTWB" });
    const box = [...room.state.chests.values()][0];
    const saved = Object.fromEntries(box.items.entries());
    expect(Object.keys(saved).every((k) => kinds.includes(k))).toBe(true);
    expect(Object.values(saved).every((n) => Number.isInteger(n) && n > 0)).toBe(true);
    expect(box.items.size).toBe(BALANCE.chestKinds);
    expect(saved.berry).toBe(2);
  });

  it("a tamed dino shows its owner's new name after they rejoin", async () => {
    const TOKEN = "renameTOKENrename001";
    const { room, c, p, send } = await setup({ berry: 3 }, TOKEN, "old");
    const dinos = (room as any).dinos;
    const t = openTile();
    Object.assign(p, centre(t.tx, t.ty));
    const id = dinos.spawnAt("compy", p.x + 20, p.y, room.clock.currentTime);
    dinos.freeze(id);
    for (let i = 0; i < 3; i++) {
      await send("feed", { id });
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
    expect(room.state.dinos.get(id)!.owner).toBe("old");
    await colyseus.connectTo(room, { name: "friend", token: "friendTOKENfriend001" }); // ห้องไม่ปิดตอนเจ้าของออก
    await c.leave();
    await colyseus.connectTo(room, { name: "new", token: TOKEN });
    expect(room.state.dinos.get(id)!.owner).toBe("new");
  });
});
