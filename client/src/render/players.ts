import Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import type { Player } from "@primal/server/schema";
import { SHIRT_COLOURS } from "../art/palette";
import { CAMERA_ZOOM } from "../config";
import type { WorldRoom } from "../net/connection";

interface PlayerView {
  player: Player;
  container: Phaser.GameObjects.Container;
}

/**
 * วาดผู้เล่นทุกคนตาม state ของห้อง: เพิ่ม/ลบตัวอัตโนมัติเมื่อมีคนเข้า/ออก
 * ตำแหน่งที่วาดได้จากฟังก์ชัน pos (ผลของระบบทำนาย) ไม่ใช่จาก state ตรงๆ
 */
export class PlayerSprites {
  private views = new Map<string, PlayerView>();
  private unsubscribe: Array<() => void> = [];

  constructor(
    private scene: Phaser.Scene,
    room: WorldRoom,
  ) {
    const callbacks = Callbacks.get(room as any) as any;
    this.unsubscribe.push(
      callbacks.onAdd("players", (player: Player, sessionId: string) =>
        this.add(sessionId, player, sessionId === room.sessionId),
      ),
      callbacks.onRemove("players", (_player: Player, sessionId: string) => this.remove(sessionId)),
    );
  }

  /** เรียกทุกเฟรม */
  update(pos: (p: Player) => { x: number; y: number }) {
    for (const view of this.views.values()) {
      const { x, y } = pos(view.player);
      view.container.setPosition(Math.round(x), Math.round(y));
      view.container.setDepth(y); // อยู่ต่ำกว่าบนจอ = วาดทับ
    }
  }

  /** container ของผู้เล่นคนนี้ (ใช้ให้กล้องตาม) */
  get(sessionId: string): Phaser.GameObjects.Container | undefined {
    return this.views.get(sessionId)?.container;
  }

  destroy() {
    this.unsubscribe.forEach((off) => off());
    this.views.forEach((v) => v.container.destroy());
    this.views.clear();
  }

  private add(sessionId: string, player: Player, isSelf: boolean) {
    // จุดอ้างอิง = กลางลำตัว (ตรงกับกล่องชนของ stepPlayer), เท้าอยู่ต่ำลงมา
    const body = this.scene.add.image(0, 0, "survivor").setOrigin(0.5, 0.7);
    const shirt = this.scene.add
      .image(0, 0, "survivor-shirt")
      .setOrigin(0.5, 0.7)
      .setTint(SHIRT_COLOURS[player.colorIndex % SHIRT_COLOURS.length]);

    const label = this.scene.add
      .text(0, -14, player.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "7px",
        color: isSelf ? "#ffe680" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setResolution(CAMERA_ZOOM * 2); // ให้ตัวหนังสือคมแม้กล้องซูม

    const container = this.scene.add.container(player.x, player.y, [body, shirt, label]);
    this.views.set(sessionId, { player, container });
  }

  private remove(sessionId: string) {
    this.views.get(sessionId)?.container.destroy();
    this.views.delete(sessionId);
  }
}
