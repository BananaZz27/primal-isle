import Phaser from "phaser";
import { SEA_COLOUR } from "./art/palette";
import { canvasSize, currentDpr } from "./display";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { WorldScene } from "./scenes/WorldScene";

/** จุดเริ่มของเกมฝั่งหน้าจอ */
const initial = canvasSize(innerWidth, innerHeight, currentDpr());
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: SEA_COLOUR,
  pixelArt: true, // ขยายภาพแบบคมชัด ไม่เบลอ
  roundPixels: true,
  // canvas ใหญ่เท่าพิกเซลจริงของจอ แล้วย่อแสดงเท่าขนาด CSS (zoom = 1/dpr) → จอคมไม่เบลอ
  scale: { mode: Phaser.Scale.NONE, width: initial.width, height: initial.height, zoom: initial.zoom },
  input: { activePointers: 3 }, // รองรับหลายนิ้วพร้อมกัน (joystick + ปุ่ม)
  scene: [BootScene, MenuScene, WorldScene],
});

/**
 * หมุนจอ / ย่อขยายหน้าต่าง / ลากไปจอที่ความละเอียดต่างกัน → ปรับขนาด canvas (ฉากจะได้ event "resize")
 * ลำดับสำคัญ: resize ก่อน แล้วค่อย setZoom — setZoom คำนวณขนาด CSS จากขนาดเกมปัจจุบัน
 * (ถ้าสลับ ที่ zoom 1 Phaser จะไม่อัปเดตขนาด CSS เลย canvas ค้างขนาดหน้าต่างเก่า)
 */
function fitToWindow() {
  const size = canvasSize(innerWidth, innerHeight, currentDpr());
  game.scale.resize(size.width, size.height);
  game.scale.setZoom(size.zoom);
}
addEventListener("resize", fitToWindow);
visualViewport?.addEventListener("resize", fitToWindow);

/** ความละเอียดจอเปลี่ยนโดยไม่มี resize (ลากหน้าต่างไปอีกจอ) → ฟังใหม่ทุกครั้งที่ค่าเปลี่ยน */
function watchDpr() {
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener(
    "change",
    () => {
      fitToWindow();
      watchDpr();
    },
    { once: true },
  );
}
watchDpr();
