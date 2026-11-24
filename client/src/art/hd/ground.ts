import { Tile, tileAt, type WorldMap } from "@primal/shared";
import { darken, PixelCanvas, rampAt, rng } from "./canvas";
import { grassTile, RAMPS } from "./nature";

/**
 * พื้นเกาะ HD แบบ "dual grid":
 * - พื้นซ้อนเป็นชั้น น้ำ (ล่างสุด) → ทราย → หญ้า → ป่า · ช่องที่เป็นป่านับว่าถึงชั้นหญ้าและทรายด้วย
 * - ช่องภาพของแต่ละชั้นวางที่ "มุม" ระหว่างช่องโลก 4 ช่อง → รูปขอบมีแค่ 16 แบบต่อชั้น (มุมไหนถึงชั้นนี้บ้าง)
 * - ขอบเป็นคลื่นจากสัญญาณรบกวนที่ "เป็นศูนย์ที่ขอบช่อง" → ช่องที่อยู่ติดกันต่อกันสนิทเสมอ
 * ไม่แตะ Phaser จึงเทสต์ได้
 */

export const LAYERS = ["sand", "grass", "forest"] as const;
export type GroundLayer = (typeof LAYERS)[number];

/** ชั้นของพื้นแต่ละชนิด (น้ำ 0 … ป่า 3) */
const RANK: Record<Tile, number> = { [Tile.Water]: 0, [Tile.Sand]: 1, [Tile.Grass]: 2, [Tile.Forest]: 3 };
const LAYER_RANK: Record<GroundLayer, Tile> = { sand: Tile.Sand, grass: Tile.Grass, forest: Tile.Forest };

/**
 * มุม (i, j) ของ dual grid = มุมร่วมของช่องโลก (i-1, j-1) (i, j-1) (i-1, j) (i, j)
 * บิต: ซ้ายบน 1 · ขวาบน 2 · ซ้ายล่าง 4 · ขวาล่าง 8 — ตั้งเมื่อช่องนั้นถึงชั้น level
 */
export function cornerMask(map: WorldMap, i: number, j: number, level: Tile): number {
  const at = (tx: number, ty: number) => RANK[tileAt(map, tx, ty)] >= RANK[level];
  return (at(i - 1, j - 1) ? 1 : 0) | (at(i, j - 1) ? 2 : 0) | (at(i - 1, j) ? 4 : 0) | (at(i, j) ? 8 : 0);
}

/** จำนวนแบบลายของช่องที่เต็ม (สุ่มตามตำแหน่ง ลดความซ้ำ) */
const FULL_VARIANTS = 4;
export const TILESET_COLUMNS = 16;

/**
 * เลขเฟรมใน tileset · water: 0..3 · แต่ละชั้น: รูปขอบ 1..14 (+ แบบ 15 = เต็ม มี 4 ลาย) · ดอกไม้ 2 แบบท้ายสุด
 * mask 0 (ไม่มีชั้นนี้เลย) → -1
 */
export function frameOf(layer: GroundLayer | "water", mask: number, variant: number): number {
  if (layer === "water") return variant % FULL_VARIANTS;
  if (mask === 0) return -1;
  const base = FULL_VARIANTS + LAYERS.indexOf(layer) * (14 + FULL_VARIANTS);
  return mask === 15 ? base + 14 + (variant % FULL_VARIANTS) : base + mask - 1;
}
export const FLOWER_FRAME = (variant: number) => FULL_VARIANTS + LAYERS.length * (14 + FULL_VARIANTS) + (variant % 2);
const FRAME_COUNT = FLOWER_FRAME(1) + 1;

/** สุ่มลายตามตำแหน่ง (เหมือนเดิมทุกครั้ง) */
const variantAt = (i: number, j: number) => ((i * 73856093) ^ (j * 19349663)) >>> 0;

export interface DualFrames {
  water: number[][];
  sand: number[][];
  grass: number[][];
  forest: number[][];
}

/** เฟรมของทุกชั้น ขนาด (size+1)² — วางที่ตำแหน่งโลก (i - 0.5, j - 0.5) ช่อง */
export function dualFrames(map: WorldMap): DualFrames {
  const n = map.size + 1;
  const grid = (f: (i: number, j: number) => number) => Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => f(i, j)));
  return {
    water: grid((i, j) => frameOf("water", 15, variantAt(i, j))),
    sand: grid((i, j) => frameOf("sand", cornerMask(map, i, j, LAYER_RANK.sand), variantAt(i, j))),
    grass: grid((i, j) => frameOf("grass", cornerMask(map, i, j, LAYER_RANK.grass), variantAt(i, j))),
    forest: grid((i, j) => frameOf("forest", cornerMask(map, i, j, LAYER_RANK.forest), variantAt(i, j))),
  };
}

// ---------- ลายพื้นผิว (ต่อกันได้ทุก 32 พิกเซล) ----------

const WATER = ["#1d4f7a", "#24628f", "#2c74a3", "#3a88b6", "#5aa3cc"];
const SAND = ["#b08a52", "#c9a467", "#dcbb7e", "#ead095", "#f4e2b0"];
const FOREST = ["#1f3d1c", "#284d24", "#315c2b", "#3c6c33", "#4f8040"];
const LITTER = ["#4a3620", "#6a4c2a", "#8a6838"];
const FOAM = "#eaf6f8";

const TAU = Math.PI * 2;

function waterTex(variant: number): (x: number, y: number) => string {
  const r = rng(7000 + variant);
  const ph = [r() * TAU, r() * TAU, r() * TAU];
  return (x, y) => {
    const a = TAU / 32;
    const w = Math.sin(x * a * 2 + ph[0] + Math.sin(y * a * 2 + ph[1]) * 1.2) * 0.5 + Math.sin(y * a * 3 + ph[2]) * 0.25;
    // คลื่นสะท้อนแสงเป็นขีดสั้นแนวนอน
    const glint = w > 0.62 ? 0.35 : 0;
    return rampAt(WATER, 0.45 + w * 0.12 + glint, x, y, false);
  };
}

function sandTex(variant: number): (x: number, y: number) => string {
  const r = rng(7100 + variant);
  const dots = new Set<number>();
  for (let i = 0; i < 40; i++) dots.add(Math.floor(r() * 32) + Math.floor(r() * 32) * 32);
  return (x, y) => {
    const a = TAU / 32;
    const w = Math.sin(x * a + variant) * Math.cos(y * a * 2 - variant) * 0.08;
    if (dots.has((x & 31) + (y & 31) * 32)) return SAND[(x + y) % 3 === 0 ? 1 : 4];
    return rampAt(SAND, 0.55 + w, x, y, false);
  };
}

function grassTex(variant: number): (x: number, y: number) => string {
  const t = grassTile(variant);
  return (x, y) => t.get(x & 31, y & 31);
}

function forestTex(variant: number): (x: number, y: number) => string {
  const r = rng(7300 + variant);
  const litter = new Map<number, string>();
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 32);
    const y = Math.floor(r() * 32);
    const col = LITTER[Math.floor(r() * 3)];
    litter.set(x + y * 32, col);
    litter.set(((x + 1) & 31) + y * 32, col);
  }
  return (x, y) => {
    const a = TAU / 32;
    const w = Math.sin(x * a * 2 + variant) * 0.5 + Math.cos(y * a * 2 - variant * 2) * 0.4;
    return litter.get((x & 31) + (y & 31) * 32) ?? FOREST[w > 0.5 ? 3 : w < -0.5 ? 1 : 2];
  };
}

/** สัญญาณรบกวนของรูปขอบ (คงที่ต่อชั้น+รูป) */
function edgeNoise(seed: number): (x: number, y: number) => number {
  const r = rng(seed);
  const p = [r() * TAU, r() * TAU, r() * TAU];
  return (x, y) => Math.sin(x * 0.45 + p[0]) * 0.5 + Math.sin(y * 0.41 + p[1]) * 0.5 + Math.sin((x - y) * 0.27 + p[2]) * 0.4;
}

/**
 * ค่า "อยู่ในชั้นนี้" 0..1 ของพิกเซล (x, y) ในช่องรูป mask — > 0.5 = ในชั้น
 * u, v = x/31, y/31 → พิกเซลขอบประเมินตรงขอบช่องพอดี และสัญญาณรบกวนเป็นศูนย์ที่ขอบ → ต่อกันสนิท
 */
function coverage(mask: number, x: number, y: number, noise: (x: number, y: number) => number): number {
  const u = x / 31;
  const v = y / 31;
  const c = (bit: number) => ((mask & bit) !== 0 ? 1 : 0);
  const bilinear = c(1) * (1 - u) * (1 - v) + c(2) * u * (1 - v) + c(4) * (1 - u) * v + c(8) * u * v;
  return bilinear + noise(x, y) * 0.22 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
}

/** ดอกไม้เล็กๆ บนหญ้า (2 แบบ) */
function flower(c: PixelCanvas, ox: number, oy: number, variant: number): void {
  const r = rng(7500 + variant);
  const petals = variant === 0 ? ["#f4f1ea", "#f2d14b"] : ["#e86a8a", "#fbe8a0"];
  for (let i = 0; i < 3; i++) {
    const x = ox + 6 + i * 9 + Math.floor(r() * 3);
    const y = oy + 9 + Math.floor(r() * 14);
    c.line(x, y + 2, x, y + 6, RAMPS.grass[1]); // ก้าน
    c.set(x + 1, y + 5, RAMPS.grass[3]); // ใบ
    // กลีบ 8 ทิศรอบเกสร
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]] as const) c.set(x + dx, y + dy, petals[0]);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) c.set(x + dx, y + dy, petals[0]);
    c.set(x, y, petals[1]);
    c.set(x + 2, y + 1, darken(petals[0], 0.75)); // เงากลีบด้านขวาล่าง
  }
}

/** แผ่นภาพพื้นทั้งหมด (TILESET_COLUMNS คอลัมน์ ช่องละ 32×32) */
export function groundTileset(): PixelCanvas {
  const rows = Math.ceil(FRAME_COUNT / TILESET_COLUMNS);
  const c = new PixelCanvas(TILESET_COLUMNS * 32, rows * 32);
  const origin = (frame: number) => [(frame % TILESET_COLUMNS) * 32, Math.floor(frame / TILESET_COLUMNS) * 32] as const;

  for (let v = 0; v < FULL_VARIANTS; v++) {
    const [ox, oy] = origin(frameOf("water", 15, v));
    const tex = waterTex(v);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) c.set(ox + x, oy + y, tex(x, y));
  }

  const textures: Record<GroundLayer, (v: number) => (x: number, y: number) => string> = { sand: sandTex, grass: grassTex, forest: forestTex };
  LAYERS.forEach((layer, li) => {
    for (let mask = 1; mask < 16; mask++) {
      const variants = mask === 15 ? FULL_VARIANTS : 1;
      for (let v = 0; v < variants; v++) {
        const [ox, oy] = origin(frameOf(layer, mask, v));
        const tex = textures[layer](v);
        const noise = edgeNoise(8000 + li * 100 + mask);
        for (let y = 0; y < 32; y++)
          for (let x = 0; x < 32; x++) {
            const k = coverage(mask, x, y, noise);
            if (k > 0.5) {
              // ริมขอบด้านในมืดลงนิด: ทรายเปียกริมน้ำ / ขอบหญ้า / ขอบป่า
              const edge = k < 0.56;
              const base = tex(x, y);
              c.set(ox + x, oy + y, edge ? (layer === "sand" ? SAND[1] : layer === "grass" ? RAMPS.grass[1] : FOREST[0]) : base);
            } else if (layer === "sand" && k > 0.42) {
              c.set(ox + x, oy + y, FOAM, 0.45); // ฟองคลื่นริมหาด (โปร่ง)
            }
          }
      }
    }
  });

  for (let v = 0; v < 2; v++) {
    const [ox, oy] = origin(FLOWER_FRAME(v));
    flower(c, ox, oy, v);
  }
  return c;
}
