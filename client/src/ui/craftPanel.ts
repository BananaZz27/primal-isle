import { craftCheck, RECIPE_IDS, recipeCost, type ItemId, type RecipeId } from "@primal/shared";
import type { Player } from "@primal/server/schema";
import { ITEM_ICONS } from "../art/ninjaAtlas";
import { el, uiRoot } from "./dom";
import { iconElement } from "./icons";
import { itemLabel, RECIPE_HINTS, recipeLabel } from "./labels";

export interface CostChip {
  item: ItemId;
  need: number;
  have: number;
  enough: boolean;
}

/** ของที่สูตรนี้ต้องใช้ พร้อมจำนวนที่มี (ลำดับตามสูตร) — pure เทสต์ได้ */
export function costChips(has: (item: ItemId) => number, id: RecipeId): CostChip[] {
  return (Object.entries(recipeCost(id)) as [ItemId, number][]).map(([item, need]) => ({
    item,
    need,
    have: has(item),
    enough: has(item) >= need,
  }));
}

/**
 * หน้าคราฟต์: ปุ่ม 🔨 ข้างกระเป๋าเปิด/ปิด
 * แต่ละสูตรแสดงไอคอน ชื่อ คำอธิบาย ของที่ต้องใช้ (สีแดง = ไม่พอ) และปุ่ม "ทำ"
 */
export class CraftPanel {
  private toggle = el("button", { className: "craft-toggle", text: "🔨" });
  private root = el("div", { className: "panel craft" });
  private rows = new Map<RecipeId, { chips: HTMLElement; button: HTMLButtonElement }>();
  private lastPlayer: Player | null = null;

  /** mount = ที่วางปุ่ม 🔨 (แถวกระเป๋า) */
  /** onOpen = เรียกตอนเปิดหน้าคราฟต์ (ใช้ปิดหน้าต่างอื่นที่อยู่ที่เดียวกัน) */
  constructor(mount: HTMLElement, onCraft: (recipe: RecipeId) => void, private onOpen: () => void = () => {}) {
    this.toggle.title = "คราฟต์";
    this.toggle.addEventListener("click", () => this.setOpen(this.root.hidden));
    this.root.hidden = true;

    const close = el("button", { className: "secondary small close", text: "✕" });
    close.addEventListener("click", () => this.setOpen(false));
    this.root.append(el("div", { className: "craft-head" }, el("strong", { text: "🔨 คราฟต์" }), close));

    for (const id of RECIPE_IDS) {
      const chips = el("div", { className: "chips" });
      const button = el("button", { className: "small", text: "ทำ" });
      button.addEventListener("click", () => onCraft(id));
      this.root.append(
        el(
          "div",
          { className: "recipe" },
          iconElement(ITEM_ICONS[id]),
          el("div", { className: "info" }, el("strong", { text: recipeLabel(id) }), el("small", { text: RECIPE_HINTS[id] }), chips),
          button,
        ),
      );
      this.rows.set(id, { chips, button });
    }
    mount.append(this.toggle);
    uiRoot().append(this.root);
  }

  update(player: Player): void {
    this.lastPlayer = player;
    if (this.root.hidden) return; // ปิดอยู่ไม่ต้องวาด
    const has = (item: ItemId) => player.inventory.get(item) ?? 0;
    for (const [id, row] of this.rows) {
      row.chips.replaceChildren(
        ...costChips(has, id).map((c) =>
          el("span", { className: c.enough ? "chip" : "chip short", text: `${itemLabel(c.item)} ${c.have}/${c.need}` }),
        ),
      );
      const check = craftCheck(has, id);
      row.button.disabled = !check.ok;
      row.button.textContent = check.reason === "owned" ? "มีแล้ว" : check.reason === "full" ? "เต็ม" : "ทำ";
    }
  }

  close(): void {
    this.setOpen(false);
  }

  destroy(): void {
    this.toggle.remove();
    this.root.remove();
  }

  private setOpen(open: boolean) {
    if (open) this.onOpen();
    this.root.hidden = !open;
    if (open && this.lastPlayer) this.update(this.lastPlayer);
  }
}
