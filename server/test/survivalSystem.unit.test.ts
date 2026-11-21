import { describe, it, expect } from "vitest";
import { BALANCE, DecorKind, generateDecor, generateWorld, isWalkable, TICK_RATE, TILE_SIZE, tileAt } from "@primal/shared";
import { SurvivalSystem } from "../src/rooms/survivalSystem";
import { Player, WorldState } from "../src/rooms/schema/WorldState";

/** ทดสอบระบบตรงๆ ด้วยเวลาที่กำหนดเอง (ไม่ขึ้นกับเวลาจริงของเครื่อง) */
describe("SurvivalSystem cooldown", () => {
  const map = generateWorld(1234);
  const decor = generateDecor(map);
  const id = decor.findIndex((d) => d.kind === DecorKind.Tree && isWalkable(tileAt(map, d.tx - 1, d.ty)));
  const d = decor[id];

  function setup() {
    const state = new WorldState();
    const player = new Player({
      x: (d.tx - 1) * TILE_SIZE + 8, y: d.ty * TILE_SIZE + 8, vx: 0, vy: 0,
      name: "t", colorIndex: 0, health: 100, hunger: 100, thirst: 100,
    });
    state.players.set("a", player);
    return { sys: new SurvivalSystem(state, map, decor), player };
  }

  it("accepts a hit one server tick early (the room clock moves in 1/TICK_RATE steps)", () => {
    const { sys, player } = setup();
    const tickMs = 1000 / TICK_RATE;
    sys.gather("a", player, id, 1000);
    sys.gather("a", player, id, 1000 + BALANCE.gatherCooldownMs - tickMs);
    expect(player.inventory.get("wood")).toBe(2);
  });

  it("still rejects hits clearly faster than the cooldown", () => {
    const { sys, player } = setup();
    sys.gather("a", player, id, 1000);
    sys.gather("a", player, id, 1000 + 200);
    expect(player.inventory.get("wood")).toBe(1);
  });
});
