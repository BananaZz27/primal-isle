import Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import { TILE_SIZE } from "@primal/shared";
import type { Crate } from "@primal/server/schema";
import { TEX } from "../art/ninjaAtlas";
import { HD_SCALE } from "../display";
import type { OnTile } from "../input/interact";
import type { WorldRoom } from "../net/connection";

/**
 * วาดกล่องเสบียง (ลังมีร่มชูชีพ) ตาม state.crates — เพิ่ม/ลบอัตโนมัติ
 * กล่องที่ตกใหม่ระหว่างเล่นเรียก onNewCrate (ใช้แจ้งข้อความ) · กล่องที่มีอยู่แล้วตอนเข้าโลกไม่แจ้ง
 */
export class CrateView {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private crates = new Map<string, OnTile>();
  private unsubscribe: Array<() => void> = [];
  private announce = false;

  constructor(
    private scene: Phaser.Scene,
    room: WorldRoom,
    private onNewCrate: () => void,
  ) {
    const callbacks = Callbacks.get(room as any) as any;
    this.unsubscribe.push(
      callbacks.onAdd("crates", (c: Crate, key: string) => this.add(key, c)),
      callbacks.onRemove("crates", (_c: Crate, key: string) => this.remove(key)),
    );
    // onAdd เรียกกล่องที่มีอยู่แล้วทันทีตอนลงทะเบียน — หลังจากนี้ = กล่องที่เพิ่งตก
    this.announce = true;
  }

  list(): OnTile[] {
    return [...this.crates.values()];
  }

  has(key: string): boolean {
    return this.crates.has(key);
  }

  destroy(): void {
    this.unsubscribe.forEach((off) => off());
    this.images.forEach((i) => i.destroy());
    this.images.clear();
    this.crates.clear();
  }

  private add(key: string, c: Crate) {
    if (this.images.has(key)) return;
    const baseY = (c.ty + 1) * TILE_SIZE;
    const img = this.scene.add.image(c.tx * TILE_SIZE + TILE_SIZE / 2, baseY, TEX.crate).setOrigin(0.5, 1).setScale(HD_SCALE).setDepth(baseY);
    // ร่มชูชีพแกว่งเบาๆ ให้สังเกตเห็นง่าย
    this.scene.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.images.set(key, img);
    this.crates.set(key, { key, tx: c.tx, ty: c.ty });
    if (this.announce) this.onNewCrate();
  }

  private remove(key: string) {
    const img = this.images.get(key);
    if (img) {
      this.scene.tweens.killTweensOf(img);
      img.destroy();
    }
    this.images.delete(key);
    this.crates.delete(key);
  }
}
