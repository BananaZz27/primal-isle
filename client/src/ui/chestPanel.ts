import { BALANCE, inPlaceReach, ITEM_IDS, type ItemId } from "@primal/shared";
import { ITEM_ICONS } from "../art/ninjaAtlas";
import { el, uiRoot } from "./dom";
import { iconElement } from "./icons";
import { itemLabel } from "./labels";

type CountMap = { get(id: string): number | undefined } | undefined;

/** ของที่มี (จำนวน > 0) เรียงตามลำดับช่องกระเป๋า — ใช้ทั้งฝั่งกระเป๋าและฝั่งกล่อง */
export function slotList(counts: CountMap): [ItemId, number][] {
  if (!counts) return [];
  const out: [ItemId, number][] = [];
  for (const id of ITEM_IDS) {
    const n = counts.get(id) ?? 0;
    if (n > 0) out.push([id, n]);
  }
  return out;
}

export const chestTitle = (kinds: number): string => `📦 กล่องเก็บของ (${kinds}/${BALANCE.chestKinds} ชนิด)`;

/** หน้าต่างยังเปิดต่อได้ไหม: กล่องยังอยู่ และยืนในระยะเดียวกับที่เซิร์ฟเวอร์ยอมให้ย้ายของ (32px) */
export function chestStillOpen(px: number, py: number, chest: { tx: number; ty: number } | undefined): boolean {
  return !!chest && inPlaceReach(px, py, chest.tx, chest.ty);
}

export type ChestDir = "put" | "take";

/**
 * หน้าต่างกล่องเก็บของ: ซ้าย = กระเป๋า · ขวา = กล่อง
 * แตะของ = ย้ายทั้งกองไปอีกฝั่ง (เซิร์ฟเวอร์ตัดให้ไม่เกิน 99 / ไม่เกินจำนวนชนิดที่กล่องรับได้)
 * ทุกคนในโลกใช้กล่องร่วมกัน — หน้าต่างอัปเดตตาม state เมื่อคนอื่นหยิบ/ใส่
 */
export class ChestPanel {
  private root = el("div", { className: "panel chest" });
  private title = el("strong");
  private bagGrid = el("div", { className: "chest-grid" });
  private boxGrid = el("div", { className: "chest-grid" });
  private key: string | null = null;
  /** สิ่งที่วาดอยู่ — วาดใหม่เฉพาะตอนเปลี่ยน (ไม่งั้นปุ่มใต้นิ้วถูกสร้างใหม่ทุก 200ms) */
  private drawn = "";

  constructor(private onMove: (key: string, item: ItemId, n: number, dir: ChestDir) => void) {
    const close = el("button", { className: "secondary small close", text: "✕" });
    close.addEventListener("click", () => this.close());
    this.root.append(
      el("div", { className: "craft-head" }, this.title, close),
      el(
        "div",
        { className: "chest-sides" },
        el("div", { className: "chest-side" }, el("small", { text: "🎒 กระเป๋า (แตะ = ใส่กล่อง)" }), this.bagGrid),
        el("div", { className: "chest-side" }, el("small", { text: "📦 ในกล่อง (แตะ = หยิบ)" }), this.boxGrid),
      ),
    );
    this.root.hidden = true;
    uiRoot().append(this.root);
  }

  /** key ของกล่องที่เปิดอยู่ (null = ปิด) */
  get openKey(): string | null {
    return this.key;
  }

  open(key: string): void {
    if (this.key === key) return; // กดค้าง ✋ ข้างกล่อง = เปิดซ้ำ ไม่ต้องวาดใหม่
    this.key = key;
    this.drawn = "";
    this.root.hidden = false;
  }

  close(): void {
    this.key = null;
    this.root.hidden = true;
  }

  /** เรียกเป็นระยะตอนเปิดอยู่ */
  update(bag: CountMap, box: CountMap): void {
    if (this.key === null) return;
    const mine = slotList(bag);
    const stored = slotList(box);
    const sig = JSON.stringify([this.key, mine, stored]);
    if (sig === this.drawn) return;
    this.drawn = sig;
    this.title.textContent = chestTitle(stored.length);
    this.bagGrid.replaceChildren(...this.slots(mine, "put"));
    this.boxGrid.replaceChildren(...this.slots(stored, "take"));
    if (stored.length === 0) this.boxGrid.append(el("small", { className: "empty-note", text: "ว่าง" }));
  }

  destroy(): void {
    this.root.remove();
  }

  private slots(list: [ItemId, number][], dir: ChestDir): HTMLElement[] {
    return list.map(([id, n]) => {
      const slot = el("button", { className: "slot" }, iconElement(ITEM_ICONS[id]), el("span", { className: "count", text: String(n) }));
      slot.title = `${itemLabel(id)} ×${n}`;
      slot.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (this.key !== null) this.onMove(this.key, id, n, dir);
      });
      return slot;
    });
  }
}
