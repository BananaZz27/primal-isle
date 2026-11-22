import {
  BALANCE,
  craftCheck,
  inReach,
  isRecipe,
  isWalkable,
  recipeCost,
  TILE_SIZE,
  tileAt,
  type Decor,
  type ItemId,
  type WorldMap,
} from "@primal/shared";
import { Structure, type Player, type WorldState } from "./schema/WorldState.js";
import { setCount } from "./survivalSystem.js";

/**
 * ระบบคราฟต์ฝั่งเซิร์ฟเวอร์ (ตัวตัดสินจริง): ทำของ, วางกองไฟ, ย่างผลไม้
 * คำขอที่ผิดถูกเมินเงียบๆ และไม่ทำให้เสียของ
 */
export class CraftingSystem {
  /** ช่องที่มีของตกแต่ง/ทรัพยากรอยู่ — ห้ามวางทับ */
  private occupied: Set<number>;
  private nextId = 0;

  constructor(
    private state: WorldState,
    private map: WorldMap,
    decor: Decor[],
  ) {
    this.occupied = new Set(decor.map((d) => d.ty * map.size + d.tx));
  }

  craft(player: Player, msg: unknown): void {
    const recipe = (msg as { recipe?: unknown } | null)?.recipe;
    if (!isRecipe(recipe)) return;
    const has = (item: ItemId) => player.inventory.get(item) ?? 0;
    if (!craftCheck(has, recipe).ok) return;

    for (const [item, need] of Object.entries(recipeCost(recipe)) as [ItemId, number][]) {
      setCount(player, item, has(item) - need);
    }
    setCount(player, recipe, Math.min(BALANCE.stackMax, has(recipe) + 1));
  }

  /** วางกองไฟที่ช่องที่ผู้เล่นยืน */
  place(player: Player, msg: unknown): void {
    if ((msg as { item?: unknown } | null)?.item !== "campfire") return;
    const have = player.inventory.get("campfire") ?? 0;
    if (have <= 0 || this.state.structures.size >= BALANCE.maxStructures) return;

    const tx = Math.floor(player.x / TILE_SIZE);
    const ty = Math.floor(player.y / TILE_SIZE);
    if (!isWalkable(tileAt(this.map, tx, ty)) || this.occupied.has(ty * this.map.size + tx)) return;
    for (const s of this.state.structures.values()) {
      if (Math.max(Math.abs(s.tx - tx), Math.abs(s.ty - ty)) <= 1) return; // ติดสิ่งก่อสร้างอื่น
    }

    setCount(player, "campfire", have - 1);
    this.state.structures.set(String(this.nextId++), new Structure({ kind: "campfire", tx, ty }));
  }

  /** ย่างผลไม้ 1 ลูก ถ้ายืนใกล้กองไฟ */
  cook(player: Player): void {
    const berries = player.inventory.get("berry") ?? 0;
    if (berries <= 0) return;
    if ((player.inventory.get("roast") ?? 0) >= BALANCE.stackMax) return; // เต็มแล้ว ไม่เผาผลไม้ทิ้ง
    const nearFire = [...this.state.structures.values()].some(
      (s) => s.kind === "campfire" && inReach(player.x, player.y, s.tx, s.ty),
    );
    if (!nearFire) return;
    setCount(player, "berry", berries - 1);
    setCount(player, "roast", Math.min(BALANCE.stackMax, (player.inventory.get("roast") ?? 0) + 1));
  }
}
