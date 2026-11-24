import Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import { dinoDef, isDinoKind } from "@primal/shared";
import type { Dino } from "@primal/server/schema";
import { TEX } from "../art/ninjaAtlas";
import { textResolution } from "../display";
import { tamedTagY } from "./labelLayout";
import type { DinoOnScreen } from "../input/feed";
import type { WorldRoom } from "../net/connection";

/** ชื่อ animation เดินของไดโนชนิดนี้ (สร้างใน BootScene) */
export const dinoWalkAnim = (kind: string) => `dino-walk-${kind}`;

interface DinoSprite {
  dino: Dino;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  bar: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Text;
  lastX: number;
  lastY: number;
  lastHp: number;
  flashUntil: number;
  /** ตำแหน่งที่วาดล่าสุด (ใช้เลือกเป้าตี/ป้อน ให้ตรงกับที่ผู้เล่นเห็น) */
  x: number;
  y: number;
}

/**
 * วาดไดโนทุกตัวตาม state: เพิ่ม/ลบอัตโนมัติ, หันซ้าย/ขวาตาม facing, เดิน = เล่นท่าเดิน
 * แถบเลือดขึ้นเมื่อเลือดไม่เต็ม · ตัวที่เทมแล้วมีป้าย ❤️ ชื่อเจ้าของใต้เท้า · โดนตีแล้วกะพริบขาว
 */
export class DinoView {
  private views = new Map<string, DinoSprite>();
  private unsubscribe: Array<() => void> = [];

  constructor(
    private scene: Phaser.Scene,
    room: WorldRoom,
  ) {
    const callbacks = Callbacks.get(room as any) as any;
    this.unsubscribe.push(
      callbacks.onAdd("dinos", (dino: Dino, key: string) => this.add(key, dino)),
      callbacks.onRemove("dinos", (_dino: Dino, key: string) => this.remove(key)),
    );
  }

  /** เรียกทุกเฟรม — pos = ตำแหน่งที่เกลี่ยแล้ว */
  update(now: number, pos: (d: Dino) => { x: number; y: number }) {
    for (const v of this.views.values()) {
      const { x, y } = pos(v.dino);
      const moving = Math.hypot(x - v.lastX, y - v.lastY) > 0.05;
      v.lastX = x;
      v.lastY = y;
      v.x = x;
      v.y = y;
      if (moving) v.sprite.play(dinoWalkAnim(v.dino.kind), true);
      else if (v.sprite.anims.isPlaying) {
        v.sprite.stop();
        v.sprite.setFrame(0);
      }
      v.sprite.setFlipX(v.dino.facing < 0); // ภาพหันขวา → หันซ้าย = กลับภาพ

      if (v.dino.hp < v.lastHp) v.flashUntil = now + 120;
      v.lastHp = v.dino.hp;
      if (now < v.flashUntil) v.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else v.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);

      this.drawBar(v);
      v.tag.setText(v.dino.owner ? `❤️ ${v.dino.owner}` : "");
      v.container.setPosition(Math.round(x), Math.round(y));
      v.container.setDepth(y);
    }
  }

  /** ไดโนบนจอ (ตำแหน่งตามที่เห็น) — ใช้เลือกเป้าตี/ป้อน */
  list(): DinoOnScreen[] {
    return [...this.views.entries()].map(([key, v]) => ({ key, kind: v.dino.kind, x: v.x, y: v.y, owner: v.dino.owner }));
  }

  destroy() {
    this.unsubscribe.forEach((off) => off());
    this.views.forEach((v) => v.container.destroy());
    this.views.clear();
  }

  private add(key: string, dino: Dino) {
    if (!isDinoKind(dino.kind)) return;
    const half = dinoDef(dino.kind).half;
    // จุดอ้างอิง = กลางกล่องชน; เท้าอยู่ต่ำกว่าเล็กน้อย
    const sprite = this.scene.add.sprite(0, 0, TEX.dino(dino.kind), 0).setOrigin(0.5, 0.65);
    const bar = this.scene.add.graphics();
    const tag = this.scene.add
      .text(0, tamedTagY(half), "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "6px",
        color: "#ffd0e0",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setResolution(textResolution());
    const container = this.scene.add.container(dino.x, dino.y, [sprite, bar, tag]);
    this.views.set(key, {
      dino,
      container,
      sprite,
      bar,
      tag,
      lastX: dino.x,
      lastY: dino.y,
      lastHp: dino.hp,
      flashUntil: 0,
      x: dino.x,
      y: dino.y,
    });
  }

  private drawBar(v: DinoSprite) {
    v.bar.clear();
    if (!isDinoKind(v.dino.kind)) return;
    const def = dinoDef(v.dino.kind);
    if (v.dino.hp >= def.hp) return;
    const w = Math.max(10, def.half * 2);
    const top = -def.half - 6;
    v.bar.fillStyle(0x000000, 0.6).fillRect(-w / 2 - 1, top - 1, w + 2, 4);
    v.bar.fillStyle(v.dino.owner ? 0x6ad06a : 0xe04848).fillRect(-w / 2, top, (w * v.dino.hp) / def.hp, 2);
  }

  private remove(key: string) {
    this.views.get(key)?.container.destroy();
    this.views.delete(key);
  }
}
