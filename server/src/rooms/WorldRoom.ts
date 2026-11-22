import { Room, Client, CloseCode, matchMaker, type Deferred, type StepContext } from "colyseus";
import {
  BALANCE,
  findSpawn,
  freshStats,
  generateDecor,
  generateWorld,
  isNight,
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
import { DinoSystem } from "./dinoSystem.js";
import { CrateSystem } from "./crateSystem.js";

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
  private dinos!: DinoSystem;
  private crates!: CrateSystem;
  /** เวลาของวัน (วินาที, ทศนิยม) — state.clock ซิงก์แค่ส่วนจำนวนเต็ม */
  private dayClock: number = BALANCE.dayStartSec;
  /** ผู้เล่น → id เจ้าของ (token; ไม่มี token = ผู้เล่นชั่วคราว) */
  private owners = new Map<Player, string>();
  /** ค่าที่จำไว้ของผู้เล่นที่ไม่ได้ออนไลน์ (key = token) */
  private savedPlayers: Record<string, SavedPlayer> = {};
  private code = "";
  /** onCreate สำเร็จแล้ว — ก่อนหน้านั้นห้ามบันทึก (เปิดโลกพังกลางทาง = ห้ามเขียนทับไฟล์เดิม) */
  private ready = false;
  /** ผู้เล่นที่เน็ตหลุดและกำลังรอต่อกลับ (sessionId → การรอ) — กด F5 แล้วเข้าใหม่ได้ทันที */
  private waitingReconnect = new Map<string, Deferred<Client>>();
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
    attack: (client: Client, msg: unknown) =>
      this.withPlayer(client, (p) => this.dinos.attack(client.sessionId, p, msg, this.clock.currentTime)),
    open: (client: Client, msg: unknown) => this.withPlayer(client, (p) => this.crates.open(p, msg, this.clock.currentTime)),
    chest: (client: Client, msg: unknown) => this.withPlayer(client, (p) => this.building.chest(p, msg)),
    feed: (client: Client, msg: unknown) =>
      this.withPlayer(client, (p) => this.dinos.feed(client.sessionId, p, msg, this.clock.currentTime)),
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
    this.dinos = new DinoSystem(
      this.state,
      this.map,
      this.solid,
      (tx, ty) => this.solid(tx, ty) || this.building.door(tx, ty),
      Array.from({ length: MAX_PLAYERS }, (_, i) => findSpawn(this.map, i)),
      {
        tokenOf: (p) => this.owners.get(p) ?? "",
        playerByToken: (token) => {
          const session = this.sessionOfToken(token);
          return session === null ? null : (this.state.players.get(session) ?? null);
        },
        night: () => isNight(this.dayClock),
        ready: (sessionId, now) => this.survival.ready(sessionId, now),
        acted: (sessionId, now) => this.survival.acted(sessionId, now),
      },
    );
    // กล่องเสบียงห้ามตกทับต้นไม้/หิน/สิ่งก่อสร้าง
    this.crates = new CrateSystem(
      this.state,
      this.map,
      (tx, ty) => this.solid(tx, ty) || this.building.structureAt(tx, ty),
      this.clock.currentTime,
    );
    if (save) this.restore(save);
    this.state.clock = Math.floor(this.dayClock);
    if (process.env.WILD_DINOS !== "0") this.dinos.populate(this.clock.currentTime);

    this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
    this.clock.setInterval(() => void this.persist(), SAVE_EVERY_MS);
    this.ready = true;
  }

  /**
   * token เดียวกันห้ามออนไลน์สองที่ (กันตัวละครซ้ำ)
   * ยกเว้นตัวเดิมกำลังรอต่อกลับ (เช่น กด F5 / มือถือรีโหลดแท็บ) → ให้การเชื่อมต่อใหม่รับตัวละครไป
   */
  onAuth(_client: Client, options: WorldJoinOptions = {}) {
    if (!isToken(options?.token)) return true;
    const holder = this.sessionOfToken(options.token);
    if (holder !== null && !this.waitingReconnect.has(holder)) throw new Error("already playing in another window");
    return true;
  }

  onJoin(client: Client, options: WorldJoinOptions = {}) {
    const token = isToken(options?.token) ? options.token : `guest-${client.sessionId}`;
    const old = this.sessionOfToken(token);
    if (old !== null) return this.takeOver(old, client.sessionId, options);
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
    this.dinos.renameOwner(token, player.name);
    this.state.players.set(client.sessionId, player);
  }

  /**
   * เน็ตหลุดโดยไม่ได้ตั้งใจออก (เช่น Wi-Fi มือถือสะดุด): เก็บตัวละครไว้ RECONNECT_SECONDS วินาที
   * ถ้าต่อกลับมาทันก็เล่นต่อตัวเดิม ถ้าไม่ทัน Colyseus จะเรียก onLeave ให้เอง
   */
  onDrop(client: Client) {
    const waiting = this.allowReconnection(client, RECONNECT_SECONDS);
    this.waitingReconnect.set(client.sessionId, waiting);
    // ต่อกลับทัน/หมดเวลา/ถูกเข้าแทน → เลิกนับว่ารออยู่
    waiting.then(
      () => this.waitingReconnect.delete(client.sessionId),
      () => this.waitingReconnect.delete(client.sessionId),
    );
  }

  /** session ที่ถือ token นี้อยู่ตอนนี้ (null = ไม่มีใครถือ) */
  private sessionOfToken(token: string): string | null {
    for (const [sessionId, p] of this.state.players) if (this.owners.get(p) === token) return sessionId;
    return null;
  }

  /** ย้ายตัวละครจาก session ที่หลุด ไปให้ session ใหม่ของคนเดิม */
  private takeOver(oldSession: string, newSession: string, options: WorldJoinOptions) {
    const player = this.state.players.get(oldSession)!;
    this.state.players.delete(oldSession);
    this.budget.forget(oldSession);
    this.survival.forget(oldSession);
    player.name = sanitizeName(options?.name);
    this.state.players.set(newSession, player);
    this.dinos.renameOwner(this.owners.get(player) ?? "", player.name);
    const waiting = this.waitingReconnect.get(oldSession);
    this.waitingReconnect.delete(oldSession);
    waiting?.reject(); // ตัวเก่าจะ onLeave ทันที แต่ไม่มีตัวละครให้ลบแล้ว
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
    this.dayClock = (this.dayClock + ctx.dt) % BALANCE.dayLengthSec;
    const sec = Math.floor(this.dayClock);
    if (this.state.clock !== sec) this.state.clock = sec; // ส่งแค่ทุก 1 วิ ไม่ใช่ทุก tick
    this.dinos.tick(ctx.dt, this.clock.currentTime);
    this.crates.tick(this.clock.currentTime);
    this.survival.tick(ctx.dt, this.clock.currentTime);
    this.building.tick(this.clock.currentTime);
  }

  /** ห้องปิด (ทุกคนออก) → บันทึกครั้งสุดท้าย */
  async onDispose() {
    await this.persist();
  }

  /** บันทึกโลก + ผู้เล่นทุกคน (ออนไลน์อยู่ และที่เคยเข้ามา) */
  private async persist() {
    if (!this.ready) return;
    const players = { ...this.savedPlayers };
    for (const [p, token] of this.owners) if (!token.startsWith("guest-")) players[token] = snapshotPlayer(p);
    try {
      await getWorldStore().save(
        this.code,
        snapshotWorld(
          this.code,
          this.state,
          this.clock.currentTime,
          players,
          (s) => this.building.structureOwner(s),
          this.dinos.snapshot(),
          this.crates.snapshot(this.clock.currentTime),
          this.dayClock,
          (key) => this.building.chestItems(key),
        ),
      );
    } catch (err) {
      console.error(`save failed for world ${this.code}:`, err); // บันทึกไม่ได้ไม่ควรทำให้เกมล่ม
    }
  }

  /** โหลดสถานะจากไฟล์บันทึก (เวลาใช้แบบ "อีกกี่ ms" เทียบกับนาฬิกาห้องตอนนี้) */
  private restore(save: WorldSave) {
    const now = this.clock.currentTime;
    for (const n of save.nodes) this.state.nodes.set(n.id, new NodeState({ hp: n.hp, regrowAt: now + n.regrowInMs }));
    for (const s of save.structures) this.building.restore(s.kind, s.tx, s.ty, s.owner, s.items);
    save.drops.forEach((d, i) => {
      const drop = new Drop({ tx: d.tx, ty: d.ty, expiresAt: now + d.expiresInMs });
      for (const [item, n] of Object.entries(d.items)) drop.items.set(item, n);
      this.state.drops.set(`r${i}`, drop);
    });
    this.savedPlayers = { ...save.players };
    this.dinos.restore(save.dinos ?? [], now);
    this.crates.restore(save.crates ?? [], now);
    if (typeof save.clock === "number") this.dayClock = save.clock % BALANCE.dayLengthSec;
  }

  /** เรียกงานกับผู้เล่นของ client นี้ (ถ้ายังอยู่ในห้อง) */
  private withPlayer(client: Client, fn: (player: Player) => void) {
    const player = this.state.players.get(client.sessionId);
    if (player) fn(player);
  }
}
