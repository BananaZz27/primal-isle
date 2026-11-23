import { TILE_SIZE } from "@primal/shared";
import { el, uiRoot } from "./dom";

/** กล่องเสบียงที่ใกล้ที่สุด (ทั้งเกาะ ไม่จำกัดระยะ) พร้อมระยะเป็นจำนวนช่อง — ไม่มีกล่อง → null */
export function nearestCrate<T extends { key: string; tx: number; ty: number }>(
  px: number,
  py: number,
  crates: T[],
): (T & { tiles: number }) | null {
  let best: (T & { tiles: number }) | null = null;
  let bestDist = Infinity;
  for (const c of crates) {
    const d = Math.hypot(px - (c.tx + 0.5) * TILE_SIZE, py - (c.ty + 0.5) * TILE_SIZE);
    if (d < bestDist) {
      bestDist = d;
      best = { ...c, tiles: Math.round(d / TILE_SIZE) };
    }
  }
  return best;
}

export interface EdgeArrow {
  /** ตำแหน่งบนจอ (px) ที่ขอบจอด้านใน */
  x: number;
  y: number;
  /** ทิศที่ชี้ (เรเดียน, 0 = ขวา, บวก = หมุนลง) */
  angle: number;
}

/**
 * ลูกศรขอบจอชี้ไปที่ (sx, sy) — พิกัดบนจอของกล่อง (อาจอยู่นอกจอ)
 * กล่องอยู่ในจอ → null (เห็นเองแล้ว) · นอกจอ → จุดบนขอบจอ (หดเข้ามา margin) ตามแนวจากกลางจอไปหากล่อง
 */
export function edgeArrow(sx: number, sy: number, width: number, height: number, margin: number): EdgeArrow | null {
  if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) return null;
  const cx = width / 2;
  const cy = height / 2;
  const dx = sx - cx;
  const dy = sy - cy;
  const hx = Math.max(0, cx - margin);
  const hy = Math.max(0, cy - margin);
  // ยืดเส้นจากกลางจอจนชนกรอบด้านใน (ด้านที่ชนก่อน)
  const scale = Math.min(dx === 0 ? Infinity : hx / Math.abs(dx), dy === 0 ? Infinity : hy / Math.abs(dy));
  return { x: cx + dx * scale, y: cy + dy * scale, angle: Math.atan2(dy, dx) };
}

/** ระยะห่างจากขอบจอ (px) — พ้นป้ายมุมจอและ joystick */
const MARGIN = 44;

/** ลูกศร 📦 ที่ขอบจอ ชี้ไปกล่องเสบียงที่ใกล้ที่สุด พร้อมบอกระยะ (HTML ลอยทับเกม แตะทะลุได้) */
export class CrateArrow {
  private root = el("div", { className: "crate-arrow" });
  private pointer = el("span", { className: "pointer", text: "➤" });
  private label = el("span", { className: "dist" });

  constructor() {
    this.root.append(this.pointer, this.label);
    this.root.hidden = true;
    uiRoot().append(this.root);
  }

  /** sx, sy = ตำแหน่งกล่องบนจอ · null = ไม่มีกล่องบนเกาะ */
  update(target: { sx: number; sy: number; tiles: number } | null, width: number, height: number): void {
    const arrow = target && edgeArrow(target.sx, target.sy, width, height, MARGIN);
    this.root.hidden = !arrow;
    if (!arrow || !target) return;
    this.root.style.left = `${arrow.x}px`;
    this.root.style.top = `${arrow.y}px`;
    this.pointer.style.transform = `rotate(${arrow.angle}rad)`;
    this.label.textContent = `📦 ${target.tiles} ช่อง`;
  }

  destroy(): void {
    this.root.remove();
  }
}
