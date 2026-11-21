import Phaser from "phaser";
import { TILE_SIZE } from "@primal/shared";
import { ASSET_ROOT, SURVIVOR_IDS, TEX, TREE_RECTS } from "../art/ninjaAtlas";
import { registerSurvivorAnims } from "../render/survivorAnims";

/** ฉากแรก: โหลดภาพทั้งหมด เตรียม frame ต้นไม้และท่าเดิน แล้วไปหน้าเมนู */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const frame = { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE };
    this.load.spritesheet(TEX.tiles, `${ASSET_ROOT}/tileset.png`, frame);
    this.load.image(TEX.tilesImage, `${ASSET_ROOT}/tileset.png`);
    for (const id of SURVIVOR_IDS) {
      this.load.spritesheet(TEX.survivor(id), `${ASSET_ROOT}/characters/${id}.png`, frame);
    }
  }

  create() {
    // ตัดต้นไม้ (ใหญ่กว่า 1 ช่อง) ออกมาเป็น frame ของตัวเอง
    const sheet = this.textures.get(TEX.tilesImage);
    TREE_RECTS.forEach((r, i) => sheet.add(TEX.tree(i), 0, r.x, r.y, r.w, r.h));

    registerSurvivorAnims(this);
    this.scene.start("Menu");
  }
}
