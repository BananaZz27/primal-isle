export type Axis = -1 | 0 | 1;
export interface MoveDir {
  moveX: Axis;
  moveY: Axis;
}

/** 8 ทิศ เรียงตามมุมทีละ 45° เริ่มจากขวา หมุนตามเข็ม (แกน y ของจอชี้ลง) */
const DIRS: MoveDir[] = [
  { moveX: 1, moveY: 0 },
  { moveX: 1, moveY: 1 },
  { moveX: 0, moveY: 1 },
  { moveX: -1, moveY: 1 },
  { moveX: -1, moveY: 0 },
  { moveX: -1, moveY: -1 },
  { moveX: 0, moveY: -1 },
  { moveX: 1, moveY: -1 },
];

/**
 * แปลงระยะที่ลากนิ้ว (dx, dy) จากจุดกลาง joystick เป็นทิศเดิน 8 ทิศ
 * - ลากน้อยกว่า deadzone × radius → ไม่เดิน (กันมือสั่น)
 * - นอกนั้นปัดมุมเข้าทิศที่ใกล้ที่สุด (ช่องละ 45°)
 * เซิร์ฟเวอร์รับเฉพาะค่า -1/0/1 จึงต้องปัดแบบนี้
 */
export function quantizeStick(dx: number, dy: number, radius: number, deadzone = 0.25): MoveDir {
  if (Math.hypot(dx, dy) < deadzone * radius) return { moveX: 0, moveY: 0 };
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return { ...DIRS[((sector % 8) + 8) % 8] };
}
