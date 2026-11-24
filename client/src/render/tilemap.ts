import Phaser from "phaser";
import { DecorKind, TILE_SIZE, type Decor, type WorldMap } from "@primal/shared";
import { dualFrames, FLOWER_FRAME } from "../art/hd/ground";
import { TEX } from "../art/textures";
import { HD_SCALE } from "../display";

/** ช่องของแผ่นภาพพื้น HD (texel) */
const HD_TILE = TILE_SIZE / HD_SCALE;

/**
 * สร้างพื้นเกาะ HD จาก WorldMap (ดูวิธีใน art/hd/ground.ts):
 * 4 ชั้นซ้อนกัน น้ำ → ทราย → หญ้า → ป่า วางบน dual grid (เลื่อนครึ่งช่อง) + ชั้นดอกไม้ตามช่องปกติ
 * ทั้งหมดเป็น tilemap → Phaser ตัดส่วนนอกจอทิ้งเอง · ทรัพยากรไม่อยู่ที่นี่ (ดู ResourceView)
 */
export function buildTilemap(scene: Phaser.Scene, map: WorldMap, decor: Decor[]): void {
  const frames = dualFrames(map);
  const n = map.size + 1;
  const tilemap = scene.make.tilemap({ width: n, height: n, tileWidth: HD_TILE, tileHeight: HD_TILE });
  const tileset = tilemap.addTilesetImage(TEX.hd.ground, TEX.hd.ground, HD_TILE, HD_TILE, 0, 0);
  if (!tileset) throw new Error(`tileset '${TEX.hd.ground}' missing — BootScene must paint it first`);

  // dual grid: มุม (0, 0) อยู่ที่มุมซ้ายบนของช่องโลก (0, 0) → เลื่อนชั้นไปซ้าย/ขึ้นครึ่งช่อง
  for (const name of ["water", "sand", "grass", "forest"] as const) {
    const layer = asLayer(tilemap.createBlankLayer(name, tileset, -TILE_SIZE / 2, -TILE_SIZE / 2, n, n));
    layer.putTilesAt(frames[name], 0, 0);
    layer.setScale(HD_SCALE);
  }

  // ดอกไม้: ตกแต่งล้วน วางตามช่องโลกปกติ
  const flowers = asLayer(tilemap.createBlankLayer("flowers", tileset, 0, 0, map.size, map.size));
  for (const d of decor) if (d.kind === DecorKind.Flower) flowers.putTileAt(FLOWER_FRAME(d.variant), d.tx, d.ty);
  flowers.setScale(HD_SCALE);
}

function asLayer(layer: unknown): Phaser.Tilemaps.TilemapLayer {
  if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) throw new Error("could not create tilemap layer");
  return layer;
}
