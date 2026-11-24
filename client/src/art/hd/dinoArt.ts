import { drawDino } from "./dinoRig";
import { PixelCanvas } from "./canvas";
import { SPECIES, type SpeciesId } from "./species";

/** ภาพไดโนที่พร้อมใช้ในเกม: 2 เฟรมจัดกึ่งกลาง + แถวบนสุดที่มีภาพ (ใช้วางหลอดเลือด/ป้าย) */
export interface DinoArt {
  frames: [PixelCanvas, PixelCanvas];
  /** แถวแรก (texel) ที่มีภาพ */
  top: number;
  groundY: number;
}

const cache = new Map<SpeciesId, DinoArt>();

/**
 * วาดไดโนชนิดนี้ (จำผลไว้ — ใช้ทั้งตอนสร้าง texture และตอนคำนวณตำแหน่งป้าย)
 * - เลื่อนภาพแนวนอนให้กล่องภาพอยู่กลาง canvas: Phaser กลับภาพรอบกลาง texture
 *   ถ้าภาพไม่อยู่กลาง ไดโนจะกระโดดไปข้างทุกครั้งที่หันกลับ
 * - ทั้ง 2 เฟรมเลื่อนเท่ากัน (ไม่งั้นท่าเดินสั่น)
 */
export function dinoArt(id: SpeciesId): DinoArt {
  const hit = cache.get(id);
  if (hit) return hit;
  const spec = SPECIES[id];
  const raw = [drawDino(spec, 0), drawDino(spec, 1)] as const;
  const b = opaqueBounds(raw[0]);
  const shift = Math.round(spec.width / 2 - (b.minX + b.maxX + 1) / 2);
  const frames = raw.map((f) => shifted(f, shift)) as [PixelCanvas, PixelCanvas];
  const art: DinoArt = { frames, top: Math.min(...frames.map((f) => opaqueBounds(f).minY)), groundY: spec.groundY };
  cache.set(id, art);
  return art;
}

function opaqueBounds(c: PixelCanvas): { minX: number; maxX: number; minY: number } {
  let minX = c.width;
  let maxX = -1;
  let minY = c.height;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (c.alpha(x, y) > 200) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
      }
  return { minX, maxX, minY };
}

function shifted(src: PixelCanvas, dx: number): PixelCanvas {
  if (dx === 0) return src;
  const out = new PixelCanvas(src.width, src.height);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const tx = x + dx;
      if (tx < 0 || tx >= src.width) continue;
      const si = (y * src.width + x) * 4;
      out.data.set(src.data.subarray(si, si + 4), (y * src.width + tx) * 4);
    }
  return out;
}
