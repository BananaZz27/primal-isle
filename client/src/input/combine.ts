import type { MoveDir } from "./joystick";

/** รวม input 2 แหล่ง (เช่น คีย์บอร์ด + joystick): แกนไหน a กดอยู่ใช้ a ไม่งั้นใช้ b */
export function combineInputs(a: MoveDir, b: MoveDir): MoveDir {
  return {
    moveX: a.moveX !== 0 ? a.moveX : b.moveX,
    moveY: a.moveY !== 0 ? a.moveY : b.moveY,
  };
}
