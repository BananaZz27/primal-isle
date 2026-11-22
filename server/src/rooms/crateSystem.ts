import { BALANCE, crateSpawnOk, inReach, rollLoot, type ItemId, type SolidFn, type WorldMap } from "@primal/shared";
import { Crate, type Player, type WorldState } from "./schema/WorldState.js";
import { setCount } from "./survivalSystem.js";

/** กล่องเสบียงที่บันทึกลงไฟล์ */
export interface SavedCrate {
  tx: number;
  ty: number;
  expiresInMs: number;
}

const SPAWN_TRIES = 300;

/**
 * กล่องเสบียงจากโลกปัจจุบัน (ฝั่งเซิร์ฟเวอร์ = ตัวตัดสินจริง):
 * ตกทุก crateEverySec (บนเกาะพร้อมกันไม่เกิน maxCrates), หายเองใน crateDespawnSec,
 * เปิดได้ครั้งเดียว (คนแรกที่เปิดได้ของ) — ของข้างในสุ่มตอนเปิด
 */
export class CrateSystem {
  private nextId = 0;
  private nextDropAt: number;

  constructor(
    private state: WorldState,
    private map: WorldMap,
    private solid: SolidFn,
    now: number,
    private rand: () => number = Math.random,
  ) {
    this.nextDropAt = now + BALANCE.crateEverySec * 1000;
  }

  /** วางกล่องที่ช่องนี้ (คืน key) */
  spawnAt(tx: number, ty: number, now: number, expiresInMs = BALANCE.crateDespawnSec * 1000): string {
    const key = String(this.nextId++);
    this.state.crates.set(key, new Crate({ tx, ty, expiresAt: now + expiresInMs }));
    return key;
  }

  /** สุ่มที่ตกที่ถูกกติกา — หาไม่ได้คืน null */
  spawnRandom(now: number): string | null {
    const players = [...this.state.players.values()];
    for (let i = 0; i < SPAWN_TRIES; i++) {
      const tx = Math.floor(this.rand() * this.map.size);
      const ty = Math.floor(this.rand() * this.map.size);
      if (this.taken(tx, ty) || !crateSpawnOk(this.map, this.solid, tx, ty, players)) continue;
      return this.spawnAt(tx, ty, now);
    }
    return null;
  }

  /** ผู้เล่นเปิดกล่อง (ข้อความ open {key}) */
  open(player: Player, msg: unknown, now: number): void {
    const key = (msg as { key?: unknown } | null)?.key;
    if (typeof key !== "string") return;
    const crate = this.state.crates.get(key);
    if (!crate || crate.expiresAt <= now || !inReach(player.x, player.y, crate.tx, crate.ty)) return;
    this.state.crates.delete(key); // ลบก่อนแจกของ: คนที่สองที่เปิดพร้อมกันจะไม่เจอกล่องแล้ว
    for (const [item, n] of Object.entries(rollLoot(this.rand)) as [ItemId, number][]) {
      setCount(player, item, Math.min(BALANCE.stackMax, (player.inventory.get(item) ?? 0) + n));
    }
  }

  /** เรียกทุก tick */
  tick(now: number): void {
    for (const [k, c] of this.state.crates) if (c.expiresAt <= now) this.state.crates.delete(k);
    if (now < this.nextDropAt) return;
    this.nextDropAt = now + BALANCE.crateEverySec * 1000;
    if (this.state.crates.size < BALANCE.maxCrates) this.spawnRandom(now);
  }

  snapshot(now: number): SavedCrate[] {
    return [...this.state.crates.values()].map((c) => ({ tx: c.tx, ty: c.ty, expiresInMs: Math.max(0, c.expiresAt - now) }));
  }

  restore(saved: SavedCrate[], now: number): void {
    for (const c of saved) this.spawnAt(c.tx, c.ty, now, c.expiresInMs);
  }

  private taken(tx: number, ty: number): boolean {
    for (const c of this.state.crates.values()) if (c.tx === tx && c.ty === ty) return true;
    return false;
  }
}
