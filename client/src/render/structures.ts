import Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import { STRUCTURE_DEFS, isStructureKind, TILE_SIZE } from "@primal/shared";
import type { Drop, Structure } from "@primal/server/schema";
import { TEX } from "../art/textures";
import { HD_SCALE } from "../display";
import type { WorldRoom } from "../net/connection";

/** ชื่อ animation เปลวไฟ */
export const CAMPFIRE_ANIM = "campfire-burn";

interface Placed {
  key: string;
  kind: string;
  tx: number;
  ty: number;
}

/**
 * วาดสิ่งที่ผู้เล่นวาง (กองไฟ กำแพง ประตู ที่นอน กล่องเก็บของ) และถุงของที่ตก ตาม state — เพิ่ม/ลบอัตโนมัติ
 * และเป็นแหล่งข้อมูลให้การชน (กำแพง) ฝั่ง client ใช้ทำนาย
 */
export class StructureView {
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private bags = new Map<string, Phaser.GameObjects.Image>();
  private placed = new Map<string, Placed>();
  private drops = new Map<string, { key: string; tx: number; ty: number }>();
  private solidTiles = new Set<string>();
  private unsubscribe: Array<() => void> = [];

  constructor(
    private scene: Phaser.Scene,
    room: WorldRoom,
  ) {
    const callbacks = Callbacks.get(room as any) as any;
    this.unsubscribe.push(
      callbacks.onAdd("structures", (s: Structure, key: string) => this.add(key, s)),
      callbacks.onRemove("structures", (_s: Structure, key: string) => this.remove(key)),
      callbacks.onAdd("drops", (d: Drop, key: string) => this.addBag(key, d)),
      callbacks.onRemove("drops", (_d: Drop, key: string) => {
        this.bags.get(key)?.destroy();
        this.bags.delete(key);
        this.drops.delete(key);
      }),
    );
  }

  /** ช่องนี้มีกำแพงไหม (ใช้กับ stepPlayer ฝั่ง client) */
  readonly solid = (tx: number, ty: number): boolean => this.solidTiles.has(`${tx},${ty}`);

  campfires(): Placed[] {
    return [...this.placed.values()].filter((p) => p.kind === "campfire");
  }

  /** กล่องเก็บของทั้งหมด */
  chests(): Placed[] {
    return [...this.placed.values()].filter((p) => p.kind === "chest");
  }

  /** สิ่งก่อสร้าง key นี้ (ยังอยู่ไหม/อยู่ช่องไหน) */
  get(key: string): Placed | undefined {
    return this.placed.get(key);
  }

  all(): Placed[] {
    return [...this.placed.values()];
  }

  bagList(): { key: string; tx: number; ty: number }[] {
    return [...this.drops.values()];
  }

  destroy(): void {
    this.unsubscribe.forEach((off) => off());
    this.sprites.forEach((s) => s.destroy());
    this.bags.forEach((b) => b.destroy());
    this.sprites.clear();
    this.bags.clear();
  }

  private add(key: string, s: Structure) {
    if (this.sprites.has(key)) return;
    const x = s.tx * TILE_SIZE + TILE_SIZE / 2;
    const baseY = (s.ty + 1) * TILE_SIZE;
    const texture = s.kind === "campfire" ? TEX.campfire : TEX.structure(s.kind);
    const sprite = this.scene.add.sprite(x, baseY, texture, 0).setOrigin(0.5, 1).setScale(HD_SCALE);
    // ที่นอนแบนกับพื้น (ผู้เล่นเดินทับได้) ส่วนอื่นเรียงลึกตามโคน
    sprite.setDepth(s.kind === "bed" ? baseY - TILE_SIZE : baseY);
    if (s.kind === "campfire") sprite.play(CAMPFIRE_ANIM);
    this.sprites.set(key, sprite);
    this.placed.set(key, { key, kind: s.kind, tx: s.tx, ty: s.ty });
    if (isStructureKind(s.kind) && STRUCTURE_DEFS[s.kind].solid) this.solidTiles.add(`${s.tx},${s.ty}`);
  }

  private remove(key: string) {
    const p = this.placed.get(key);
    if (p) this.solidTiles.delete(`${p.tx},${p.ty}`);
    this.sprites.get(key)?.destroy();
    this.sprites.delete(key);
    this.placed.delete(key);
  }

  private addBag(key: string, d: Drop) {
    if (this.bags.has(key)) return;
    const baseY = (d.ty + 1) * TILE_SIZE;
    const img = this.scene.add.image(d.tx * TILE_SIZE + TILE_SIZE / 2, baseY, TEX.bag).setOrigin(0.5, 1).setScale(HD_SCALE).setDepth(baseY);
    this.bags.set(key, img);
    this.drops.set(key, { key, tx: d.tx, ty: d.ty });
  }
}
