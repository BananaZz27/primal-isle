import Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import { TILE_SIZE } from "@primal/shared";
import type { Structure } from "@primal/server/schema";
import { TEX } from "../art/ninjaAtlas";
import type { WorldRoom } from "../net/connection";

/** ชื่อ animation เปลวไฟ */
export const CAMPFIRE_ANIM = "campfire-burn";

/** วาดสิ่งที่ผู้เล่นวางไว้ (กองไฟ) ตาม state.structures — เพิ่ม/ลบอัตโนมัติ */
export class StructureView {
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private unsubscribe: Array<() => void> = [];

  constructor(
    private scene: Phaser.Scene,
    room: WorldRoom,
  ) {
    const callbacks = Callbacks.get(room as any) as any;
    this.unsubscribe.push(
      callbacks.onAdd("structures", (s: Structure, key: string) => this.add(key, s)),
      callbacks.onRemove("structures", (_s: Structure, key: string) => {
        this.sprites.get(key)?.destroy();
        this.sprites.delete(key);
      }),
    );
  }

  /** ตำแหน่งกองไฟทั้งหมด (ใช้หาว่ายืนใกล้กองไฟไหม) */
  campfires(): { tx: number; ty: number }[] {
    return [...this.sprites.values()].map((s) => s.getData("tile") as { tx: number; ty: number });
  }

  destroy(): void {
    this.unsubscribe.forEach((off) => off());
    this.sprites.forEach((s) => s.destroy());
    this.sprites.clear();
  }

  private add(key: string, s: Structure) {
    const baseY = (s.ty + 1) * TILE_SIZE;
    const sprite = this.scene.add
      .sprite(s.tx * TILE_SIZE + TILE_SIZE / 2, baseY, TEX.campfire, 0)
      .setOrigin(0.5, 1)
      .setDepth(baseY)
      .setData("tile", { tx: s.tx, ty: s.ty });
    sprite.play(CAMPFIRE_ANIM);
    this.sprites.set(key, sprite);
  }
}
