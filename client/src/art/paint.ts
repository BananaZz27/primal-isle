import Phaser from "phaser";
import { parsePixelArt } from "./pixels";
import type { PixelCanvas } from "./hd/canvas";

/**
 * วาดภาพพิกเซลลงเป็น texture ของ Phaser ชื่อ `key`
 * ถ้าส่งหลายภาพมา (frames) จะเรียงต่อกันในแนวนอน — ใช้ทำแผ่นภาพ tileset
 */
export function paintTexture(
  scene: Phaser.Scene,
  key: string,
  frames: string[][],
  palette: Record<string, string>,
): void {
  const arts = frames.map((rows) => parsePixelArt(rows, palette));
  const w = arts[0].width;
  const h = arts[0].height;

  const texture = scene.textures.createCanvas(key, w * arts.length, h);
  if (!texture) throw new Error(`cannot create texture "${key}"`);
  const ctx = texture.context;

  arts.forEach((art, frame) => {
    art.pixels.forEach((colour, i) => {
      if (colour === null) return;
      ctx.fillStyle = colour;
      ctx.fillRect(frame * w + (i % w), Math.floor(i / w), 1, 1);
    });
  });

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
