import Phaser from "phaser";
import { TILE_SIZE } from "@primal/shared";
import { ASSET_ROOT, SURVIVOR_IDS, TEX, TREE_RECTS } from "../art/ninjaAtlas";
import { CAMPFIRE_FRAMES, CAMPFIRE_PALETTE } from "../art/campfire";
import { paintTexture } from "../art/paint";
import { CAMPFIRE_ANIM } from "../render/structures";
import { registerSurvivorAnims } from "../render/survivorAnims";
import { showLoadError } from "../ui/loadError";

/** ฉากแรก: โหลดภาพทั้งหมด เตรียม frame ต้นไม้และท่าเดิน แล้วไปหน้าเมนู */
export class BootScene extends Phaser.Scene {
  /** ไฟล์ที่โหลดไม่สำเร็จ — ถ้ามี จะไม่เข้าเกม (ไม่งั้นเกมค้างเงียบๆ ตอนสร้างแผนที่) */
  private failed: string[] = [];

  constructor() {
    super("Boot");
  }

  preload() {
    this.failed = [];
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.failed.push(file.key));

    const frame = { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE };
    this.load.spritesheet(TEX.tiles, `${ASSET_ROOT}/tileset.png`, frame);
    this.load.image(TEX.tilesImage, `${ASSET_ROOT}/tileset.png`);
    for (const id of SURVIVOR_IDS) {
      this.load.spritesheet(TEX.survivor(id), `${ASSET_ROOT}/characters/${id}.png`, frame);
    }
  }

  create() {
    if (this.failed.length > 0) {
      console.error("asset load failed:", this.failed);
      showLoadError();
      return;
    }

    // ตัดต้นไม้ (ใหญ่กว่า 1 ช่อง) ออกมาเป็น frame ของตัวเอง
    const sheet = this.textures.get(TEX.tilesImage);
    TREE_RECTS.forEach((r, i) => sheet.add(TEX.tree(i), 0, r.x, r.y, r.w, r.h));

    registerSurvivorAnims(this);

    // กองไฟวาดเอง: แผ่นภาพ 2 เฟรมเรียงแนวนอน แล้วแบ่งเป็น frame 0/1 ให้ animation
    paintTexture(this, TEX.campfire, CAMPFIRE_FRAMES, CAMPFIRE_PALETTE);
    const fire = this.textures.get(TEX.campfire);
    CAMPFIRE_FRAMES.forEach((_, i) => fire.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE));
    if (!this.anims.exists(CAMPFIRE_ANIM)) {
      this.anims.create({ key: CAMPFIRE_ANIM, frames: [{ key: TEX.campfire, frame: 0 }, { key: TEX.campfire, frame: 1 }], frameRate: 5, repeat: -1 });
    }
    this.scene.start("Menu");
  }
}
