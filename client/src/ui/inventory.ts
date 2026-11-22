import { ITEM_IDS, type ItemId } from "@primal/shared";
import type { Player } from "@primal/server/schema";
import { ITEM_ICONS } from "../art/ninjaAtlas";
import { el, uiRoot } from "./dom";
import { iconElement } from "./icons";
import { itemLabel } from "./labels";

/** วัตถุดิบพื้นฐาน: แสดงในกระเป๋าเสมอ (ของอื่นแสดงเมื่อมี) */
const ALWAYS: ReadonlySet<ItemId> = new Set(["wood", "stone", "berry", "fiber"]);

/** แตะของชนิดนี้แล้วทำอะไร */
export type ItemAction = "eat" | "place";
const ACTIONS: Partial<Record<ItemId, ItemAction>> = {
  berry: "eat",
  roast: "eat",
  campfire: "place",
  wall: "place",
  door: "place",
  bed: "place",
};
const ACTION_HINT: Record<ItemAction, string> = { eat: "แตะเพื่อกิน", place: "แตะเพื่อวางช่องหน้าตัว" };

/** กระเป๋าตรงกลางล่าง: ไอคอน + จำนวน · แตะของกิน = กิน · แตะสิ่งก่อสร้าง = วางช่องหน้าตัว */
export class InventoryHud {
  private root = el("div", { className: "panel inventory" });
  private counts = new Map<ItemId, HTMLElement>();
  private slots = new Map<ItemId, HTMLElement>();

  constructor(onUse: (item: ItemId, action: ItemAction) => void) {
    for (const id of ITEM_IDS) {
      const count = el("span", { className: "count", text: "0" });
      const slot = el("button", { className: "slot" }, iconElement(ITEM_ICONS[id]), count);
      const action = ACTIONS[id];
      slot.title = action ? `${itemLabel(id)} (${ACTION_HINT[action]})` : itemLabel(id);
      slot.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (action) onUse(id, action);
      });
      slot.hidden = !ALWAYS.has(id);
      this.root.append(slot);
      this.counts.set(id, count);
      this.slots.set(id, slot);
    }
    uiRoot().append(this.root);
  }

  /** แถวกระเป๋า — ใช้วางปุ่มอื่น (เช่น 🔨) ต่อท้ายในแถวเดียวกัน จะได้ไม่ทับช่องของ */
  get element(): HTMLElement {
    return this.root;
  }

  update(player: Player): void {
    for (const id of ITEM_IDS) {
      const n = player.inventory.get(id) ?? 0;
      const slot = this.slots.get(id)!;
      this.counts.get(id)!.textContent = String(n);
      slot.classList.toggle("empty", n === 0);
      slot.hidden = n === 0 && !ALWAYS.has(id);
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
