import type { Player } from "@primal/server/schema";
import { STAT_ICONS } from "../art/ninjaAtlas";
import { el, uiRoot } from "./dom";
import { iconElement } from "./icons";

/** แปลงค่า 0..100 เป็นเปอร์เซ็นต์ความยาวแถบ (ปัดเศษ, กันค่าหลุดช่วง) */
export function barPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

const STATS = [
  { key: "health", label: "เลือด", colour: "#e74c3c" },
  { key: "hunger", label: "ความอิ่ม", colour: "#e67e22" },
  { key: "thirst", label: "น้ำ", colour: "#3498db" },
] as const;

/** แถบเลือด/ความอิ่ม/น้ำ มุมซ้ายบน + ข้อความตอนสลบแล้วฟื้น */
export class StatsHud {
  private root = el("div", { className: "panel stats" });
  private fills = new Map<string, HTMLElement>();
  private lastHealth = 100;

  constructor() {
    for (const s of STATS) {
      const fill = el("div", { className: "fill" });
      fill.style.background = s.colour;
      const bar = el("div", { className: "bar" }, fill);
      bar.title = s.label;
      this.root.append(el("div", { className: "stat" }, iconElement(STAT_ICONS[s.key]), bar));
      this.fills.set(s.key, fill);
    }
    uiRoot().append(this.root);
  }

  update(player: Player): void {
    for (const s of STATS) {
      const pct = barPercent(player[s.key]);
      const fill = this.fills.get(s.key)!;
      fill.style.width = `${pct}%`;
      fill.classList.toggle("low", pct <= 20);
    }
    // เลือดเกือบหมดแล้วกลับมาเต็ม = เพิ่งสลบแล้วฟื้นที่จุดเกิด
    if (this.lastHealth < 5 && player.health >= 99) toast("😵 สลบไป… ฟื้นที่จุดเกิดแล้ว");
    this.lastHealth = player.health;
  }

  destroy(): void {
    this.root.remove();
  }
}

/** ข้อความสั้นกลางจอ หายเองใน 2.5 วินาที */
export function toast(message: string): void {
  const box = el("div", { className: "toast", text: message });
  uiRoot().append(box);
  setTimeout(() => box.remove(), 2500);
}
