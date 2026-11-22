import {
  BALANCE,
  dinoDef,
  FOOD,
  hitboxTouches,
  isDinoKind,
  findSpawn,
  gatherYield,
  freshStats,
  inReach,
  nodeDef,
  solidFromNodes,
  TILE_SIZE,
  tickStats,
  touchesWater,
  type Decor,
  type ItemId,
  TICK_RATE,
  type WorldMap,
} from "@primal/shared";

const TICK_MS = 1000 / TICK_RATE;
import { NodeState, type Player, type WorldState } from "./schema/WorldState.js";

/**
 * ระบบเอาชีวิตรอดฝั่งเซิร์ฟเวอร์ (ตัวตัดสินจริง):
 * เก็บทรัพยากร, กิน, ดื่ม, ค่าสถานะลดตามเวลา, สลบแล้วฟื้น, ทรัพยากรงอกคืน
 * คำขอที่ผิด (id มั่ว / ไกลเกิน / ถี่เกิน / ไม่มีของ) ถูกเมินเงียบๆ
 */
export class SurvivalSystem {
  private lastGather = new Map<string, number>();
  /** ช่องนี้ชนไหม — ใช้กับ stepPlayer (ต้นไม้/หินที่ยังไม่หมด) */
  readonly solid: (tx: number, ty: number) => boolean;

  constructor(
    private state: WorldState,
    private map: WorldMap,
    private decor: Decor[],
    private hooks: {
      /** ก่อนฟื้น: เช่น ทำถุงของตกที่จุดตาย */
      onDeath?: (player: Player) => void;
      /** จุดฟื้น (เช่น ที่นอน) — null = จุดเกิดปกติ */
      respawnPoint?: (player: Player) => { x: number; y: number } | null;
    } = {},
  ) {
    this.solid = solidFromNodes(map, decor, (id) => this.isDepleted(id));
  }

  isDepleted(id: number): boolean {
    return this.state.nodes.get(String(id))?.hp === 0;
  }

  gather(sessionId: string, player: Player, nodeId: unknown, now: number): void {
    if (typeof nodeId !== "number" || !Number.isInteger(nodeId)) return;
    const d = this.decor[nodeId];
    const def = d && nodeDef(d.kind);
    if (!def) return;
    if (!this.ready(sessionId, now)) return;
    if (!inReach(player.x, player.y, d.tx, d.ty)) return;

    const key = String(nodeId);
    let node = this.state.nodes.get(key);
    if (node?.hp === 0) return;
    if (!node) {
      node = new NodeState({ hp: def.hits, regrowAt: 0 });
      this.state.nodes.set(key, node);
    }

    this.acted(sessionId, now);
    node.hp -= 1;
    if (node.hp === 0) node.regrowAt = now + def.regrowSec * 1000;
    this.addItem(player, def.item, gatherYield(def.item, (item) => player.inventory.get(item) ?? 0));
  }

  /**
   * คูลดาวน์ของ "การตี" (เก็บของและตีไดโนใช้ร่วมกัน)
   * นาฬิกาของห้องเดินทีละ tick จึงเผื่อให้ 1 tick ไม่งั้นการกดที่ตรงจังหวะพอดีจะถูกปฏิเสธแบบสุ่ม
   */
  ready(sessionId: string, now: number): boolean {
    return now - (this.lastGather.get(sessionId) ?? -Infinity) >= BALANCE.gatherCooldownMs - TICK_MS;
  }

  /** บันทึกว่าเพิ่งตีไป (เรียกหลังตีสำเร็จ) */
  acted(sessionId: string, now: number): void {
    this.lastGather.set(sessionId, now);
  }

  eat(player: Player, item: unknown): void {
    if (typeof item !== "string" || !Object.prototype.hasOwnProperty.call(FOOD, item)) return;
    const food = FOOD[item as ItemId]!;
    const have = player.inventory.get(item) ?? 0;
    if (have <= 0) return;
    setCount(player, item, have - 1);
    player.hunger = Math.min(BALANCE.statMax, player.hunger + food);
  }

  drink(player: Player): void {
    if (!touchesWater(this.map, player.x, player.y)) return;
    player.thirst = Math.min(BALANCE.statMax, player.thirst + BALANCE.drinkAmount);
  }

  /** เรียกทุก tick */
  tick(dt: number, now: number): void {
    for (const player of this.state.players.values()) {
      if (tickStats(player, dt).died) this.respawn(player);
    }
    this.regrow(now);
  }

  forget(sessionId: string): void {
    this.lastGather.delete(sessionId);
  }

  private respawn(player: Player): void {
    this.hooks.onDeath?.(player);
    const spawn = this.hooks.respawnPoint?.(player) ?? findSpawn(this.map, player.colorIndex);
    Object.assign(player, spawn, { vx: 0, vy: 0 }, freshStats());
  }

  private regrow(now: number): void {
    for (const [key, node] of this.state.nodes) {
      if (node.hp !== 0 || node.regrowAt > now) continue;
      const d = this.decor[Number(key)];
      // ของแข็งห้ามงอกทับผู้เล่นหรือไดโน (จะติดในต้นไม้) — รอรอบหน้า
      if (nodeDef(d.kind)?.solid && this.bodyOnTile(d.tx, d.ty)) continue;
      this.state.nodes.delete(key);
    }
  }

  private bodyOnTile(tx: number, ty: number): boolean {
    for (const p of this.state.players.values()) if (hitboxTouches(p.x, p.y, tx, ty)) return true;
    for (const d of this.state.dinos.values())
      if (isDinoKind(d.kind) && hitboxTouches(d.x, d.y, tx, ty, dinoDef(d.kind).half)) return true;
    return false;
  }

  private addItem(player: Player, item: ItemId, n: number): void {
    setCount(player, item, Math.min(BALANCE.stackMax, (player.inventory.get(item) ?? 0) + n));
  }
}

export function setCount(player: Player, item: string, count: number): void {
  if (count <= 0) player.inventory.delete(item);
  else player.inventory.set(item, count);
}
