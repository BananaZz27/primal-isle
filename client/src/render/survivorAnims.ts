import Phaser from "phaser";
import { TEX } from "../art/textures";
import { OUTFITS, survivorSheet } from "../art/hd/survivor";
import { paintHdSheet } from "../art/paint";
import { walkFrames, type Facing } from "./facing";

const FACINGS: Facing[] = ["down", "up", "left", "right"];

/** ชื่อ animation ท่าเดิน */
export function walkAnimKey(id: string, facing: Facing): string {
  return `${TEX.survivor(id)}-walk-${facing}`;
}

/**
 * เตรียมภาพ + ท่าเดิน 4 ทิศของชุดนี้ ครั้งแรกที่มีผู้เล่นใส่ชุดนี้โผล่มา
 * (วาดตอนต้องใช้ ไม่วาดทั้ง 8 ชุดตอนเปิดเกม — เปิดเกมเร็วขึ้นบนมือถือ)
 */
export function ensureSurvivor(scene: Phaser.Scene, id: string): void {
  const key = TEX.survivor(id);
  if (!scene.textures.exists(key)) paintHdSheet(scene, key, survivorSheet(OUTFITS[Number(id) % OUTFITS.length]), 32, 32);
  for (const facing of FACINGS) {
    const anim = walkAnimKey(id, facing);
    if (scene.anims.exists(anim)) continue;
    scene.anims.create({
      key: anim,
      frames: scene.anims.generateFrameNumbers(key, { frames: walkFrames(facing) }),
      frameRate: 8,
      repeat: -1,
    });
  }
}
