import Phaser from "phaser";
import { TILE_SIZE, type WorldMap } from "@primal/shared";

/**
 * สร้างแผนที่ Phaser จาก WorldMap
 * ค่าในแต่ละช่อง (Tile enum) = ลำดับภาพใน texture "tiles" พอดี จึงใช้ตรงๆ ได้
 */
export function buildTilemap(scene: Phaser.Scene, map: WorldMap): Phaser.Tilemaps.TilemapLayer {
  const data: number[][] = [];
  for (let ty = 0; ty < map.size; ty++) {
    data.push(Array.from(map.tiles.subarray(ty * map.size, (ty + 1) * map.size)));
  }

  const tilemap = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = tilemap.addTilesetImage("tiles", "tiles", TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) throw new Error("tileset 'tiles' missing — BootScene must paint it first");

  const layer = tilemap.createLayer(0, tileset, 0, 0);
  if (!layer || !(layer instanceof Phaser.Tilemaps.TilemapLayer)) {
    throw new Error("could not create tilemap layer");
  }
  return layer;
}
