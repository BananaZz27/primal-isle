import Phaser from "phaser";
import { SEA_COLOUR } from "./art/palette";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { WorldScene } from "./scenes/WorldScene";

/** จุดเริ่มของเกมฝั่งหน้าจอ */
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: SEA_COLOUR,
  pixelArt: true, // ขยายภาพแบบคมชัด ไม่เบลอ
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  input: { activePointers: 3 }, // รองรับหลายนิ้วพร้อมกัน (joystick + ปุ่ม)
  scene: [BootScene, MenuScene, WorldScene],
});
