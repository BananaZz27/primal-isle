import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import {
  BALANCE,
  DecorKind,
  findSpawn,
  generateDecor,
  generateWorld,
  isWalkable,
  Tile,
  TILE_SIZE,
  tileAt,
  type Decor,
} from "@primal/shared";
import appConfig from "../src/app.config";
import type { WorldRoom } from "../src/rooms/WorldRoom";
import type { MoveInput } from "../src/rooms/schema/WorldState";

const SEED = 1234;
const map = generateWorld(SEED);
const decor = generateDecor(map);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** id ของทรัพยากรชนิดนี้ตัวแรกที่มีช่องว่างเดินได้ทางซ้าย */
function firstNode(kind: DecorKind): { id: number; d: Decor } {
  const id = decor.findIndex(
    (d) => d.kind === kind && isWalkable(tileAt(map, d.tx - 1, d.ty)) && !decor.some((o) => o.tx === d.tx - 1 && o.ty === d.ty),
  );
  return { id, d: decor[id] };
}
/** วางผู้เล่นไว้ช่องซ้ายของทรัพยากร (กลางช่อง) */
const besideLeft = (d: Decor) => ({ x: (d.tx - 1) * TILE_SIZE + TILE_SIZE / 2, y: d.ty * TILE_SIZE + TILE_SIZE / 2 });

describe("survival", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  async function setup() {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: SEED });
    const c = await colyseus.connectTo(room, { name: "t" });
    const p = room.state.players.get(c.sessionId)!;
    return { room, c, p };
  }

  it("a new player has full stats and an empty bag", async () => {
    const { p } = await setup();
    // อาจผ่านไป 1 tick ก่อนตรวจ ค่าหิว/น้ำจึงลดลงเล็กน้อยได้
    for (const v of [p.health, p.hunger, p.thirst]) expect(v).toBeGreaterThan(99.9);
    expect(p.inventory.size).toBe(0);
  });

  it("three hits on a tree give 3 wood and use it up", async () => {
    const { room, c, p } = await setup();
    const { id, d } = firstNode(DecorKind.Tree);
    Object.assign(p, besideLeft(d));
    for (let i = 0; i < 3; i++) {
      c.send("gather", { node: id });
      await room.waitForNextMessage();
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
    expect(p.inventory.get("wood")).toBe(3);
    expect(room.state.nodes.get(String(id))?.hp).toBe(0);
    c.send("gather", { node: id });
    await room.waitForNextMessage();
    expect(p.inventory.get("wood")).toBe(3); // หมดแล้ว ไม่ได้เพิ่ม
  });

  it("hits faster than the cooldown do not count", async () => {
    const { room, c, p } = await setup();
    const { id, d } = firstNode(DecorKind.Tree);
    Object.assign(p, besideLeft(d));
    c.send("gather", { node: id });
    c.send("gather", { node: id });
    c.send("gather", { node: id });
    await room.waitForNextMessage(100);
    expect(p.inventory.get("wood")).toBe(1);
  });

  it("fake ids, flowers and far-away nodes give nothing", async () => {
    const { room, c, p } = await setup();
    const flower = decor.findIndex((d) => d.kind === DecorKind.Flower);
    const { id } = firstNode(DecorKind.Tree);
    const spawn = findSpawn(map, 0);
    Object.assign(p, spawn); // ไกลจากต้นไม้ (ไม่มีต้นไม้ใกล้จุดเกิด)
    for (const node of [-1, 999999, 1.5, "x", flower, id]) {
      c.send("gather", { node });
      await room.waitForNextMessage();
      await sleep(BALANCE.gatherCooldownMs + 5);
    }
    expect(p.inventory.size).toBe(0);
  });

  it("eating a berry raises hunger and uses the berry; no berry → nothing", async () => {
    const { room, c, p } = await setup();
    p.hunger = 30;
    c.send("eat", { item: "berry" });
    await room.waitForNextMessage();
    expect(p.hunger).toBe(30);
    p.inventory.set("berry", 2);
    c.send("eat", { item: "berry" });
    await room.waitForNextMessage();
    expect(p.hunger).toBeCloseTo(30 + BALANCE.berryFood, 0);
    expect(p.inventory.get("berry")).toBe(1);
  });

  it("drinking works next to water only", async () => {
    const { room, c, p } = await setup();
    p.thirst = 10;
    Object.assign(p, findSpawn(map, 0)); // กลางเกาะ
    c.send("drink", {});
    await room.waitForNextMessage();
    expect(p.thirst).toBeLessThanOrEqual(10);

    let shore = { x: 0, y: 0 };
    outer: for (let ty = 0; ty < map.size; ty++)
      for (let tx = 1; tx < map.size; tx++)
        if (tileAt(map, tx, ty) === Tile.Sand && tileAt(map, tx - 1, ty) === Tile.Water) {
          shore = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
          break outer;
        }
    Object.assign(p, shore);
    c.send("drink", {});
    await room.waitForNextMessage();
    expect(p.thirst).toBeGreaterThan(10 + BALANCE.drinkAmount - 1);
  });

  it("health reaching 0 respawns the player at their spawn with full stats", async () => {
    const { room, p } = await setup();
    Object.assign(p, { x: p.x + 40, health: 0.01, hunger: 0, thirst: 0 });
    await room.waitForNextTimestep();
    await room.waitForNextTimestep();
    expect({ x: p.x, y: p.y }).toEqual(findSpawn(map, p.colorIndex));
    // หลังฟื้นอาจผ่านไปอีก 1 tick ค่าหิว/น้ำจึงลดลงเล็กน้อย
    for (const v of [p.health, p.hunger, p.thirst]) expect(v).toBeGreaterThan(99.9);
  });

  it("a used-up tree grows back when its time comes", async () => {
    const { room, c, p } = await setup();
    const { id, d } = firstNode(DecorKind.Tuft);
    Object.assign(p, besideLeft(d));
    c.send("gather", { node: id });
    await room.waitForNextMessage();
    expect(room.state.nodes.get(String(id))?.hp).toBe(0);
    room.state.nodes.get(String(id))!.regrowAt = 0;
    await room.waitForNextTimestep();
    expect(room.state.nodes.has(String(id))).toBe(false);
  });

  it("does not regrow under a player (would trap them)", async () => {
    const { room, c, p } = await setup();
    const { id, d } = firstNode(DecorKind.Tree);
    Object.assign(p, besideLeft(d));
    for (let i = 0; i < 3; i++) {
      c.send("gather", { node: id });
      await room.waitForNextMessage();
      await sleep(BALANCE.gatherCooldownMs + 20);
    }
    Object.assign(p, { x: d.tx * TILE_SIZE + TILE_SIZE / 2, y: d.ty * TILE_SIZE + TILE_SIZE / 2 });
    room.state.nodes.get(String(id))!.regrowAt = 0;
    await room.waitForNextTimestep();
    expect(room.state.nodes.get(String(id))?.hp).toBe(0);
  });

  it("players cannot walk into a standing tree", async () => {
    const { room, c, p } = await setup();
    const { d } = firstNode(DecorKind.Tree);
    Object.assign(p, besideLeft(d));
    const input = c.input<MoveInput>({ mode: "reliable" });
    for (let i = 0; i < 10; i++) {
      input.data.moveX = 1;
      input.data.moveY = 0;
      input.send();
    }
    await room.waitForNextMessage();
    for (let t = 0; t < 12; t++) await room.waitForNextTimestep();
    expect(Math.floor((p.x + 5) / TILE_SIZE)).toBeLessThan(d.tx);
  });
});
