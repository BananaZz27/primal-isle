import { PLAYER_HALF, PLAYER_SPEED, TILE_SIZE } from "../constants";
import { isWalkable, tileAt, type WorldMap } from "../world/tiles";

/** ตำแหน่ง (px) และความเร็ว (px/วินาที) ของตัวละคร */
export interface EntityState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** ทิศที่ผู้เล่นอยากเดิน แต่ละแกนอยู่ในช่วง -1..1 */
export interface MoveInputLike {
  moveX: number;
  moveY: number;
}

const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v || 0);

/** ฟังก์ชันบอกว่าช่อง (tx, ty) มีของแข็ง (ต้นไม้/หิน) ขวางไหม */
export type SolidFn = (tx: number, ty: number) => boolean;
const NOTHING_SOLID: SolidFn = () => false;

/**
 * กล่องชน (hitbox) ครึ่งกว้าง half ที่ตำแหน่ง (x, y) ทับช่องที่เดินไม่ได้หรือไม่
 * เช็กทุกช่องที่กล่องทับ (กล่องใหญ่กว่า 1 ช่อง เช่น ไดโนตัวโต ก็ไม่ลอดช่องแคบ)
 */
export function blocked(map: WorldMap, x: number, y: number, solid: SolidFn, half = PLAYER_HALF): boolean {
  const left = Math.floor((x - half) / TILE_SIZE);
  const right = Math.floor((x + half) / TILE_SIZE);
  const top = Math.floor((y - half) / TILE_SIZE);
  const bottom = Math.floor((y + half) / TILE_SIZE);
  for (let ty = top; ty <= bottom; ty++)
    for (let tx = left; tx <= right; tx++) if (!isWalkable(tileAt(map, tx, ty)) || solid(tx, ty)) return true;
  return false;
}

/**
 * เดิน 1 step — ฟังก์ชันนี้ต้อง "pure": ผลขึ้นกับ (entity, input, dt, map) เท่านั้น
 * ไม่มีนาฬิกา ไม่มีการสุ่ม เพราะ server กับ client ต้องคำนวณได้ผลตรงกันเป๊ะ
 * (client ใช้ทำนายการเดินของตัวเอง แล้วเทียบกับผลจาก server)
 *
 * ขยับทีละแกน (X ก่อน แล้ว Y) ถ้าแกนไหนชนก็หยุดแกนนั้น อีกแกนยังไปต่อได้ → เดินไถลไปตามกำแพงได้
 */
export function stepPlayer(
  entity: EntityState,
  input: MoveInputLike,
  dt: number,
  map: WorldMap,
  solid: SolidFn = NOTHING_SOLID,
): void {
  let dirX = clamp1(input.moveX);
  let dirY = clamp1(input.moveY);
  // กติกาเดิมของผู้เล่น (ห้ามเปลี่ยน: client ทำนายด้วยสูตรนี้): ทแยง = คูณ 1/√2 ทั้งสองแกน
  if (dirX !== 0 && dirY !== 0) {
    dirX *= Math.SQRT1_2;
    dirY *= Math.SQRT1_2;
  }
  stepMover(entity, dirX, dirY, PLAYER_SPEED, PLAYER_HALF, dt, map, solid);
}

/**
 * เดิน 1 step แบบทั่วไป (ผู้เล่นและไดโนใช้ตัวนี้): ทิศ dirX/dirY (-1..1), ความเร็ว speed px/s, กล่องชนครึ่งกว้าง half
 * ทิศทแยงถูกย่อให้ไม่เร็วกว่าเดินตรง · ทิศที่ไม่ใช่ -1/0/1 (เช่น 0.6, -0.8 ของไดโน) ใช้ตามสัดส่วน
 */
export function stepMover(
  entity: EntityState,
  moveX: number,
  moveY: number,
  speed: number,
  half: number,
  dt: number,
  map: WorldMap,
  solid: SolidFn = NOTHING_SOLID,
): void {
  let dirX = clamp1(moveX);
  let dirY = clamp1(moveY);

  // ความยาวทิศเกิน 1 (เช่นทแยงเต็มแรง) → ย่อให้ไม่เร็วกว่าเดินตรง
  const len = Math.hypot(dirX, dirY);
  if (len > 1) {
    dirX /= len;
    dirY /= len;
  }

  let vx = dirX * speed;
  let vy = dirY * speed;

  const nextX = entity.x + vx * dt;
  if (vx !== 0 && !blocked(map, nextX, entity.y, solid, half)) entity.x = nextX;
  else vx = 0;

  const nextY = entity.y + vy * dt;
  if (vy !== 0 && !blocked(map, entity.x, nextY, solid, half)) entity.y = nextY;
  else vy = 0;

  entity.vx = vx;
  entity.vy = vy;
}
