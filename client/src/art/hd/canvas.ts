/**
 * ชุดเครื่องมือวาดภาพพิกเซล 32px (ขั้นที่ 8) — ไม่แตะ Phaser จึงเทสต์ได้และสร้างภาพตัวอย่างนอกเกมได้
 *
 * แนวคิด: ทุกวัสดุมี "ramp" (สีเรียงจากมืดไปสว่าง) · แสงมาจากซ้ายบนเสมอ (LIGHT) → ทั้งเกมเข้ากัน
 * รูปทรงคำนวณ "ความสว่าง 0..1" ต่อพิกเซล แล้วเลือกสีจาก ramp ด้วย dither แบบ Bayer (ไล่สีแบบพิกเซลอาร์ต)
 */

/** สีเรียงจากมืดสุด → สว่างสุด (#rrggbb) */
export type Ramp = readonly string[];

/** ทิศแสง (ซ้ายบน หน้าจอ) — x ขวา, y ลง, z ออกจากจอ · ความยาว 1 */
export const LIGHT = normalize([-0.55, -0.7, 0.45]);

function normalize(v: number[]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** ตาราง Bayer 4×4 (ค่า 0..1) ใช้ตัดสินว่าพิกเซลไหนได้สีขั้นถัดไป */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** เลือกสีจาก ramp ตามความสว่าง 0..1 พร้อม dither ที่ตำแหน่ง (x, y) */
export function rampAt(ramp: Ramp, light: number, x: number, y: number, dither = true): string {
  const t = Math.min(0.999, Math.max(0, light)) * (ramp.length - 1);
  const base = Math.floor(t);
  const frac = t - base;
  const step = dither && frac > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : frac > 0.5 && !dither ? 1 : 0;
  return ramp[Math.min(ramp.length - 1, base + step)];
}

/** ตัวสุ่มแบบกำหนด seed (mulberry32) — ภาพเดิมทุกครั้งที่เปิดเกม */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** ทำสีให้มืดลง (0..1 = สัดส่วนที่เหลือ) */
export function darken(hex: string, keep: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.round(v * keep).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** ผืนภาพ RGBA ขนาด width × height */
export class PixelCanvas {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** alpha 0..255 */
  alpha(x: number, y: number): number {
    return this.inside(x, y) ? this.data[(y * this.width + x) * 4 + 3] : 0;
  }

  get(x: number, y: number): string {
    const i = (y * this.width + x) * 4;
    const h = (v: number) => v.toString(16).padStart(2, "0");
    return `#${h(this.data[i])}${h(this.data[i + 1])}${h(this.data[i + 2])}`;
  }

  /** ระบายสี (alpha 0..1 — ถ้า < 1 ผสมกับสีเดิม เช่นเงา) */
  set(x: number, y: number, hex: string, alpha = 1): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.width + x) * 4;
    const [r, g, b] = hexToRgb(hex);
    if (alpha >= 1) {
      this.data.set([r, g, b, 255], i);
      return;
    }
    const a0 = this.data[i + 3] / 255;
    const a = alpha + a0 * (1 - alpha);
    const mix = (c: number, c0: number) => (c * alpha + c0 * a0 * (1 - alpha)) / (a || 1);
    this.data.set([mix(r, this.data[i]), mix(g, this.data[i + 1]), mix(b, this.data[i + 2]), a * 255], i);
  }

  /**
   * ทรงรีลงเงาแบบทรงกลม (แสงซ้ายบน) — lift เลื่อนความสว่างทั้งก้อน (+ สว่างขึ้น / − มืดลง)
   * dither = false: ไล่สีเป็นขั้นเรียบ (ผิวหน้าคน — dither ดูเหมือนหนวด/รอยเปื้อน)
   */
  sphere(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, lift = 0, dither = true): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        const nz = Math.sqrt(1 - d);
        const lambert = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        this.set(x, y, rampAt(ramp, 0.15 + 0.85 * Math.max(0, lambert) + lift, x, y, dither));
      }
    }
  }

  /** สี่เหลี่ยมทึบ ไล่แสงจากซ้าย (สว่าง) ไปขวา (มืด) แบบทรงกระบอกตั้ง */
  cylinder(x0: number, y0: number, w: number, h: number, ramp: Ramp, lift = 0): void {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const nx = ((x + 0.5 - x0) / w) * 2 - 1;
        const lambert = nx * LIGHT[0] + Math.sqrt(Math.max(0, 1 - nx * nx)) * LIGHT[2];
        this.set(x, y, rampAt(ramp, 0.2 + 0.8 * Math.max(0, lambert) + lift, x, y));
      }
    }
  }

  /** หลายเหลี่ยมทึบ (จุดเรียงรอบรูป) — light = ความสว่างคงที่ 0..1 */
  polygon(points: [number, number][], ramp: Ramp, light: number): void {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, rampAt(ramp, light, x, y));
    }
  }

  /** เส้นตรงหนา 1 พิกเซล */
  line(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, hex);
  }

  /** เงาบนพื้นใต้วัตถุ (วงรีดำโปร่ง) */
  shadow(cx: number, cy: number, rx: number, ry: number, alpha = 0.28): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, "#000000", alpha);
      }
  }

  /**
   * เส้นขอบรอบรูป: พิกเซลโปร่งที่ติดพิกเซลทึบ → สีของเพื่อนบ้านที่มืดลง (selective outline ดูนุ่มกว่าขอบดำล้วน)
   * ข้ามพิกเซลเงา (alpha ต่ำ)
   */
  outline(keep = 0.42): void {
    const solid = (x: number, y: number) => this.alpha(x, y) > 200;
    const marks: [number, number, string][] = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        if (solid(x, y)) continue;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
          if (!solid(x + dx, y + dy)) continue;
          marks.push([x, y, darken(this.get(x + dx, y + dy), keep)]);
          break;
        }
      }
    for (const [x, y, c] of marks) this.set(x, y, c);
  }
}
