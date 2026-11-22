import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import {
  BALANCE,
  DecorKind,
  generateDecor,
  generateWorld,
  isWalkable,
  TILE_SIZE,
  tileAt,
  type Decor,
} from "@primal/shared";
import appConfig from "../src/app.config";
import type { WorldRoom } from "../src/rooms/WorldRoom";

const SEED = 1234;
const map = generateWorld(SEED);
const decor = generateDecor(map);
const occupied = new Set(decor.map((d) => `${d.tx},${d.ty}`));
const centre = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 });

/** ช่องบกว่าง (ไม่มีทรัพยากร) ที่รอบตัว 1 ช่องก็ว่างด้วย — ใช้วางกองไฟ */
function freeTile(skip = 0): { tx: number; ty: number } {
  let n = 0;
  for (let ty = 2; ty < map.size - 2; ty++)
    for (let tx = 2; tx < map.size - 2; tx++) {
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++)
        for (let dx = -1; dx <= 1 && ok; dx++)
          if (!isWalkable(tileAt(map, tx + dx, ty + dy)) || occupied.has(`${tx + dx},${ty + dy}`)) ok = false;
      if (ok && n++ === skip) return { tx, ty };
    }
  throw new Error("no free tile");
}

/** จำนวนช่องว่างทั้งหมดที่ freeTile เลือกได้ */
function countFree(): number {
  let n = 0;
  try {
    for (;;) freeTile(n++);
  } catch {
    return n - 1;
  }
}

describe("crafting", () => {
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

  it("crafting an axe takes exactly the recipe", async () => {
    const { p, send } = await setup({ wood: 5, stone: 2, fiber: 3 });
    await send("craft", { recipe: "axe" });
    expect(Object.fromEntries(p.inventory.entries())).toEqual({ wood: 2, fiber: 1, axe: 1 });
  });

  it("not enough / fake recipe / second tool → nothing changes", async () => {
    const { p, send } = await setup({ wood: 3, stone: 1, fiber: 2 });
    await send("craft", { recipe: "axe" });
    await send("craft", { recipe: "laser" });
    await send("craft", { recipe: "toString" });
    await send("craft", null);
    expect(Object.fromEntries(p.inventory.entries())).toEqual({ wood: 3, stone: 1, fiber: 2 });
    p.inventory.set("stone", 9);
    p.inventory.set("axe", 1);
    await send("craft", { recipe: "axe" });
    expect(p.inventory.get("wood")).toBe(3);
  });

  it("with an axe one hit on a tree gives 2 wood", async () => {
    const { p, send } = await setup({ axe: 1 });
    const id = decor.findIndex((d) => d.kind === DecorKind.Tree && isWalkable(tileAt(map, d.tx - 1, d.ty)) && !occupied.has(`${d.tx - 1},${d.ty}`));
    const d: Decor = decor[id];
    Object.assign(p, centre(d.tx - 1, d.ty));
    await send("gather", { node: id });
    expect(p.inventory.get("wood")).toBe(BALANCE.toolYield);
  });

  it("places a campfire where the player stands", async () => {
    const { room, p, send } = await setup({ campfire: 2 });
    const t = freeTile();
    Object.assign(p, centre(t.tx, t.ty));
    await send("place", { item: "campfire" });
    expect(p.inventory.get("campfire")).toBe(1);
    const placed = [...room.state.structures.values()];
    expect(placed.map((s) => ({ kind: s.kind, tx: s.tx, ty: s.ty }))).toEqual([{ kind: "campfire", ...t }]);
  });

  it("refuses to place on a resource, next to another campfire, without one, or past the limit", async () => {
    const { room, p, send } = await setup({ campfire: 5 });
    const tree = decor.find((d) => d.kind === DecorKind.Tuft)!;
    Object.assign(p, centre(tree.tx, tree.ty));
    await send("place", { item: "campfire" });
    expect(room.state.structures.size).toBe(0);

    const t = freeTile();
    Object.assign(p, centre(t.tx, t.ty));
    await send("place", { item: "campfire" });
    Object.assign(p, centre(t.tx + 1, t.ty)); // ติดกองไฟแรก
    await send("place", { item: "campfire" });
    expect(room.state.structures.size).toBe(1);
    expect(p.inventory.get("campfire")).toBe(4);

    await send("place", { item: "wood" });
    expect(room.state.structures.size).toBe(1);

    p.inventory.delete("campfire");
    const t2 = freeTile(500);
    Object.assign(p, centre(t2.tx, t2.ty));
    await send("place", { item: "campfire" });
    expect(room.state.structures.size).toBe(1);
  });

  it(`stops at ${BALANCE.maxStructures} campfires per world`, async () => {
    const { room, p, send } = await setup({ campfire: 99 });
    // ลองวางมากกว่าขีดจำกัดเยอะๆ (บางช่องอาจติดกันจนถูกปฏิเสธ — ไม่เป็นไร)
    const total = countFree();
    const step = Math.max(3, Math.floor(total / 60));
    for (let k = 0; k < total; k += step) {
      const t = freeTile(k);
      Object.assign(p, centre(t.tx, t.ty));
      await send("place", { item: "campfire" });
    }
    expect(room.state.structures.size).toBe(BALANCE.maxStructures);
    expect(p.inventory.get("campfire")).toBe(99 - BALANCE.maxStructures);
  });

  it("cooking next to a campfire turns a berry into roast; far away or no berry → nothing", async () => {
    const { p, send } = await setup({ campfire: 1, berry: 1 });
    const t = freeTile();
    Object.assign(p, centre(t.tx, t.ty));
    await send("place", { item: "campfire" });

    Object.assign(p, centre(t.tx + 6, t.ty));
    await send("cook", {});
    expect(p.inventory.get("berry")).toBe(1);

    Object.assign(p, centre(t.tx + 1, t.ty));
    await send("cook", {});
    expect(p.inventory.get("berry")).toBeUndefined();
    expect(p.inventory.get("roast")).toBe(1);

    await send("cook", {});
    expect(p.inventory.get("roast")).toBe(1);
  });

  it("cooking with 99 roast keeps the berry (no silent loss)", async () => {
    const { p, send } = await setup({ campfire: 1 });
    const t = freeTile();
    Object.assign(p, centre(t.tx, t.ty));
    await send("place", { item: "campfire" });
    p.inventory.set("berry", 3);
    p.inventory.set("roast", BALANCE.stackMax);
    await send("cook", {});
    expect(p.inventory.get("berry")).toBe(3);
  });

  it("eating roast gives more food than a berry", async () => {
    const { p, send } = await setup({ roast: 1 });
    p.hunger = 10;
    await send("eat", { item: "roast" });
    expect(p.hunger).toBeCloseTo(10 + BALANCE.roastFood, 0);
    expect(p.inventory.get("roast")).toBeUndefined();
  });
});

