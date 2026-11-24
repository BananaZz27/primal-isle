import Phaser from "phaser";
import type { PixelCanvas } from "./hd/canvas";

/** วาดแผ่นภาพ HD ที่เป็นตาราง (ช่องละ frameW × frameH) — เฟรมเรียงแถวต่อแถว 0, 1, 2, … */
export function paintHdSheet(scene: Phaser.Scene, key: string, sheet: PixelCanvas, frameW: number, frameH: number): void {
  const texture = scene.textures.createCanvas(key, sheet.width, sheet.height);
  if (!texture) throw new Error(`cannot create texture "${key}"`);
  texture.context.putImageData(new ImageData(new Uint8ClampedArray(sheet.data), sheet.width, sheet.height), 0, 0);
  const cols = sheet.width / frameW;
  for (let i = 0; i < cols * (sheet.height / frameH); i++) texture.add(i, 0, (i % cols) * frameW, Math.floor(i / cols) * frameH, frameW, frameH);
  texture.refresh();
}

/**
 * วาดภาพ HD (RGBA จากชุดเครื่องมือ art/hd) เป็น texture ชื่อ `key` — หลายภาพเรียงแนวนอน เป็นเฟรม 0, 1, …
 * (ภาพ HD ทุกภาพต้องแสดงที่ scale HD_SCALE)
 */
export function paintHdFrames(scene: Phaser.Scene, key: string, frames: PixelCanvas[]): void {
  const { width: w, height: h } = frames[0];
  const texture = scene.textures.createCanvas(key, w * frames.length, h);
  if (!texture) throw new Error(`cannot create texture "${key}"`);
  frames.forEach((f, i) => {
    texture.context.putImageData(new ImageData(new Uint8ClampedArray(f.data), w, h), i * w, 0);
    texture.add(i, 0, i * w, 0, w, h);
  });
  texture.refresh();
}
