import {
  BALANCE,
  findSpawn,
  freshStats,
  inReach,
  nodeDef,
  PLAYER_HALF,
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
    // นาฬิกาของห้องเดินทีละ tick จึงเผื่อให้ 1 tick ไม่งั้นการกดที่ตรงจังหวะพอดีจะถูกปฏิเสธแบบสุ่ม
    if (now - (this.lastGather.get(sessionId) ?? -Infinity) < BALANCE.gatherCooldownMs - TICK_MS) return;
    if (!inReach(player.x, player.y, d.tx, d.ty)) return;

    const key = String(nodeId);
    let node = this.state.nodes.get(key);
    if (node?.hp === 0) return;
    if (!node) {
      node = new NodeState({ hp: def.hits, regrowAt: 0 });
      this.state.nodes.set(key, node);
    }

    this.lastGather.set(sessionId, now);
    node.hp -= 1;
    if (node.hp === 0) node.regrowAt = now + def.regrowSec * 1000;
    this.addItem(player, def.item, 1);
  }

  eat(player: Player, item: unknown): void {
    if (item !== "berry") return;
    const have = player.inventory.get("berry") ?? 0;
    if (have <= 0) return;
    setCount(player, "berry", have - 1);
    player.hunger = Math.min(BALANCE.statMax, player.hunger + BALANCE.berryFood);
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
    const spawn = findSpawn(this.map, player.colorIndex);
    Object.assign(player, spawn, { vx: 0, vy: 0 }, freshStats());
  }

  private regrow(now: number): void {
    for (const [key, node] of this.state.nodes) {
      if (node.hp !== 0 || node.regrowAt > now) continue;
      const d = this.decor[Number(key)];
      // ของแข็งห้ามงอกทับผู้เล่น (ผู้เล่นจะติดในต้นไม้) — รอรอบหน้า
      if (nodeDef(d.kind)?.solid && this.playerOnTile(d.tx, d.ty)) continue;
      this.state.nodes.delete(key);
    }
  }

  private playerOnTile(tx: number, ty: number): boolean {
    for (const p of this.state.players.values()) {
      const left = Math.floor((p.x - PLAYER_HALF) / TILE_SIZE);
      const right = Math.floor((p.x + PLAYER_HALF) / TILE_SIZE);
      const top = Math.floor((p.y - PLAYER_HALF) / TILE_SIZE);
      const bottom = Math.floor((p.y + PLAYER_HALF) / TILE_SIZE);
      if (tx >= left && tx <= right && ty >= top && ty <= bottom) return true;
    }
    return false;
  }

  private addItem(player: Player, item: ItemId, n: number): void {
    setCount(player, item, Math.min(BALANCE.stackMax, (player.inventory.get(item) ?? 0) + n));
  }
}

function setCount(player: Player, item: string, count: number): void {
  if (count <= 0) player.inventory.delete(item);
  else player.inventory.set(item, count);
}
