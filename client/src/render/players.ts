import Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import type { Player } from "@primal/server/schema";
import { SURVIVOR_IDS, TEX } from "../art/ninjaAtlas";
import { CAMERA_ZOOM } from "../config";
import type { WorldRoom } from "../net/connection";
import { facingFrom, walkFrames, type Facing } from "./facing";
import { walkAnimKey } from "./survivorAnims";

interface PlayerView {
  player: Player;
  survivorId: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  facing: Facing;
  lastX: number;
  lastY: number;
}

/**
 * วาดผู้เล่นทุกคนตาม state ของห้อง: เพิ่ม/ลบตัวอัตโนมัติเมื่อมีคนเข้า/ออก
 * ตำแหน่งที่วาดได้จากฟังก์ชัน pos (ผลของระบบทำนาย) ไม่ใช่จาก state ตรงๆ
 * ท่าทาง (หันทิศ/เดิน/ยืน) ดูจากระยะที่ขยับระหว่างเฟรม จึงใช้ได้ทั้งตัวเราและเพื่อน
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
      const { facing, moving } = facingFrom(x - view.lastX, y - view.lastY, view.facing);
      view.lastX = x;
      view.lastY = y;

      if (moving) {
        view.sprite.play(walkAnimKey(view.survivorId, facing), true); // true = ถ้าเล่นท่านี้อยู่แล้วไม่ต้องเริ่มใหม่
      } else if (view.sprite.anims.isPlaying || facing !== view.facing) {
        view.sprite.stop();
        view.sprite.setFrame(walkFrames(facing)[0]); // ยืน = เฟรมแรกของทิศ
      }
      view.facing = facing;

      view.container.setPosition(Math.round(x), Math.round(y));
      view.container.setDepth(y); // อยู่ต่ำกว่าบนจอ = วาดทับ (รวมถึงต้นไม้)
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
    const survivorId = SURVIVOR_IDS[player.colorIndex % SURVIVOR_IDS.length];
    // จุดอ้างอิง = กลางลำตัว (ตรงกับกล่องชนของ stepPlayer), เท้าอยู่ต่ำลงมา
    const sprite = this.scene.add.sprite(0, 0, TEX.survivor(survivorId), walkFrames("down")[0]).setOrigin(0.5, 0.75);

    const label = this.scene.add
      .text(0, -13, player.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "7px",
        color: isSelf ? "#ffe680" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setResolution(CAMERA_ZOOM * 2); // ให้ตัวหนังสือคมแม้กล้องซูม

    const container = this.scene.add.container(player.x, player.y, [sprite, label]);
    this.views.set(sessionId, {
      player,
      survivorId,
      container,
      sprite,
      facing: "down",
      lastX: player.x,
      lastY: player.y,
    });
  }

  private remove(sessionId: string) {
    this.views.get(sessionId)?.container.destroy();
    this.views.delete(sessionId);
  }
}
