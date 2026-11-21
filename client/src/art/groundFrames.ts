import { isWalkable, Tile, tileAt, type WorldMap } from "@primal/shared";
import { GROUND, SAND_RIM, SHORE } from "./ninjaAtlas";

/** เพื่อนบ้าน 4 ทิศ + 4 มุม ของช่อง (tx, ty) ว่าเป็น "บก" ไหม */
function neighbours(map: WorldMap, tx: number, ty: number) {
  const land = (dx: number, dy: number) => isWalkable(tileAt(map, tx + dx, ty + dy));
  return {
    n: land(0, -1),
    s: land(0, 1),
    w: land(-1, 0),
    e: land(1, 0),
    nw: land(-1, -1),
    ne: land(1, -1),
    sw: land(-1, 1),
    se: land(1, 1),
  };
}

/** ช่องน้ำ: เลือกภาพขอบตามทิศที่บกอยู่ (เหมือนขอบบ่อในภาพต้นฉบับ) */
function waterFrame(map: WorldMap, tx: number, ty: number): number {
  const { n, s, w, e } = neighbours(map, tx, ty);
  const count = Number(n) + Number(s) + Number(w) + Number(e);

  if (count === 1) return n ? SHORE.n : s ? SHORE.s : w ? SHORE.w : SHORE.e;
  if (count === 2) {
    if (n && w) return SHORE.nw;
    if (n && e) return SHORE.ne;
    if (s && w) return SHORE.sw;
    if (s && e) return SHORE.se;
  }
  // ไม่มีบกติด / ช่องแคบ (บกสองฝั่งตรงข้าม) / บก 3–4 ด้าน → ไม่มีภาพที่ตรง ใช้น้ำธรรมดา
  return GROUND.water;
}

/** ช่องทราย: ถ้าติดน้ำด้านเดียว (หรือมุมเดียว) ใส่ขอบแดงริมน้ำ */
function sandFrame(map: WorldMap, tx: number, ty: number): number {
  const nb = neighbours(map, tx, ty);
  const water = { n: !nb.n, s: !nb.s, w: !nb.w, e: !nb.e };
  const sides = Number(water.n) + Number(water.s) + Number(water.w) + Number(water.e);

  if (sides === 1) return water.n ? SAND_RIM.n : water.s ? SAND_RIM.s : water.w ? SAND_RIM.w : SAND_RIM.e;
  if (sides === 0) {
    const diag = { nw: !nb.nw, ne: !nb.ne, sw: !nb.sw, se: !nb.se };
    const corners = Number(diag.nw) + Number(diag.ne) + Number(diag.sw) + Number(diag.se);
    if (corners === 1) return diag.nw ? SAND_RIM.nw : diag.ne ? SAND_RIM.ne : diag.sw ? SAND_RIM.sw : SAND_RIM.se;
  }
  return GROUND.sand;
}

/**
 * เลข frame ใน tileset สำหรับช่อง (tx, ty) — ฟังก์ชันล้วน ไม่แตะ Phaser จึงเทสต์ได้
 * ชายฝั่งดูเพื่อนบ้านเพื่อเลือกภาพขอบ ทำให้ขอบเกาะโค้งเนียน
 */
export function groundFrame(map: WorldMap, tx: number, ty: number): number {
  switch (tileAt(map, tx, ty)) {
    case Tile.Water:
      return waterFrame(map, tx, ty);
    case Tile.Sand:
      return sandFrame(map, tx, ty);
    case Tile.Grass:
      return GROUND.grass;
    case Tile.Forest:
      return GROUND.forestFloor;
  }
}
