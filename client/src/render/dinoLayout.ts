import { dinoDef, type DinoKind } from "@primal/shared";
import { SPECIES } from "../art/hd/species";
import { dinoArt } from "../art/hd/dinoArt";
import { HD_SCALE } from "../display";

/**
 * ตำแหน่งภาพไดโนเทียบกับจุดกลางกล่องชน (หน่วยโลก, y ลง = บวก) — ใช้ทั้งตอนวาดและวางป้าย
 * ไม่แตะ Phaser จึงเทสต์ได้
 */

/** มีภาพ HD ของชนิดนี้ไหม */
export const hasHdArt = (kind: string): kind is keyof typeof SPECIES & DinoKind => kind in SPECIES;

/** เท้าอยู่ต่ำกว่ากลางกล่องชนครึ่งหนึ่งของ half (ดูยืนบนพื้นตรงกล่องชน) */
export const dinoFeetY = (kind: DinoKind): number => Math.round(dinoDef(kind).half * 0.5);

/** ขอบบนของสิ่งที่วาดจริง (หัว/หลัง/ใบเรือ/แผงคอ) — ไม่ใช่ขอบบนของ canvas ซึ่งอาจว่างอยู่หลายแถว */
export function dinoTopY(kind: DinoKind): number {
  if (!hasHdArt(kind)) return dinoFeetY(kind) - dinoDef(kind).half * 2;
  const art = dinoArt(kind);
  return dinoFeetY(kind) - (art.groundY - art.top) * HD_SCALE;
}
