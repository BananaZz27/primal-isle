import {
  BALANCE,
  craftCheck,
  inReach,
  isRecipe,
  recipeCost,
  type ItemId,
} from "@primal/shared";
import type { Player, WorldState } from "./schema/WorldState.js";
import { setCount } from "./survivalSystem.js";

/**
 * ระบบคราฟต์ฝั่งเซิร์ฟเวอร์ (ตัวตัดสินจริง): ทำของ, ย่างผลไม้ (การวางอยู่ใน BuildingSystem)
 * คำขอที่ผิดถูกเมินเงียบๆ และไม่ทำให้เสียของ
 */
export class CraftingSystem {
  constructor(private state: WorldState) {}

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
