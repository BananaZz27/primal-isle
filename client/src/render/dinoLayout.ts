import { dinoDef, type DinoKind } from "@primal/shared";
import { SPECIES } from "../art/hd/species";
import { HD_SCALE } from "../display";

/**
 * ตำแหน่งภาพไดโนเทียบกับจุดกลางกล่องชน (หน่วยโลก, y ลง = บวก) — ใช้ทั้งตอนวาดและวางป้าย
 * ไม่แตะ Phaser จึงเทสต์ได้
 */

/** มีภาพ HD ของชนิดนี้ไหม */
export const hasHdArt = (kind: string): kind is keyof typeof SPECIES & DinoKind => kind in SPECIES;

/** เท้าอยู่ต่ำกว่ากลางกล่องชนครึ่งหนึ่งของ half (ดูยืนบนพื้นตรงกล่องชน) */
export const dinoFeetY = (kind: DinoKind): number => Math.round(dinoDef(kind).half * 0.5);

/** ขอบบนของภาพ (หัว/หลัง/ใบเรือ) */
export function dinoTopY(kind: DinoKind): number {
  const spec = hasHdArt(kind) ? SPECIES[kind] : null;
  return dinoFeetY(kind) - (spec ? spec.groundY * HD_SCALE : dinoDef(kind).half * 2);
}
