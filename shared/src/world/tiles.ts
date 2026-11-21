/** ชนิดของพื้นแต่ละช่องบนแผนที่ (ภาพที่ใช้วาดเลือกใน client/src/art/groundFrames.ts) */
export enum Tile {
  Water = 0,
  Sand = 1,
  Grass = 2,
  Forest = 3,
}

/** แผนที่ทั้งโลก: tiles เก็บเป็นแถวเรียงกัน index = ty * size + tx */
export interface WorldMap {
  seed: number;
  size: number;
  tiles: Uint8Array;
}

/** เดินบนช่องนี้ได้ไหม (ตอนนี้ทุกอย่างเดินได้ยกเว้นน้ำ) */
export function isWalkable(tile: Tile): boolean {
  return tile !== Tile.Water;
}

/** อ่านชนิดพื้นที่ช่อง (tx, ty) — นอกขอบแผนที่ถือว่าเป็นทะเล */
export function tileAt(map: WorldMap, tx: number, ty: number): Tile {
  if (tx < 0 || ty < 0 || tx >= map.size || ty >= map.size) return Tile.Water;
  return map.tiles[ty * map.size + tx] as Tile;
}
