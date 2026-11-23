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

/** ระยะเว้นจากขอบจอแต่ละด้าน (px) */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * ลูกศรขอบจอชี้ไปที่ (sx, sy) — พิกัดบนจอของกล่อง (อาจอยู่นอกจอ)
 * กล่องอยู่ในจอ → null (เห็นเองแล้ว) · นอกจอ → จุดบนกรอบด้านใน (หดเข้ามาตาม inset แต่ละด้าน)
 * ตามแนวจากกลางจอไปหากล่อง — inset ด้านล่างใหญ่กว่า จะได้ไม่ไปซ่อนหลังแถบกระเป๋า
 */
export function edgeArrow(sx: number, sy: number, width: number, height: number, inset: Insets): EdgeArrow | null {
  if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) return null;
  const cx = width / 2;
  const cy = height / 2;
  const dx = sx - cx;
  const dy = sy - cy;
  const minX = inset.left;
  const maxX = Math.max(minX, width - inset.right);
  const minY = inset.top;
  const maxY = Math.max(minY, height - inset.bottom);
  // ยืดเส้นจากกลางจอจนชนกรอบด้านใน (ด้านที่ชนก่อน)
  const tx = dx > 0 ? (maxX - cx) / dx : dx < 0 ? (minX - cx) / dx : Infinity;
  const ty = dy > 0 ? (maxY - cy) / dy : dy < 0 ? (minY - cy) / dy : Infinity;
  const t = Math.max(0, Math.min(tx, ty));
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return { x: clamp(cx + dx * t, minX, maxX), y: clamp(cy + dy * t, minY, maxY), angle: Math.atan2(dy, dx) };
}

/** ระยะเว้นจากขอบจอ (px) — ด้านล่างพ้นแถบกระเป๋า ด้านบนพ้นป้ายมุมจอ */
const INSETS: Insets = { top: 56, right: 44, bottom: 96, left: 44 };

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

  /** สิ่งที่เขียนลง DOM ครั้งล่าสุด — เรียกทุกเฟรมได้ แต่แตะ DOM เฉพาะตอนเปลี่ยน (มือถือลื่นกว่า) */
  private last = "";

  /** sx, sy = ตำแหน่งกล่องบนจอ · null = ไม่มีกล่องบนเกาะ */
  update(target: { sx: number; sy: number; tiles: number } | null, width: number, height: number): void {
    const arrow = target && edgeArrow(target.sx, target.sy, width, height, INSETS);
    const next = arrow && target ? `${Math.round(arrow.x)},${Math.round(arrow.y)},${arrow.angle.toFixed(2)},${target.tiles}` : "";
    if (next === this.last) return;
    this.last = next;
    this.root.hidden = !arrow;
    if (!arrow || !target) return;
    this.root.style.left = `${Math.round(arrow.x)}px`;
    this.root.style.top = `${Math.round(arrow.y)}px`;
    this.pointer.style.transform = `rotate(${arrow.angle.toFixed(2)}rad)`;
    this.label.textContent = `📦 ${target.tiles} ช่อง`;
  }

  destroy(): void {
    this.root.remove();
  }
}
