import Phaser from "phaser";
import { DecorKind, TILE_SIZE, type Decor } from "@primal/shared";
import { TEX, TREE_RECTS } from "../art/ninjaAtlas";

/**
 * วางต้นไม้เป็นรูปแยกชิ้น (สูงกว่า 1 ช่อง จึงอยู่ใน tilemap ไม่ได้)
 * depth = ตำแหน่ง y ของโคนต้น → ผู้เล่นที่อยู่ "หลัง" ต้นไม้จะถูกบัง เหมือนจริง
 */
export function placeTrees(scene: Phaser.Scene, decor: Decor[]): Phaser.GameObjects.Image[] {
  const trees: Phaser.GameObjects.Image[] = [];
  for (const d of decor) {
    if (d.kind !== DecorKind.Tree) continue;
    const baseX = d.tx * TILE_SIZE + TILE_SIZE / 2;
    const baseY = (d.ty + 1) * TILE_SIZE;
    const tree = scene.add
      .image(baseX, baseY, TEX.tilesImage, TEX.tree(d.variant % TREE_RECTS.length))
      .setOrigin(0.5, 1)
      .setDepth(baseY);
    trees.push(tree);
  }
  return trees;
}
