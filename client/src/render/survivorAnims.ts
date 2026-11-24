import Phaser from "phaser";
import { TEX } from "../art/textures";
import { OUTFITS, survivorIdOf } from "../art/hd/survivor";
import { walkFrames, type Facing } from "./facing";

const FACINGS: Facing[] = ["down", "up", "left", "right"];

/** ชื่อ animation ท่าเดิน */
export function walkAnimKey(id: string, facing: Facing): string {
  return `${TEX.survivor(id)}-walk-${facing}`;
}

/** สร้างท่าเดิน 4 ทิศให้ตัวละครทั้ง 8 แบบ (เรียกครั้งเดียวตอนเริ่มเกม) */
export function registerSurvivorAnims(scene: Phaser.Scene): void {
  for (const id of OUTFITS.map((_, i) => survivorIdOf(i))) {
    for (const facing of FACINGS) {
      const key = walkAnimKey(id, facing);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(TEX.survivor(id), { frames: walkFrames(facing) }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}
