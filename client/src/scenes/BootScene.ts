import Phaser from "phaser";
import { DINO_KINDS, TILE_SIZE } from "@primal/shared";
import { ASSET_ROOT, TEX, TREE_RECTS } from "../art/ninjaAtlas";
import { CAMPFIRE_FRAMES, CAMPFIRE_PALETTE } from "../art/campfire";
import { BAG, BED, BUILD_PALETTE, CHEST, DOOR, WALL } from "../art/structures";
import { CRATE, LIVING_PALETTE } from "../art/living";
import { paintHdFrames, paintHdSheet, paintTexture } from "../art/paint";
import { OUTFITS, survivorIdOf, survivorSheet } from "../art/hd/survivor";
import { drawDino } from "../art/hd/dinoRig";
import { groundTileset } from "../art/hd/ground";
import { bush, pineTree, rock, stump, tree, tuft } from "../art/hd/nature";
import { SPECIES } from "../art/hd/species";
import { hasHdArt } from "../render/dinoLayout";
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
    // ผู้รอดชีวิต HD 8 แบบ (4 ทิศ × 4 ท่าเดิน) — ต้องวาดก่อนสร้าง animation
    OUTFITS.forEach((o, i) => paintHdSheet(this, TEX.survivor(survivorIdOf(i)), survivorSheet(o), 32, 32));
    registerSurvivorAnims(this);
    // พื้น HD: น้ำ ทราย หญ้า ป่า (16 รูปขอบต่อชั้น) + ดอกไม้
    paintHdFrames(this, TEX.hd.ground, [groundTileset()]);
    // ทรัพยากร HD: ต้นไม้ 2 แบบ ตอ หิน 2 ขนาด พุ่มไม้มี/ไม่มีผล กอหญ้า
    paintHdFrames(this, TEX.hd.tree(0), [tree(0)]);
    paintHdFrames(this, TEX.hd.tree(1), [pineTree(0)]);
    paintHdFrames(this, TEX.hd.stump, [stump()]);
    paintHdFrames(this, TEX.hd.rock(0), [rock(1)]);
    paintHdFrames(this, TEX.hd.rock(1), [rock(0)]);
    paintHdFrames(this, TEX.hd.bush(true), [bush(true)]);
    paintHdFrames(this, TEX.hd.bush(false), [bush(false)]);
    paintHdFrames(this, TEX.hd.tuft, [tuft()]);
    // ไดโน HD (32 texel/ช่อง): ชนิดละ 2 เฟรม (ขาสลับ) จากโครงไดโน → animation เดิน
    for (const kind of DINO_KINDS) {
      if (!hasHdArt(kind)) continue;
      paintHdFrames(this, TEX.dino(kind), [drawDino(SPECIES[kind], 0), drawDino(SPECIES[kind], 1)]);
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
