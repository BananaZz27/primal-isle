import type { WorldSave, SavedPlayer } from "./worldStore.js";
import type { SavedDino } from "../rooms/dinoSystem.js";
import type { Player, Structure, WorldState } from "../rooms/schema/WorldState.js";

/** ค่าที่ต้องจำของผู้เล่นหนึ่งคน */
export function snapshotPlayer(p: Player): SavedPlayer {
  return {
    x: p.x,
    y: p.y,
    health: p.health,
    hunger: p.hunger,
    thirst: p.thirst,
    colorIndex: p.colorIndex,
    inventory: Object.fromEntries(p.inventory.entries()),
  };
}

/** ถ่ายภาพ state ของห้องเป็นข้อมูลบันทึก — now = เวลาห้อง (ms) */
export function snapshotWorld(
  code: string,
  state: WorldState,
  now: number,
  players: Record<string, SavedPlayer>,
  /** เจ้าของของสิ่งก่อสร้าง (token) — ไม่ได้อยู่ใน state */
  ownerOf: (s: Structure) => string,
  dinos: SavedDino[],
): WorldSave {
  return {
    version: 2,
    code,
    seed: state.seed,
    savedAt: Date.now(),
    nodes: [...state.nodes.entries()].map(([id, n]) => ({ id, hp: n.hp, regrowInMs: Math.max(0, n.regrowAt - now) })),
    structures: [...state.structures.values()].map((s) => ({ kind: s.kind, tx: s.tx, ty: s.ty, owner: ownerOf(s) })),
    drops: [...state.drops.values()].map((d) => ({
      tx: d.tx,
      ty: d.ty,
      expiresInMs: Math.max(0, d.expiresAt - now),
      items: Object.fromEntries(d.items.entries()),
    })),
    players,
    dinos,
  };
}
