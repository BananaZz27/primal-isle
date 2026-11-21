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

/** กล่องชน (hitbox) ที่ตำแหน่ง (x, y) ทับช่องที่เดินไม่ได้หรือไม่ — เช็กทั้ง 4 มุม */
function blocked(map: WorldMap, x: number, y: number): boolean {
  const left = Math.floor((x - PLAYER_HALF) / TILE_SIZE);
  const right = Math.floor((x + PLAYER_HALF) / TILE_SIZE);
  const top = Math.floor((y - PLAYER_HALF) / TILE_SIZE);
  const bottom = Math.floor((y + PLAYER_HALF) / TILE_SIZE);
  return (
    !isWalkable(tileAt(map, left, top)) ||
    !isWalkable(tileAt(map, right, top)) ||
    !isWalkable(tileAt(map, left, bottom)) ||
    !isWalkable(tileAt(map, right, bottom))
  );
}

/**
 * เดิน 1 step — ฟังก์ชันนี้ต้อง "pure": ผลขึ้นกับ (entity, input, dt, map) เท่านั้น
 * ไม่มีนาฬิกา ไม่มีการสุ่ม เพราะ server กับ client ต้องคำนวณได้ผลตรงกันเป๊ะ
 * (client ใช้ทำนายการเดินของตัวเอง แล้วเทียบกับผลจาก server)
 *
 * ขยับทีละแกน (X ก่อน แล้ว Y) ถ้าแกนไหนชนก็หยุดแกนนั้น อีกแกนยังไปต่อได้ → เดินไถลไปตามกำแพงได้
 */
export function stepPlayer(entity: EntityState, input: MoveInputLike, dt: number, map: WorldMap): void {
  let dirX = clamp1(input.moveX);
  let dirY = clamp1(input.moveY);

  // เดินแนวทแยงต้องไม่เร็วกว่าเดินตรง
  if (dirX !== 0 && dirY !== 0) {
    dirX *= Math.SQRT1_2;
    dirY *= Math.SQRT1_2;
  }

  let vx = dirX * PLAYER_SPEED;
  let vy = dirY * PLAYER_SPEED;

  const nextX = entity.x + vx * dt;
  if (vx !== 0 && !blocked(map, nextX, entity.y)) entity.x = nextX;
  else vx = 0;

  const nextY = entity.y + vy * dt;
  if (vy !== 0 && !blocked(map, entity.x, nextY)) entity.y = nextY;
  else vy = 0;

  entity.vx = vx;
  entity.vy = vy;
}
