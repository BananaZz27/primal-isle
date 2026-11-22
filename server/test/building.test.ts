import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { findSpawn, generateDecor, generateWorld, isWalkable, TILE_SIZE, tileAt } from "@primal/shared";
import appConfig from "../src/app.config";
import type { WorldRoom } from "../src/rooms/WorldRoom";
import type { MoveInput } from "../src/rooms/schema/WorldState";

const SEED = 1234;
const map = generateWorld(SEED);
const occupied = new Set(generateDecor(map).map((d) => `${d.tx},${d.ty}`));
const centre = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 });

/** ช่องว่างที่ 3×3 รอบตัวว่าง (ข้าม spawn zone) */
function freeTile(skip = 0) {
  let n = 0;
  for (let ty = 3; ty < map.size - 3; ty++)
    for (let tx = 3; tx < map.size - 3; tx++) {
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++)
        for (let dx = -1; dx <= 1 && ok; dx++)
          if (!isWalkable(tileAt(map, tx + dx, ty + dy)) || occupied.has(`${tx + dx},${ty + dy}`)) ok = false;
      if (ok && n++ === skip) return { tx, ty };
    }
  throw new Error("no free tile");
}

describe("building", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => colyseus.shutdown());
  beforeEach(async () => colyseus.cleanup());

  async function setup(items: Record<string, number> = {}) {
    const room = await colyseus.createRoom<WorldRoom>("world", { seed: SEED });
    const c = await colyseus.connectTo(room, { name: "t" });
    const p = room.state.players.get(c.sessionId)!;
    for (const [k, v] of Object.entries(items)) p.inventory.set(k, v);
    const send = async (type: string, msg: unknown) => {
      c.send(type as any, msg);
      await room.waitForNextMessage();
    };
    return { room, c, p, send };
  }

  it("places a wall on the tile next to the player and it blocks walking", async () => {
    const { room, c, p, send } = await setup({ wall: 1 });
    const t = freeTile();
    Object.assign(p, centre(t.tx - 1, t.ty));
    await send("place", { item: "wall", tx: t.tx, ty: t.ty });
    expect(p.inventory.get("wall")).toBeUndefined();
    expect([...room.state.structures.values()].map((s) => [s.kind, s.tx, s.ty])).toEqual([["wall", t.tx, t.ty]]);

    const input = c.input<MoveInput>({ mode: "reliable" });
    for (let i = 0; i < 10; i++) {
      input.data.moveX = 1;
      input.data.moveY = 0;
      input.send();
    }
    await room.waitForNextMessage();
    for (let k = 0; k < 12; k++) await room.waitForNextTimestep();
    expect(Math.floor((p.x + 5) / TILE_SIZE)).toBeLessThan(t.tx);
  });

  it("refuses: on yourself, out of reach, on water, missing item, bad coordinates", async () => {
    const { room, p, send } = await setup({ wall: 3 });
    const t = freeTile();
    Object.assign(p, centre(t.tx, t.ty));
    await send("place", { item: "wall", tx: t.tx, ty: t.ty }); // ทับตัวเอง
    await send("place", { item: "wall", tx: t.tx + 4, ty: t.ty }); // ไกล
    await send("place", { item: "wall", tx: 0, ty: 0 }); // น้ำ
    await send("place", { item: "door", tx: t.tx + 1, ty: t.ty }); // ไม่มีประตู
    await send("place", { item: "wall", tx: "x", ty: null });
    expect(room.state.structures.size).toBe(0);
    expect(p.inventory.get("wall")).toBe(3);
  });

  it("demolishing gives the item back to whoever demolishes", async () => {
    const { room, p, send } = await setup({ door: 1 });
    const t = freeTile();
    Object.assign(p, centre(t.tx - 1, t.ty));
    await send("place", { item: "door", tx: t.tx, ty: t.ty });
    const key = [...room.state.structures.keys()][0];
    await send("demolish", { key: "nope" });
    expect(room.state.structures.size).toBe(1);
    await send("demolish", { key });
    expect(room.state.structures.size).toBe(0);
    expect(p.inventory.get("door")).toBe(1);
  });

  it("dying drops the whole bag at the death tile; respawn at own bed", async () => {
    const { room, p, send } = await setup({ bed: 1, wood: 7, berry: 2 });
    const t = freeTile();
    Object.assign(p, centre(t.tx - 1, t.ty));
    await send("place", { item: "bed", tx: t.tx, ty: t.ty });

    const death = freeTile(300);
    Object.assign(p, centre(death.tx, death.ty), { health: 0.01, hunger: 0, thirst: 0 });
    await room.waitForNextTimestep();
    await room.waitForNextTimestep();

    expect(p.inventory.size).toBe(0);
    const drops = [...room.state.drops.values()];
    expect(drops.length).toBe(1);
    expect([drops[0].tx, drops[0].ty]).toEqual([death.tx, death.ty]);
    expect(Object.fromEntries(drops[0].items.entries())).toEqual({ wood: 7, berry: 2 });
    expect({ x: p.x, y: p.y }).toEqual(centre(t.tx, t.ty)); // ฟื้นที่ที่นอน
  });

  it("a drop can be picked up once, only in reach", async () => {
    const { room, p, send } = await setup({ wood: 4 });
    const death = freeTile(200);
    Object.assign(p, centre(death.tx, death.ty), { health: 0.01, hunger: 0, thirst: 0 });
    await room.waitForNextTimestep();
    await room.waitForNextTimestep();
    const key = [...room.state.drops.keys()][0];

    await send("pickup", { key }); // อยู่ที่จุดเกิด ไกลถุง
    expect(room.state.drops.size).toBe(1);

    Object.assign(p, centre(death.tx, death.ty));
    await send("pickup", { key });
    await send("pickup", { key });
    expect(room.state.drops.size).toBe(0);
    expect(p.inventory.get("wood")).toBe(4);
  });

  it("with the bed demolished, respawn falls back to the normal spawn", async () => {
    const { room, p, send } = await setup({ bed: 1 });
    const t = freeTile();
    Object.assign(p, centre(t.tx - 1, t.ty));
    await send("place", { item: "bed", tx: t.tx, ty: t.ty });
    await send("demolish", { key: [...room.state.structures.keys()][0] });
    Object.assign(p, { health: 0.01, hunger: 0, thirst: 0 });
    await room.waitForNextTimestep();
    await room.waitForNextTimestep();
    expect({ x: p.x, y: p.y }).toEqual(findSpawn(map, p.colorIndex));
  });
});
