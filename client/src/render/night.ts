import Phaser from "phaser";
import { TILE_SIZE } from "@primal/shared";
import { TEX } from "../art/ninjaAtlas";
import { glowAlpha, nightAlpha } from "./dayNight";

/** รัศมีวงแสงกองไฟ (px ในโลก) ≈ 2.5 ช่อง */
export const GLOW_RADIUS = 40;
/** วาดทับทุกอย่างในโลก (ป้ายชื่อ/ไดโนอยู่ใต้ความมืดด้วย) แต่ใต้ UI ที่เป็น HTML */
const NIGHT_DEPTH = 1_000_000;
/** สีความมืด: น้ำเงินเข้ม (ดูเป็นกลางคืน ไม่ใช่ดำสนิท) */
const NIGHT_COLOUR = 0x0b1a3a;

/** สร้าง texture วงแสงไล่สี (ส้มตรงกลาง → โปร่งใสที่ขอบ) ขนาด 2r × 2r */
export function paintGlow(scene: Phaser.Scene, key: string, radius: number): void {
  const tex = scene.textures.createCanvas(key, radius * 2, radius * 2);
  if (!tex) throw new Error(`cannot create texture "${key}"`);
  const ctx = tex.context;
  const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, "rgba(255, 190, 110, 0.85)");
  g.addColorStop(0.45, "rgba(255, 140, 60, 0.4)");
  g.addColorStop(1, "rgba(255, 120, 40, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  tex.refresh();
}

/**
 * กลางวัน/กลางคืน: แผ่นสีน้ำเงินเข้มทับทั้งจอ (alpha ตาม clock) + วงแสงส้มแบบ ADD รอบกองไฟ
 * ไม่ใช้ Phaser Lights (ต้องตั้งทุก sprite และหนักบนมือถือ) · กลางวันซ่อนทั้งหมด = ไม่เสียแรงวาด
 */
export class NightView {
  private overlay: Phaser.GameObjects.Rectangle;
  private glows = new Map<string, Phaser.GameObjects.Image>();

  constructor(
    private scene: Phaser.Scene,
    /** กองไฟที่วางอยู่ตอนนี้ */
    private campfires: () => { key: string; tx: number; ty: number }[],
  ) {
    // scrollFactor 0 = ติดกล้อง · กล้องซูม ≥ 1 ขยายจากกลางจอ แผ่นขนาดเท่าจอจึงคลุมจอเสมอ
    this.overlay = scene.add.rectangle(0, 0, 1, 1, NIGHT_COLOUR).setOrigin(0).setScrollFactor(0).setDepth(NIGHT_DEPTH);
    this.overlay.setVisible(false);
  }

  /** เรียกทุกเฟรม */
  update(now: number, clockSec: number): void {
    const alpha = nightAlpha(clockSec);
    const dark = alpha > 0;
    this.overlay.setVisible(dark);
    if (dark) this.overlay.setAlpha(alpha).setDisplaySize(this.scene.scale.width, this.scene.scale.height);

    if (!dark) {
      // กลางวัน: ซ่อนวงแสงที่มีอยู่ แล้วไม่ต้องทำอะไรต่อ (ไม่สร้างรายการกองไฟทุกเฟรม)
      this.glows.forEach((g) => g.setVisible(false));
      return;
    }
    const glow = glowAlpha(clockSec);
    const live = new Set<string>();
    for (const c of this.campfires()) {
      live.add(c.key);
      let img = this.glows.get(c.key);
      if (!img) {
        const x = (c.tx + 0.5) * TILE_SIZE;
        const y = (c.ty + 0.5) * TILE_SIZE;
        img = this.scene.add.image(x, y, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(NIGHT_DEPTH + 1);
        this.glows.set(c.key, img);
      }
      img.setVisible(true);
      // ไฟวูบวาบนิดๆ (แต่ละกองไม่พร้อมกัน)
      img.setAlpha(glow * (0.88 + 0.12 * Math.sin(now / 130 + c.tx * 7 + c.ty * 3)));
    }
    for (const [key, img] of this.glows) {
      if (live.has(key)) continue;
      img.destroy();
      this.glows.delete(key);
    }
  }

  destroy(): void {
    this.overlay.destroy();
    this.glows.forEach((g) => g.destroy());
    this.glows.clear();
  }
}
