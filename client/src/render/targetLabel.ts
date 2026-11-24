import Phaser from "phaser";
import { CAMERA_ZOOM } from "../config";
import type { LabelSpot } from "../ui/targetLabel";

/** อยู่เหนือความมืดกลางคืน (ป้ายต้องอ่านออกตลอด) */
const LABEL_DEPTH = 1_000_010;

/** ป้ายเล็กๆ เหนือสิ่งที่กด ✋ แล้วจะเก็บ/ทำ — มีอันเดียว ย้ายตามเป้า */
export class TargetLabelView {
  private text: Phaser.GameObjects.Text;
  private shown = "";

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "6px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(CAMERA_ZOOM * 2) // คมแม้กล้องซูม
      .setDepth(LABEL_DEPTH)
      .setVisible(false);
  }

  /** null = ซ่อน */
  show(spot: LabelSpot | null): void {
    this.text.setVisible(!!spot);
    if (!spot) return;
    if (spot.text !== this.shown) {
      this.shown = spot.text;
      this.text.setText(spot.text);
    }
    this.text.setPosition(Math.round(spot.x), Math.round(spot.y));
  }

  destroy(): void {
    this.text.destroy();
  }
}
