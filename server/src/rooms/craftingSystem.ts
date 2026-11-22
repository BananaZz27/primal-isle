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

/** ของดิบ → ของย่าง (ลำดับ = ลำดับที่เลือกย่าง) */
const COOKING: [ItemId, ItemId][] = [
  ["meat", "steak"],
  ["berry", "roast"],
];

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

  /**
   * ย่าง 1 ชิ้น ถ้ายืนใกล้กองไฟ: เนื้อดิบ → เนื้อย่าง ก่อน, ไม่มีเนื้อ (หรือเนื้อย่างเต็ม) → ผลไม้ → ผลไม้ย่าง
   * ของที่ได้เต็ม 99 แล้วไม่ย่าง (ไม่เผาของทิ้ง)
   */
  cook(player: Player): void {
    const nearFire = [...this.state.structures.values()].some(
      (s) => s.kind === "campfire" && inReach(player.x, player.y, s.tx, s.ty),
    );
    if (!nearFire) return;
    const has = (item: ItemId) => player.inventory.get(item) ?? 0;
    const pair = COOKING.find(([raw, done]) => has(raw) > 0 && has(done) < BALANCE.stackMax);
    if (!pair) return;
    const [raw, done] = pair;
    setCount(player, raw, has(raw) - 1);
    setCount(player, done, has(done) + 1);
  }
}
