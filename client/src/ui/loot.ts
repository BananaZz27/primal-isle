import { ITEM_IDS, type ItemId } from "@primal/shared";
import { itemLabel } from "./labels";

type Counts = Partial<Record<string, number>>;

/** ของที่เพิ่มขึ้นในกระเป๋า (ก่อน → หลัง) เรียงตามลำดับช่องกระเป๋า — ใช้บอกว่าเปิดกล่องเสบียงได้อะไร */
export function lootGained(before: Counts, after: Counts): [ItemId, number][] {
  const out: [ItemId, number][] = [];
  for (const id of ITEM_IDS) {
    const gained = (after[id] ?? 0) - (before[id] ?? 0);
    if (gained > 0) out.push([id, gained]);
  }
  return out;
}

/** "📦 ได้ ไม้ ×7, อาหารกระป๋อง ×2" */
export function lootText(gained: [ItemId, number][]): string {
  return `📦 ได้ ${gained.map(([id, n]) => `${itemLabel(id)} ×${n}`).join(", ")}`;
}
