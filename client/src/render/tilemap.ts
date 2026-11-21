import Phaser from "phaser";
import { DecorKind, TILE_SIZE, type Decor, type WorldMap } from "@primal/shared";
import { groundFrame } from "../art/groundFrames";
import { GROUND_DECOR, TEX } from "../art/ninjaAtlas";

export interface WorldLayers {
  /** พื้น: น้ำ ทราย หญ้า ป่า + ขอบชายฝั่ง */
  ground: Phaser.Tilemaps.TilemapLayer;
  /** ดอกไม้ — อยู่ใน tilemap จึงถูกตัดทิ้งเองเมื่ออยู่นอกจอ */
  decor: Phaser.Tilemaps.TilemapLayer;
}

/** ใน tilemap มีเฉพาะดอกไม้ (ตกแต่งล้วน) — ทรัพยากรอยู่ใน ResourceView เพราะเปลี่ยนหน้าตาได้ */
const SMALL_FRAMES: Partial<Record<DecorKind, number[]>> = {
  [DecorKind.Flower]: GROUND_DECOR.flower,
};

/** สร้างพื้นเกาะ 2 ชั้นจาก WorldMap และรายการของตกแต่ง (ทรัพยากรไม่อยู่ที่นี่ — ดู ResourceView) */
export function buildTilemap(scene: Phaser.Scene, map: WorldMap, decor: Decor[]): WorldLayers {
  const data: number[][] = [];
  for (let ty = 0; ty < map.size; ty++) {
    const row: number[] = [];
    for (let tx = 0; tx < map.size; tx++) row.push(groundFrame(map, tx, ty));
    data.push(row);
  }

  const tilemap = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = tilemap.addTilesetImage(TEX.tiles, TEX.tiles, TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) throw new Error(`tileset '${TEX.tiles}' missing — BootScene must load it first`);

  const ground = asLayer(tilemap.createLayer(0, tileset, 0, 0));
  const decorLayer = asLayer(tilemap.createBlankLayer("decor", tileset, 0, 0));

  for (const d of decor) {
    const frames = SMALL_FRAMES[d.kind];
    if (frames) decorLayer.putTileAt(frames[d.variant % frames.length], d.tx, d.ty);
  }

  return { ground, decor: decorLayer };
}

function asLayer(layer: unknown): Phaser.Tilemaps.TilemapLayer {
  if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) throw new Error("could not create tilemap layer");
  return layer;
}
