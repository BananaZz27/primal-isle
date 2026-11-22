import { Room, Client, CloseCode, matchMaker, type StepContext } from "colyseus";
import {
  findSpawn,
  freshStats,
  generateDecor,
  generateWorld,
  isToken,
  isWorldCode,
  newWorldCode,
  sanitizeName,
  stepPlayer,
  MAX_PLAYERS,
  TICK_RATE,
  type WorldMap,
} from "@primal/shared";
import { Drop, MoveInput, NodeState, Player, WorldState } from "./schema/WorldState.js";
import { getWorldStore, type SavedPlayer, type WorldSave } from "../persistence/worldStore.js";
import { snapshotPlayer, snapshotWorld } from "../persistence/snapshot.js";
import { StepBudget } from "./stepBudget.js";
import { SurvivalSystem } from "./survivalSystem.js";
import { CraftingSystem } from "./craftingSystem.js";
import { BuildingSystem } from "./buildingSystem.js";

/** เวลาที่รอผู้เล่นที่เน็ตหลุดให้ต่อกลับมา (วินาที) */
export const RECONNECT_SECONDS = 20;

/** บันทึกโลกทุกกี่ ms */
const SAVE_EVERY_MS = 30_000;

export interface WorldCreateOptions {
  /** โลกใหม่: ไม่ส่งมา = สุ่ม */
  seed?: number;
  /** เปิดโลกเดิมจากไฟล์บันทึก */
  code?: string;
}

export interface WorldJoinOptions {
  name?: string;
  /** token จำตัวผู้เล่น (สุ่มในเบราว์เซอร์ เก็บใน localStorage) */
  token?: string;
}

/**
 * ห้อง "world" = เกาะ 1 เกาะ ผู้เล่นสูงสุด MAX_PLAYERS คน
 * รหัสโลก 6 ตัวอักษร = roomId = ชื่อไฟล์บันทึก (ปิดห้องแล้วเปิดใหม่ด้วยรหัสเดิมได้)
 *
 * เซิร์ฟเวอร์เป็นผู้ตัดสิน (server authoritative): ผู้เล่นส่งแค่ทิศที่อยากเดิน
 * ห้องเป็นคนคำนวณตำแหน่งจริงด้วย stepPlayer ตัวเดียวกับที่ client ใช้ทำนาย
 */
export class WorldRoom extends Room<{ state: WorldState; input: MoveInput }> {
  maxClients = MAX_PLAYERS;
  state = new WorldState();

  /** แผนที่เก็บไว้ในห้อง ไม่ได้อยู่ใน state (ไม่ต้องส่งทางเน็ต) */
  private map!: WorldMap;
  private joinCount = 0;
  private budget = new StepBudget();
  private survival!: SurvivalSystem;
  private crafting!: CraftingSystem;
  private building!: BuildingSystem;
  /** ผู้เล่น → id เจ้าของ (token; ไม่มี token = ผู้เล่นชั่วคราว) */
  private owners = new Map<Player, string>();
  /** ค่าที่จำไว้ของผู้เล่นที่ไม่ได้ออนไลน์ (key = token) */
  private savedPlayers: Record<string, SavedPlayer> = {};
  private code = "";
  /** ช่องที่ชน: ทรัพยากร + กำแพง */
  private solid = (tx: number, ty: number) => this.survival.solid(tx, ty) || this.building.solid(tx, ty);

  /**
   * บัฟเฟอร์ input ต่อผู้เล่น — sanitize บังคับค่าทุกช่องให้อยู่ใน -1..1 ตอนถอดรหัส (ไม่เชื่อข้อมูลจากเน็ต)
   * เก็บได้ ~3 วินาทีที่ 20Hz เผื่อเน็ตสะดุดแล้ว input ไหลมาทีเดียว
   */
  inputs = this.defineInput(MoveInput, {
    bufferMaxSize: 64,
    sanitize: { moveX: [-1, 1], moveY: [-1, 1] },
  });

  /** ข้อความที่ไม่ใช่การเดิน — ค่าที่ส่งมาตรวจในระบบเอาชีวิตรอดทั้งหมด */
  messages = {
    gather: (client: Client, msg: { node?: unknown } | undefined) =>
      this.withPlayer(client, (p) => this.survival.gather(client.sessionId, p, msg?.node, this.clock.currentTime)),
    eat: (client: Client, msg: { item?: unknown } | undefined) =>
      this.withPlayer(client, (p) => this.survival.eat(p, msg?.item)),
    drink: (client: Client) => this.withPlayer(client, (p) => this.survival.drink(p)),
    craft: (client: Client, msg: unknown) => this.withPlayer(client, (p) => this.crafting.craft(p, msg)),
    place: (client: Client, msg: unknown) => this.withPlayer(client, (p) => this.building.place(p, msg)),
    demolish: (client: Client, msg: unknown) => this.withPlayer(client, (p) => this.building.demolish(p, msg)),
    pickup: (client: Client, msg: unknown) =>
      this.withPlayer(client, (p) => this.building.pickup(p, msg, this.clock.currentTime)),
    cook: (client: Client) => this.withPlayer(client, (p) => this.crafting.cook(p)),
  };

  async onCreate(options: WorldCreateOptions = {}) {
    const store = getWorldStore();
    let save: WorldSave | null = null;

    if (options.code !== undefined) {
      // เปิดโลกเดิม: ต้องมีไฟล์ และห้องรหัสนี้ต้องไม่ได้เปิดอยู่
      if (!isWorldCode(options.code)) throw new Error("world not found");
      save = await store.load(options.code);
      if (!save) throw new Error("world not found");
      if ((await matchMaker.query({ roomId: options.code })).length > 0) throw new Error("world already open");
      this.code = options.code;
    } else {
      do this.code = newWorldCode(Math.random);
      while ((await store.exists(this.code)) || (await matchMaker.query({ roomId: this.code })).length > 0);
    }
    this.roomId = this.code;

    const seed = save
      ? save.seed
      : Number.isInteger(options.seed)
        ? (options.seed as number) >>> 0
        : Math.floor(Math.random() * 0x1_0000_0000) >>> 0;

    this.state.seed = seed;
    this.map = generateWorld(seed);
    const decor = generateDecor(this.map);
    this.building = new BuildingSystem(this.state, this.map, decor, (p) => this.owners.get(p) ?? "");
    this.survival = new SurvivalSystem(this.state, this.map, decor, {
      onDeath: (p) => this.building.dropBag(p, this.clock.currentTime),
      respawnPoint: (p) => this.building.bedFor(p),
    });
    this.crafting = new CraftingSystem(this.state);
    if (save) this.restore(save);

    this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
    this.clock.setInterval(() => void this.persist(), SAVE_EVERY_MS);
  }

  /** token เดียวกันห้ามออนไลน์สองที่ (กันตัวละครซ้ำ) */
  onAuth(_client: Client, options: WorldJoinOptions = {}) {
    if (isToken(options?.token) && [...this.owners.values()].includes(options.token)) {
      throw new Error("already playing in another window");
    }
    return true;
  }

  onJoin(client: Client, options: WorldJoinOptions = {}) {
    const token = isToken(options?.token) ? options.token : `guest-${client.sessionId}`;
    const saved = this.savedPlayers[token];
    const index = this.joinCount++;
    const spawn = findSpawn(this.map, index % MAX_PLAYERS);

    const player = new Player({
      x: saved?.x ?? spawn.x,
      y: saved?.y ?? spawn.y,
      vx: 0,
      vy: 0,
      name: sanitizeName(options?.name),
      colorIndex: saved?.colorIndex ?? index % MAX_PLAYERS,
      ...freshStats(),
      ...(saved ? { health: saved.health, hunger: saved.hunger, thirst: saved.thirst } : {}),
    });
    for (const [item, n] of Object.entries(saved?.inventory ?? {})) player.inventory.set(item, n);
    this.owners.set(player, token);
    this.state.players.set(client.sessionId, player);
  }

  /**
   * เน็ตหลุดโดยไม่ได้ตั้งใจออก (เช่น Wi-Fi มือถือสะดุด): เก็บตัวละครไว้ RECONNECT_SECONDS วินาที
   * ถ้าต่อกลับมาทันก็เล่นต่อตัวเดิม ถ้าไม่ทัน Colyseus จะเรียก onLeave ให้เอง
   */
  onDrop(client: Client) {
    this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onLeave(client: Client, _code: CloseCode) {
    const leaving = this.state.players.get(client.sessionId);
    if (leaving) {
      const token = this.owners.get(leaving)!;
      if (!token.startsWith("guest-")) this.savedPlayers[token] = snapshotPlayer(leaving); // จำไว้ตอนกลับมา
      this.owners.delete(leaving);
    }
    this.state.players.delete(client.sessionId);
    this.budget.forget(client.sessionId);
    this.survival.forget(client.sessionId);
  }

  /**
   * 1 input ที่ได้รับ = เดิน 1 step เป๊ะ ตรงกับที่ client ทำนายไว้
   * แต่ใช้ได้ไม่เกินโควตาต่อ tick (ดู StepBudget) — input ที่เกินรอใน tick ถัดไป
   */
  private step(ctx: StepContext) {
    for (const [sessionId, player] of this.state.players) {
      const channel = this.inputs.get(sessionId);
      if (!channel) continue;
      const batch = channel.take(this.budget.allowance(sessionId));
      for (const input of batch) stepPlayer(player, input, ctx.dt, this.map, this.solid);
      this.budget.spend(sessionId, batch.length);
    }
    this.survival.tick(ctx.dt, this.clock.currentTime);
    this.building.tick(this.clock.currentTime);
  }

  /** ห้องปิด (ทุกคนออก) → บันทึกครั้งสุดท้าย */
  async onDispose() {
    await this.persist();
  }

  /** บันทึกโลก + ผู้เล่นทุกคน (ออนไลน์อยู่ และที่เคยเข้ามา) */
  private async persist() {
    const players = { ...this.savedPlayers };
    for (const [p, token] of this.owners) if (!token.startsWith("guest-")) players[token] = snapshotPlayer(p);
    try {
      await getWorldStore().save(this.code, snapshotWorld(this.code, this.state, this.clock.currentTime, players));
    } catch (err) {
      console.error(`save failed for world ${this.code}:`, err); // บันทึกไม่ได้ไม่ควรทำให้เกมล่ม
    }
  }

  /** โหลดสถานะจากไฟล์บันทึก (เวลาใช้แบบ "อีกกี่ ms" เทียบกับนาฬิกาห้องตอนนี้) */
  private restore(save: WorldSave) {
    const now = this.clock.currentTime;
    for (const n of save.nodes) this.state.nodes.set(n.id, new NodeState({ hp: n.hp, regrowAt: now + n.regrowInMs }));
    for (const s of save.structures) this.building.restore(s.kind, s.tx, s.ty, s.owner);
    save.drops.forEach((d, i) => {
      const drop = new Drop({ tx: d.tx, ty: d.ty, expiresAt: now + d.expiresInMs });
      for (const [item, n] of Object.entries(d.items)) drop.items.set(item, n);
      this.state.drops.set(`r${i}`, drop);
    });
    this.savedPlayers = { ...save.players };
  }

  /** เรียกงานกับผู้เล่นของ client นี้ (ถ้ายังอยู่ในห้อง) */
  private withPlayer(client: Client, fn: (player: Player) => void) {
    const player = this.state.players.get(client.sessionId);
    if (player) fn(player);
  }
}
