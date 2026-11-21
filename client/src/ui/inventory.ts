import { ITEM_IDS, type ItemId } from "@primal/shared";
import type { Player } from "@primal/server/schema";
import { ITEM_ICONS } from "../art/ninjaAtlas";
import { el, uiRoot } from "./dom";
import { iconElement } from "./icons";
import { itemLabel } from "./labels";

/** ของที่แตะแล้วใช้ได้ (ตอนนี้มีแค่ผลไม้ = กิน) */
const USABLE: Partial<Record<ItemId, true>> = { berry: true };

/** กระเป๋าตรงกลางล่าง: ไอคอน + จำนวน · แตะผลไม้เพื่อกิน */
export class InventoryHud {
  private root = el("div", { className: "panel inventory" });
  private counts = new Map<ItemId, HTMLElement>();
  private slots = new Map<ItemId, HTMLElement>();

  constructor(onUse: (item: ItemId) => void) {
    for (const id of ITEM_IDS) {
      const count = el("span", { className: "count", text: "0" });
      const slot = el("button", { className: "slot" }, iconElement(ITEM_ICONS[id]), count);
      slot.title = USABLE[id] ? `${itemLabel(id)} (แตะเพื่อกิน)` : itemLabel(id);
      slot.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (USABLE[id]) onUse(id);
      });
      this.root.append(slot);
      this.counts.set(id, count);
      this.slots.set(id, slot);
    }
    uiRoot().append(this.root);
  }

  update(player: Player): void {
    for (const id of ITEM_IDS) {
      const n = player.inventory.get(id) ?? 0;
      this.counts.get(id)!.textContent = String(n);
      this.slots.get(id)!.classList.toggle("empty", n === 0);
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
