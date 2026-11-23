import Phaser from "phaser";
import { DINO_KINDS, TILE_SIZE } from "@primal/shared";
import { ASSET_ROOT, SURVIVOR_IDS, TEX, TREE_RECTS } from "../art/ninjaAtlas";
import { CAMPFIRE_FRAMES, CAMPFIRE_PALETTE } from "../art/campfire";
import { BAG, BED, BUILD_PALETTE, CHEST, DOOR, WALL } from "../art/structures";
import { CRATE, LIVING_PALETTE } from "../art/living";
import { paintTexture } from "../art/paint";
import { DINO_FRAMES, DINO_PALETTE } from "../art/dinos";
import { dinoWalkAnim } from "../render/dinos";
import { CAMPFIRE_ANIM } from "../render/structures";
import { registerSurvivorAnims } from "../render/survivorAnims";
import { GLOW_RADIUS, paintGlow } from "../render/night";
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

    // กำแพง ประตู ที่นอน กล่องเก็บของ ถุงของ ลังเสบียง — วาดเอง
    paintTexture(this, TEX.structure("wall"), [WALL], BUILD_PALETTE);
    paintTexture(this, TEX.structure("door"), [DOOR], BUILD_PALETTE);
    paintTexture(this, TEX.structure("bed"), [BED], BUILD_PALETTE);
    paintTexture(this, TEX.structure("chest"), [CHEST], BUILD_PALETTE);
    paintTexture(this, TEX.bag, [BAG], BUILD_PALETTE);
    paintTexture(this, TEX.crate, [CRATE], LIVING_PALETTE);
    // วงแสงกองไฟตอนกลางคืน (ไล่สีวงกลม ไม่ใช้ระบบ Lights ของ Phaser เพื่อให้มือถือลื่น)
    paintGlow(this, TEX.glow, GLOW_RADIUS);

    // กองไฟวาดเอง: แผ่นภาพ 2 เฟรมเรียงแนวนอน แล้วแบ่งเป็น frame 0/1 ให้ animation
    paintTexture(this, TEX.campfire, CAMPFIRE_FRAMES, CAMPFIRE_PALETTE);
    const fire = this.textures.get(TEX.campfire);
    CAMPFIRE_FRAMES.forEach((_, i) => fire.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE));
    if (!this.anims.exists(CAMPFIRE_ANIM)) {
      this.anims.create({ key: CAMPFIRE_ANIM, frames: [{ key: TEX.campfire, frame: 0 }, { key: TEX.campfire, frame: 1 }], frameRate: 5, repeat: -1 });
    }
    // ไดโนวาดเอง: ชนิดละ 2 เฟรม (ขาสลับ) → animation เดิน
    for (const kind of DINO_KINDS) {
      const frames = DINO_FRAMES[kind];
      const w = frames[0][0].length;
      const h = frames[0].length;
      paintTexture(this, TEX.dino(kind), frames, DINO_PALETTE);
      const tex = this.textures.get(TEX.dino(kind));
      frames.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
      if (!this.anims.exists(dinoWalkAnim(kind))) {
        this.anims.create({
          key: dinoWalkAnim(kind),
          frames: [{ key: TEX.dino(kind), frame: 0 }, { key: TEX.dino(kind), frame: 1 }],
          frameRate: 6,
          repeat: -1,
        });
      }
    }
    this.scene.start("Menu");
  }
}
