import {
  BALANCE,
  dinoDef,
  inPlaceReach,
  isDinoKind,
  inReach,
  isStructureKind,
  placeCheck,
  STRUCTURE_DEFS,
  TILE_SIZE,
  type Decor,
  type ItemId,
  type WorldMap,
} from "@primal/shared";
import { Drop, Structure, type Player, type WorldState } from "./schema/WorldState.js";
import { setCount } from "./survivalSystem.js";

/**
 * สิ่งก่อสร้างและถุงของ (ฝั่งเซิร์ฟเวอร์ = ตัวตัดสินจริง):
 * วาง/รื้อ, กำแพงชนได้, ที่นอนเป็นจุดฟื้น, ตายแล้วของตกเป็นถุง, เก็บถุง, ถุงหายตามเวลา
 */
export class BuildingSystem {
  private occupied: Set<number>;
  private solidTiles = new Set<number>();
  private doorTiles = new Set<number>();
  private nextStructure = 0;
  /** เจ้าของของแต่ละชิ้น (token) — เก็บนอก state เพื่อไม่ให้ส่งออกทางเน็ต */
  private owners = new Map<Structure, string>();
  private nextDrop = 0;

  constructor(
    private state: WorldState,
    private map: WorldMap,
    decor: Decor[],
    /** id เจ้าของของผู้เล่นคนนี้ (token หรือ sessionId) */
    private playerOwner: (player: Player) => string,
  ) {
    this.occupied = new Set(decor.map((d) => this.key(d.tx, d.ty)));
  }

  /** ช่องนี้มีประตูไหม (คนเดินผ่านได้ ไดโนป่าผ่านไม่ได้) */
  readonly door = (tx: number, ty: number): boolean => this.doorTiles.has(this.key(tx, ty));

  /** ช่องนี้มีกำแพงไหม (รวมกับการชนของทรัพยากรในห้อง) */
  readonly solid = (tx: number, ty: number): boolean => this.solidTiles.has(this.key(tx, ty));

  place(player: Player, msg: unknown): void {
    const { item, tx, ty } = (msg ?? {}) as { item?: unknown; tx?: unknown; ty?: unknown };
    if (!isStructureKind(item)) return;
    const have = player.inventory.get(item) ?? 0;
    if (have <= 0) return;
    const world = {
      map: this.map,
      occupied: (x: number, y: number) => this.occupied.has(this.key(x, y)),
      structures: [...this.state.structures.values()],
      // ห้ามวางทับคนหรือไดโน (จะติดในกำแพง)
      players: [
        ...this.state.players.values(),
        ...[...this.state.dinos.values()].filter((d) => isDinoKind(d.kind)).map((d) => ({ x: d.x, y: d.y, half: dinoDef(d.kind as never).half })),
      ],
    };
    if (!placeCheck(world, player, item, tx, ty)) return;

    const owner = this.playerOwner(player);
    if (item === "bed") {
      // คนละ 1 ที่นอน: วางใหม่ = ย้าย (ที่นอนเก่ากลับเข้ากระเป๋า)
      for (const [k, s] of this.state.structures) if (s.kind === "bed" && this.owners.get(s) === owner) this.remove(k, player);
    }
    setCount(player, item, (player.inventory.get(item) ?? 0) - 1);
    this.add(item, tx as number, ty as number, owner);
  }

  demolish(player: Player, msg: unknown): void {
    const key = (msg as { key?: unknown } | null)?.key;
    if (typeof key !== "string") return;
    const s = this.state.structures.get(key);
    // ระยะรื้อ = ระยะวาง: ของที่เพิ่งวางต้องรื้อคืนได้จากจุดเดิม
    if (!s || !inPlaceReach(player.x, player.y, s.tx, s.ty)) return;
    this.remove(key, player);
  }

  pickup(player: Player, msg: unknown, now: number): void {
    const key = (msg as { key?: unknown } | null)?.key;
    if (typeof key !== "string") return;
    const drop = this.state.drops.get(key);
    if (!drop || drop.expiresAt <= now || !inReach(player.x, player.y, drop.tx, drop.ty)) return;
    for (const [item, n] of [...drop.items.entries()]) {
      const room = BALANCE.stackMax - (player.inventory.get(item) ?? 0);
      const take = Math.min(room, n);
      if (take > 0) setCount(player, item, (player.inventory.get(item) ?? 0) + take);
      if (n - take > 0) drop.items.set(item, n - take);
      else drop.items.delete(item);
    }
    if (drop.items.size === 0) this.state.drops.delete(key);
  }

  /** ผู้เล่นสลบ: ย้ายของทั้งกระเป๋าไปเป็นถุงที่จุดตาย */
  dropBag(player: Player, now: number): void {
    if (player.inventory.size === 0) return;
    const drop = new Drop({
      tx: Math.floor(player.x / TILE_SIZE),
      ty: Math.floor(player.y / TILE_SIZE),
      expiresAt: now + BALANCE.dropDespawnSec * 1000,
    });
    for (const [item, n] of player.inventory.entries()) drop.items.set(item, n);
    player.inventory.clear();
    this.state.drops.set(String(this.nextDrop++), drop);
  }

  /** จุดฟื้นของผู้เล่น: กลางช่องที่นอนของตัวเอง ถ้ามี */
  bedFor(player: Player): { x: number; y: number } | null {
    const owner = this.playerOwner(player);
    for (const s of this.state.structures.values()) {
      if (s.kind === "bed" && this.owners.get(s) === owner) {
        return { x: s.tx * TILE_SIZE + TILE_SIZE / 2, y: s.ty * TILE_SIZE + TILE_SIZE / 2 };
      }
    }
    return null;
  }

  tick(now: number): void {
    for (const [k, d] of this.state.drops) if (d.expiresAt <= now) this.state.drops.delete(k);
  }

  /** เจ้าของของชิ้นนี้ (ใช้ตอนบันทึกไฟล์เท่านั้น) */
  structureOwner(s: Structure): string {
    return this.owners.get(s) ?? "";
  }

  /** ใช้ตอนโหลดโลกจากไฟล์ */
  restore(kind: string, tx: number, ty: number, owner: string): void {
    if (isStructureKind(kind)) this.add(kind, tx, ty, owner);
  }

  private add(kind: string, tx: number, ty: number, owner: string) {
    const s = new Structure({ kind, tx, ty });
    this.owners.set(s, owner);
    this.state.structures.set(String(this.nextStructure++), s);
    if (isStructureKind(kind) && STRUCTURE_DEFS[kind].solid) this.solidTiles.add(this.key(tx, ty));
    if (kind === "door") this.doorTiles.add(this.key(tx, ty));
  }

  private remove(key: string, refundTo: Player) {
    const s = this.state.structures.get(key);
    if (!s) return;
    this.state.structures.delete(key);
    this.owners.delete(s);
    this.solidTiles.delete(this.key(s.tx, s.ty));
    this.doorTiles.delete(this.key(s.tx, s.ty));
    const item = s.kind as ItemId;
    setCount(refundTo, item, Math.min(BALANCE.stackMax, (refundTo.inventory.get(item) ?? 0) + 1));
  }

  private key(tx: number, ty: number) {
    return ty * this.map.size + tx;
  }
}
