import Phaser from "phaser";
import { SEA_COLOUR } from "./art/palette";
import { currentDpr } from "./display";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { WorldScene } from "./scenes/WorldScene";

/** จุดเริ่มของเกมฝั่งหน้าจอ */
const dpr = currentDpr();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: SEA_COLOUR,
  pixelArt: true, // ขยายภาพแบบคมชัด ไม่เบลอ
  roundPixels: true,
  // canvas ใหญ่เท่าพิกเซลจริงของจอ แล้วย่อแสดงเท่าขนาด CSS (zoom = 1/dpr) → จอคมไม่เบลอ
  scale: { mode: Phaser.Scale.NONE, width: innerWidth * dpr, height: innerHeight * dpr, zoom: 1 / dpr },
  input: { activePointers: 3 }, // รองรับหลายนิ้วพร้อมกัน (joystick + ปุ่ม)
  scene: [BootScene, MenuScene, WorldScene],
});

/** หมุนจอ / ย่อขยายหน้าต่าง / ลากไปจออื่น → ปรับขนาด canvas ตาม (ฉากจะได้ event "resize") */
function fitToWindow() {
  const d = currentDpr();
  game.scale.setZoom(1 / d);
  game.scale.resize(Math.round(innerWidth * d), Math.round(innerHeight * d));
}
addEventListener("resize", fitToWindow);
visualViewport?.addEventListener("resize", fitToWindow);
