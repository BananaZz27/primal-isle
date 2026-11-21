import Phaser from "phaser";
import { paintTexture } from "../art/paint";
import { PALETTE } from "../art/palette";
import { SURVIVOR, SURVIVOR_SHIRT, TILES } from "../art/sprites";

/** ฉากแรก: วาดภาพทั้งหมดเป็น texture แล้วไปหน้าเมนู */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    paintTexture(this, "tiles", TILES, PALETTE);
    paintTexture(this, "survivor", [SURVIVOR], PALETTE);
    paintTexture(this, "survivor-shirt", [SURVIVOR_SHIRT], PALETTE);
    this.scene.start("Menu");
  }
}
