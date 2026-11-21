import Phaser from "phaser";
import type { Axis, MoveDir } from "./joystick";

/** อ่านทิศเดินจากคีย์บอร์ด: WASD หรือปุ่มลูกศร (ปุ่มตรงข้ามกดพร้อมกัน = หักล้างกัน) */
export class KeyboardInput {
  private keys: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key> | null;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    this.keys = kb
      ? (kb.addKeys({
          up: "UP",
          down: "DOWN",
          left: "LEFT",
          right: "RIGHT",
          w: "W",
          a: "A",
          s: "S",
          d: "D",
        }) as KeyboardInput["keys"])
      : null;
  }

  read(): MoveDir {
    const k = this.keys;
    if (!k) return { moveX: 0, moveY: 0 };
    return {
      moveX: axis(k.left.isDown || k.a.isDown, k.right.isDown || k.d.isDown),
      moveY: axis(k.up.isDown || k.w.isDown, k.down.isDown || k.s.isDown),
    };
  }
}

function axis(negative: boolean, positive: boolean): Axis {
  if (negative === positive) return 0;
  return negative ? -1 : 1;
}
