import { DecorKind, nodeDef, nodeKey, TILE_SIZE, type Decor } from "@primal/shared";
import type { DinoOnScreen } from "../input/feed";
import type { OnTile, Target } from "../input/interact";
import { PLAYER_NAME_Y } from "../render/labelLayout";
import { DINO_LABELS, itemLabel, NODE_LABELS } from "./labels";

/** สิ่งรอบตัวที่ใช้หาตำแหน่ง/ชื่อของเป้า (ชุดเดียวกับที่ส่งให้ pickTarget) */
export interface LabelWorld {
  decor: Decor[];
  drops: OnTile[];
  crates: OnTile[];
  chests: OnTile[];
  dinos: DinoOnScreen[];
  campfires: { tx: number; ty: number }[];
}

/** ป้าย: ข้อความ + จุดกึ่งกลางขอบล่างของป้าย (px ในโลก) */
export interface LabelSpot {
  text: string;
  x: number;
  y: number;
}

/** ช่องว่างระหว่างป้ายกับหัวของสิ่งนั้น */
const GAP = 2;
/** ภาพต้นไม้สูง 2 ช่อง (โคนอยู่ช่องของมัน ยอดยื่นขึ้นไปอีก 1 ช่อง) */
const TREE_HEIGHT_TILES = 2;

/** ป้ายเหนือของบนช่อง (tx, ty) ที่ภาพสูง heightTiles ช่อง */
const aboveTile = (text: string, tx: number, ty: number, heightTiles = 1): LabelSpot => ({
  text,
  x: (tx + 0.5) * TILE_SIZE,
  y: (ty + 1 - heightTiles) * TILE_SIZE - GAP,
});

/**
 * ป้ายบอกว่ากด ✋ แล้วจะทำอะไรกับอะไร — ใช้ผลจาก pickTarget ตัวเดียวกับปุ่ม จึงตรงกันเสมอ
 * เป้าหายไปแล้ว / ไม่มีเป้า → null (ไม่โชว์ป้าย)
 */
export function describeTarget(target: Target, w: LabelWorld, me: { x: number; y: number }): LabelSpot | null {
  const spot = placeTarget(target, w, me);
  return spot && clearOfMyName(spot, me);
}

/** ความสูงโดยประมาณของป้ายชื่อตัวเอง (ตัวอักษร 7px + ขอบ) */
const NAME_HEIGHT = 9;
/** ครึ่งความกว้างของช่วงที่ถือว่า "ทับชื่อ" (ชื่อยาวราว 3 ช่อง) */
const NAME_HALF_WIDTH = 1.5 * TILE_SIZE;

/** เป้าอยู่ติดตัว → ป้ายจะทับชื่อตัวเอง ยกขึ้นไปไว้เหนือชื่อ (แนวนอนยังตรงกับเป้า) */
function clearOfMyName(spot: LabelSpot, me: { x: number; y: number }): LabelSpot {
  const nameTop = me.y + PLAYER_NAME_Y - NAME_HEIGHT;
  const overlapsName = Math.abs(spot.x - me.x) < NAME_HALF_WIDTH && spot.y > nameTop && spot.y < me.y + TILE_SIZE;
  return overlapsName ? { ...spot, y: nameTop } : spot;
}

/** ป้ายเหนือตัวเป้า (ยังไม่สนว่าทับชื่อเราไหม) */
function placeTarget(target: Target, w: LabelWorld, me: { x: number; y: number }): LabelSpot | null {
  if (!target) return null;
  switch (target.kind) {
    case "node": {
      const d = w.decor[target.id];
      const def = d && nodeDef(d.kind);
      if (!d || !def) return null;
      const name = NODE_LABELS[nodeKey(d.kind) ?? ""] ?? "";
      return aboveTile(`${name} → ${itemLabel(def.item)}`, d.tx, d.ty, d.kind === DecorKind.Tree ? TREE_HEIGHT_TILES : 1);
    }
    case "drop": {
      const b = w.drops.find((x) => x.key === target.key);
      return b ? aboveTile("🎒 ถุงของ → เก็บคืน", b.tx, b.ty) : null;
    }
    case "crate": {
      // ภาพลังมีร่มชูชีพสูง 1.5 ช่อง
      const c = w.crates.find((x) => x.key === target.key);
      return c ? aboveTile("📦 กล่องเสบียง → เปิด", c.tx, c.ty, 1.5) : null;
    }
    case "chest": {
      const c = w.chests.find((x) => x.key === target.key);
      return c ? aboveTile("กล่องเก็บของ → เปิด", c.tx, c.ty) : null;
    }
    case "dino": {
      const d = w.dinos.find((x) => x.key === target.key);
      // เหนือหลอดเลือดของไดโน (หลอดเลือดอยู่สูงกว่าตัวราว 1 ช่อง)
      return d ? { text: `${DINO_LABELS[d.kind] ?? d.kind} → ตี`, x: d.x, y: d.y - TILE_SIZE - GAP } : null;
    }
    case "campfire": {
      const fire = nearest(me, w.campfires);
      return fire ? aboveTile("🔥 กองไฟ → ย่าง", fire.tx, fire.ty) : null;
    }
    case "water":
      // น้ำไม่ได้อยู่ที่จุดเดียว → ป้ายขึ้นเหนือป้ายชื่อตัวเอง (clearOfMyName ยกให้)
      return { text: "💧 ดื่มน้ำ", x: me.x, y: me.y };
  }
}

function nearest<T extends { tx: number; ty: number }>(me: { x: number; y: number }, list: T[]): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const c of list) {
    const d = Math.hypot(me.x - (c.tx + 0.5) * TILE_SIZE, me.y - (c.ty + 0.5) * TILE_SIZE);
    if (d < bestDist) [best, bestDist] = [c, d];
  }
  return best;
}
