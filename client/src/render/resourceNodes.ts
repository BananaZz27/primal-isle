import Phaser from "phaser";
import { HD_SCALE, textResolution } from "../display";
import { Callbacks } from "@colyseus/sdk";
import { DecorKind, nodeDef, TILE_SIZE, type Decor } from "@primal/shared";
import type { NodeState } from "@primal/server/schema";
import { TEX } from "../art/ninjaAtlas";
import type { WorldRoom } from "../net/connection";
import { itemLabel } from "../ui/labels";
import { nodeChange } from "./nodeChange";

interface NodeView {
  decor: Decor;
  image: Phaser.GameObjects.Image;
  hp: number | null; // null = เต็ม (ยังไม่เคยถูกตี)
}

/**
 * วาดทรัพยากร (ต้นไม้ หิน พุ่มไม้ กอหญ้า) และเปลี่ยนหน้าตาตาม state จากเซิร์ฟเวอร์
 * - ถูกตี: สั่น + ตัวเลข "+1 ไม้" ลอยขึ้น
 * - หมด: ต้นไม้เหลือตอ, หิน/กอหญ้าหายไป, พุ่มไม้จางลง
 * - งอกคืน (เซิร์ฟเวอร์ลบออกจาก nodes): กลับเป็นปกติ
 */
export class ResourceView {
  private views = new Map<number, NodeView>();
  private unsubscribe: Array<() => void> = [];
  /** false ระหว่างรับ state เดิมตอนเพิ่งเข้าโลก (onAdd เล่นย้อนของที่มีอยู่แล้วทันที) */
  private live = false;

  constructor(
    private scene: Phaser.Scene,
    decor: Decor[],
    room: WorldRoom,
  ) {
    decor.forEach((d, id) => {
      if (nodeDef(d.kind)) this.views.set(id, { decor: d, image: this.createImage(d), hp: null });
    });

    const callbacks = Callbacks.get(room as any) as any;
    this.unsubscribe.push(
      callbacks.onAdd("nodes", (node: NodeState, key: string) => {
        this.setHp(Number(key), node.hp);
        this.unsubscribe.push(callbacks.listen(node, "hp", (hp: number) => this.setHp(Number(key), hp)));
      }),
      callbacks.onRemove("nodes", (_node: NodeState, key: string) => this.setHp(Number(key), null)),
    );
    this.live = true; // จากนี้ไปทุกการเปลี่ยนคือของจริงที่เพิ่งเกิด
  }

  destroy() {
    this.unsubscribe.forEach((off) => off());
    this.views.forEach((v) => v.image.destroy());
    this.views.clear();
  }

  private createImage(d: Decor): Phaser.GameObjects.Image {
    const x = d.tx * TILE_SIZE + TILE_SIZE / 2;
    const baseY = (d.ty + 1) * TILE_SIZE; // โคน = ขอบล่างของช่อง
    // ภาพ HD วาดโคนที่ขอบล่าง (เงาเลยลงมานิดหน่อยเหมือนภาพเดิม)
    const image = this.scene.add.image(x, baseY + 2, this.fullTexture(d)).setScale(HD_SCALE);
    // เรียงลึกตามโคน: ผู้เล่นที่อยู่ "หลัง" จะถูกบัง
    return image.setOrigin(0.5, 1).setDepth(baseY);
  }

  /** ภาพตอนยังเก็บได้ */
  private fullTexture(d: Decor): string {
    switch (d.kind) {
      case DecorKind.Tree:
        return TEX.hd.tree(d.variant);
      case DecorKind.Bush:
        return TEX.hd.bush(true);
      case DecorKind.Pebble:
        return TEX.hd.rock(d.variant);
      default:
        return TEX.hd.tuft;
    }
  }

  private setHp(id: number, hp: number | null) {
    const view = this.views.get(id);
    if (!view) return;
    const { hit, depleted } = nodeChange(view.hp, hp, nodeDef(view.decor.kind)!.hits, this.live);
    view.hp = hp;
    if (hit) this.hitFeedback(view);
    this.applyLook(view, depleted);
  }

  private applyLook(view: NodeView, depleted: boolean) {
    const { image, decor } = view;
    switch (decor.kind) {
      case DecorKind.Tree:
        image.setTexture(depleted ? TEX.hd.stump : TEX.hd.tree(decor.variant));
        break;
      case DecorKind.Bush:
        image.setTexture(TEX.hd.bush(!depleted)); // เก็บหมด = พุ่มไม่มีผล
        break;
      default:
        image.setVisible(!depleted);
    }
  }

  private hitFeedback(view: NodeView) {
    const { image, decor } = view;
    const x = image.x;
    this.scene.tweens.add({ targets: image, x: x + 1.5, duration: 40, yoyo: true, repeat: 1, onComplete: () => image.setX(x) });

    const def = nodeDef(decor.kind)!;
    const text = this.scene.add
      .text(x, image.y - image.displayHeight, `+1 ${itemLabel(def.item)}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "7px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setResolution(textResolution())
      .setDepth(100000);
    this.scene.tweens.add({ targets: text, y: text.y - 10, alpha: 0, duration: 800, onComplete: () => text.destroy() });
  }
}
