import Phaser from "phaser";
import { DINO_KINDS } from "@primal/shared";
import { TEX } from "../art/textures";
import { paintHdFrames, paintHdSheet } from "../art/paint";
import { OUTFITS, survivorIdOf, survivorSheet } from "../art/hd/survivor";
import { drawDino } from "../art/hd/dinoRig";
import { bag, bed, campfire, chest, crate, door, wall } from "../art/hd/built";
import { groundTileset } from "../art/hd/ground";
import { bush, pineTree, rock, stump, tree, tuft } from "../art/hd/nature";
import { SPECIES } from "../art/hd/species";
import { hasHdArt } from "../render/dinoLayout";
import { dinoWalkAnim } from "../render/dinos";
import { CAMPFIRE_ANIM } from "../render/structures";
import { registerSurvivorAnims } from "../render/survivorAnims";
import { GLOW_RADIUS, paintGlow } from "../render/night";

/**
 * ฉากแรก: วาดภาพทั้งเกมด้วยโค้ด (art/hd → texture) สร้าง animation แล้วไปหน้าเมนู
 * ไม่มีไฟล์ภาพให้โหลดแล้ว — ภาพทุกชิ้นมาจาก art/hd
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    // สิ่งก่อสร้าง ถุงของ ลังเสบียง HD
    paintHdFrames(this, TEX.structure("wall"), [wall()]);
    paintHdFrames(this, TEX.structure("door"), [door()]);
    paintHdFrames(this, TEX.structure("bed"), [bed()]);
    paintHdFrames(this, TEX.structure("chest"), [chest()]);
    paintHdFrames(this, TEX.bag, [bag()]);
    paintHdFrames(this, TEX.crate, [crate()]);
    // วงแสงกองไฟตอนกลางคืน (ไล่สีวงกลม ไม่ใช้ระบบ Lights ของ Phaser เพื่อให้มือถือลื่น)
    paintGlow(this, TEX.glow, GLOW_RADIUS);

    // กองไฟ HD: 2 เฟรม (เปลวสลับ) → animation
    paintHdFrames(this, TEX.campfire, [campfire(0), campfire(1)]);
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
