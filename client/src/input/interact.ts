import Phaser from "phaser";
import { BALANCE, dinoDef, dinoInReach, inReach, isDinoKind, nodeDef, TILE_SIZE, touchesWater, type Decor, type WorldMap } from "@primal/shared";
import type { DinoOnScreen } from "./feed";
import { el, uiRoot } from "../ui/dom";
import { RepeatGate } from "./repeatGate";
import { nearestInReach } from "./building";

export type Target =
  | { kind: "drop"; key: string }
  | { kind: "crate"; key: string }
  | { kind: "dino"; key: string }
  | { kind: "chest"; key: string }
  | { kind: "node"; id: number }
  | { kind: "campfire" }
  | { kind: "water" }
  | null;

/** ของที่อยู่บนช่อง มี key ใน state */
export interface OnTile {
  key: string;
  tx: number;
  ty: number;
}

/** สิ่งรอบตัวที่ใช้เลือกเป้า (ตำแหน่งตามที่เห็นบนจอ) — ช่องที่ไม่ใส่ = ไม่มี */
export interface PickWorld {
  decor: Decor[];
  map: WorldMap;
  /** ทรัพยากร id นี้ถูกเก็บหมดอยู่ไหม */
  isDepleted: (id: number) => boolean;
  campfires?: { tx: number; ty: number }[];
  /** มีของให้ย่างไหม (ผลไม้/เนื้อ) */
  canCook?: boolean;
  /** ถุงของที่ตก */
  drops?: OnTile[];
  /** กล่องเสบียง */
  crates?: OnTile[];
  dinos?: DinoOnScreen[];
  /** กล่องเก็บของ */
  chests?: OnTile[];
}

/**
 * เลือกสิ่งที่จะโต้ตอบเมื่อกดปุ่ม ตามลำดับ:
 * 0) ถุงของที่ตกอยู่ในระยะ (เก็บคืนก่อนอย่างอื่น)
 * 1) กล่องเสบียงในระยะ (เปิด — ของหายเองถ้าช้า)
 * 2) ไดโนป่าที่ใกล้ที่สุดในระยะ (ตี) — ตัวที่เทมแล้วไม่นับ
 * 3) กล่องเก็บของในระยะ (เปิดหน้าต่าง)
 * 4) ทรัพยากรที่ใกล้ที่สุดในระยะเอื้อม (ที่ยังไม่หมด)
 * 5) กองไฟในระยะ — เฉพาะเมื่อมีของให้ย่าง (ผลไม้/เนื้อ)
 * 6) น้ำในระยะ = ดื่ม · ไม่มีอะไรเลย → null
 * ทุกอย่างใช้ระยะเอื้อม 24px (เท่าที่เซิร์ฟเวอร์ตรวจ หรือสั้นกว่า) จึงกดแล้วเซิร์ฟเวอร์ยอมเสมอ
 */
export function pickTarget(px: number, py: number, w: PickWorld): Target {
  const bag = nearestInReach(px, py, w.drops ?? []);
  if (bag) return { kind: "drop", key: bag.key };

  const crate = nearestInReach(px, py, w.crates ?? []);
  if (crate) return { kind: "crate", key: crate.key };

  let prey: { key: string; dist: number } | null = null;
  for (const d of w.dinos ?? []) {
    if (d.owner !== "" || !isDinoKind(d.kind) || !dinoInReach(px, py, d.x, d.y, dinoDef(d.kind).half)) continue;
    const dist = Math.hypot(px - d.x, py - d.y);
    if (!prey || dist < prey.dist) prey = { key: d.key, dist };
  }
  if (prey) return { kind: "dino", key: prey.key };

  const chest = nearestInReach(px, py, w.chests ?? []);
  if (chest) return { kind: "chest", key: chest.key };

  let best: { id: number; dist: number } | null = null;
  w.decor.forEach((d, id) => {
    if (!nodeDef(d.kind) || w.isDepleted(id) || !inReach(px, py, d.tx, d.ty)) return;
    const dist = Math.hypot(px - (d.tx + 0.5) * TILE_SIZE, py - (d.ty + 0.5) * TILE_SIZE);
    if (!best || dist < best.dist) best = { id, dist };
  });
  if (best) return { kind: "node", id: (best as { id: number }).id };
  if (w.canCook && (w.campfires ?? []).some((c) => inReach(px, py, c.tx, c.ty))) return { kind: "campfire" };
  return touchesWater(w.map, px, py) ? { kind: "water" } : null;
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
