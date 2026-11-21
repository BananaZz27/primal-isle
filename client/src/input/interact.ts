import Phaser from "phaser";
import { BALANCE, inReach, nodeDef, TILE_SIZE, touchesWater, type Decor, type WorldMap } from "@primal/shared";
import { el, uiRoot } from "../ui/dom";
import { RepeatGate } from "./repeatGate";

export type Target = { kind: "node"; id: number } | { kind: "water" } | null;

/**
 * เลือกสิ่งที่จะโต้ตอบเมื่อกดปุ่ม: ทรัพยากรที่ใกล้ที่สุดในระยะเอื้อม (ที่ยังไม่หมด)
 * ไม่มี → ถ้าติดน้ำ = ดื่ม · ไม่มีอะไรเลย → null
 */
export function pickTarget(
  px: number,
  py: number,
  decor: Decor[],
  map: WorldMap,
  isDepleted: (id: number) => boolean,
): Target {
  let best: { id: number; dist: number } | null = null;
  decor.forEach((d, id) => {
    if (!nodeDef(d.kind) || isDepleted(id) || !inReach(px, py, d.tx, d.ty)) return;
    const dist = Math.hypot(px - (d.tx + 0.5) * TILE_SIZE, py - (d.ty + 0.5) * TILE_SIZE);
    if (!best || dist < best.dist) best = { id, dist };
  });
  if (best) return { kind: "node", id: (best as { id: number }).id };
  return touchesWater(map, px, py) ? { kind: "water" } : null;
}

/** เว้นช่วงระหว่างการกดค้าง (ยาวกว่าคูลดาวน์ของเซิร์ฟเวอร์นิดหน่อย จะได้ไม่โดนเมิน) */
const REPEAT_MS = BALANCE.gatherCooldownMs + 30;

/**
 * ปุ่มโต้ตอบ: Space หรือ E บนคอม, ปุ่ม ✋ มุมขวาล่างบนจอสัมผัส
 * กดค้างได้ — จะเรียก onAct ซ้ำทุก REPEAT_MS
 * ปุ่ม ✋ รับนิ้วแยกจาก joystick (pointer คนละตัว) จึงกดพร้อมกับเดินได้
 */
export class InteractControls {
  private held = false;
  private gate = new RepeatGate(REPEAT_MS);
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private button: HTMLButtonElement | null = null;

  constructor(
    scene: Phaser.Scene,
    touch: boolean,
    private onAct: () => void,
  ) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = [kb.addKey("SPACE"), kb.addKey("E")];
      for (const k of this.keys) k.on("down", () => this.gate.press());
    }

    if (touch) {
      const button = el("button", { className: "panel act-button", text: "✋" });
      button.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.held = true;
        this.gate.press();
      });
      for (const ev of ["pointerup", "pointercancel", "pointerleave"] as const)
        button.addEventListener(ev, () => (this.held = false));
      uiRoot().append(button);
      this.button = button;
    }
  }

  /** เรียกทุกเฟรม */
  update(now: number): void {
    const held = this.held || this.keys.some((k) => k.isDown);
    if (this.gate.update(now, held)) this.onAct();
  }

  destroy(): void {
    this.button?.remove();
  }
}
