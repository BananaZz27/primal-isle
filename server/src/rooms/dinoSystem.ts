import {
  BALANCE,
  blocked,
  canTame,
  DINO_KINDS,
  dinoDef,
  dinoInReach,
  dinoSpawnOk,
  hurt,
  isDinoKind,
  newBrain,
  playerDamage,
  stepMover,
  think,
  TILE_SIZE,
  type DinoBrain,
  type DinoKind,
  type DinoView,
  type ItemId,
  type Ref,
  type SolidFn,
  type WorldMap,
} from "@primal/shared";
import { Dino, type Player, type WorldState } from "./schema/WorldState.js";
import { setCount } from "./survivalSystem.js";

/** ไดโนที่บันทึกลงไฟล์ (owner = token ของเจ้าของ, "" = ป่า) */
export interface SavedDino {
  kind: string;
  x: number;
  y: number;
  hp: number;
  homeX: number;
  homeY: number;
  owner: string;
  ownerName: string;
}

/** ห้องบอกระบบไดโนเรื่องผู้เล่น (ระบบไม่รู้จัก token เอง) */
export interface DinoHooks {
  /** token ของผู้เล่น (ผู้เล่นชั่วคราวได้ "guest-…") */
  tokenOf(player: Player): string;
  /** ผู้เล่นที่ออนไลน์ด้วย token นี้ */
  playerByToken(token: string): Player | null;
  /** กลางคืนไหม (แร็พเตอร์ไล่ไกลขึ้น) */
  night(): boolean;
  /** ใช้คูลดาวน์การตีร่วมกับการเก็บของ: พร้อมไหม / บันทึกว่าตีแล้ว */
  ready(sessionId: string, now: number): boolean;
  acted(sessionId: string, now: number): void;
}

/** ศัตรูของเจ้าของจำไว้นานเท่าไร (ให้ไดโนที่เทมช่วยสู้) */
const FOE_MS = 5000;
/** หาที่เกิดไดโนได้กี่ครั้งก่อนยอมแพ้ (กันวนไม่จบในเกาะที่แน่น) */
const SPAWN_TRIES = 300;

/**
 * ไดโนเสาร์ฝั่งเซิร์ฟเวอร์ (ตัวตัดสินจริง):
 * เกิด/เกิดใหม่, คิดและเดินทุก tick, กัดคน/ไดโน, โดนตี/ตาย/ได้เนื้อ, เทม, ตามเจ้าของ, บันทึก/โหลด
 * สมอง (DinoBrain) และ token ของเจ้าของเก็บที่นี่ ไม่ซิงก์ไปให้ client
 */
export class DinoSystem {
  private brains = new Map<string, DinoBrain>();
  /** key ไดโน → token เจ้าของ (เฉพาะตัวที่เทมแล้ว) */
  private owners = new Map<string, string>();
  /** การป้อนที่ยังไม่ครบ: key ไดโน → ใครป้อน กี่ชิ้น ล่าสุดเมื่อไร */
  private feeding = new Map<string, { token: string; count: number; at: number }>();
  /** token เจ้าของ → ศัตรูล่าสุด (ไดโนที่เจ้าของตี หรือที่กัดเจ้าของ) */
  private foes = new Map<string, { ref: Ref; until: number }>();
  /** ไดโนที่ถูกตรึงไว้ (ใช้ในเทสต์เท่านั้น) */
  private frozen = new Set<string>();
  private nextId = 0;
  private nextSpawnAt = 0;

  constructor(
    private state: WorldState,
    private map: WorldMap,
    private solid: SolidFn,
    /** ช่องที่ไดโนป่าเดินผ่านไม่ได้ (เพิ่มจาก solid: ประตู — ฐานกันแร็พเตอร์ได้) */
    private wildSolid: SolidFn,
    private spawns: { x: number; y: number }[],
    private hooks: DinoHooks,
    private rand: () => number = Math.random,
  ) {}

  /** เติมไดโนป่าทุกชนิดให้ครบจำนวนสูงสุด (ตอนเปิดโลก) */
  populate(now: number): void {
    for (const kind of DINO_KINDS) while (this.wildCount(kind) < dinoDef(kind).cap && this.spawnRandom(kind, now));
    this.nextSpawnAt = now + BALANCE.dinoRespawnSec * 1000;
  }

  /** สร้างไดโนที่ตำแหน่งนี้ (คืน key) */
  spawnAt(kind: DinoKind, x: number, y: number, _now: number, hp = dinoDef(kind).hp): string {
    const key = String(this.nextId++);
    this.state.dinos.set(key, new Dino({ kind, x, y, hp, mood: 0, owner: "", facing: 1 }));
    this.brains.set(key, newBrain(kind, x, y));
    return key;
  }

  freeze(key: string): void {
    this.frozen.add(key);
  }

  unfreeze(key: string): void {
    this.frozen.delete(key);
  }

  /** ผู้เล่นตีไดโน (ข้อความ attack {id}) */
  attack(sessionId: string, player: Player, msg: unknown, now: number): void {
    const key = (msg as { id?: unknown } | null)?.id;
    if (typeof key !== "string") return;
    const dino = this.state.dinos.get(key);
    if (!dino || this.owners.has(key) || !isDinoKind(dino.kind)) return; // ตัวที่เทมแล้วตีไม่ได้
    if (!this.hooks.ready(sessionId, now)) return;
    if (!dinoInReach(player.x, player.y, dino.x, dino.y, dinoDef(dino.kind).half)) return;

    this.hooks.acted(sessionId, now);
    const has = (item: ItemId) => player.inventory.get(item) ?? 0;
    const by: Ref = { type: "player", id: sessionId };
    this.foes.set(this.hooks.tokenOf(player), { ref: { type: "dino", id: key }, until: now + FOE_MS });
    this.damage(key, playerDamage(has), by, player, now);
  }

  /** ผู้เล่นป้อนอาหาร (ข้อความ feed {id}) — ครบจำนวน = เทม */
  feed(sessionId: string, player: Player, msg: unknown, now: number): void {
    const key = (msg as { id?: unknown } | null)?.id;
    if (typeof key !== "string") return;
    const dino = this.state.dinos.get(key);
    if (!dino || this.owners.has(key) || !isDinoKind(dino.kind)) return;
    const tame = canTame(dino.kind);
    if (!tame || (player.inventory.get(tame.food) ?? 0) <= 0) return;
    if (!dinoInReach(player.x, player.y, dino.x, dino.y, dinoDef(dino.kind).half)) return;
    const token = this.hooks.tokenOf(player);
    // ผู้เล่นชั่วคราวไม่มี token ถาวร: ถ้าเทมได้ ไดโนจะกำพร้าค้างโลกตลอดไป
    if (token === "" || token.startsWith("guest-")) return;
    if (this.tamedBy(token) >= BALANCE.maxTamed) return;
    // ป้อนใช้คูลดาวน์เดียวกับการตี (กดรัวๆ ไม่ได้เทมทันที — ต้องทนแร็พเตอร์กัดเอา)
    if (!this.hooks.ready(sessionId, now)) return;
    this.hooks.acted(sessionId, now);

    setCount(player, tame.food, (player.inventory.get(tame.food) ?? 0) - 1);
    const prev = this.feeding.get(key);
    const fresh = prev && prev.token === token && now - prev.at < BALANCE.feedForgetSec * 1000;
    const count = (fresh ? prev.count : 0) + 1;
    if (count < tame.count) {
      this.feeding.set(key, { token, count, at: now });
      return;
    }
    this.feeding.delete(key);
    this.tame(key, token, player.name);
  }

  /** เรียกทุก tick */
  tick(dt: number, now: number): void {
    if (process.env.WILD_DINOS !== "0" && now >= this.nextSpawnAt) {
      this.nextSpawnAt = now + BALANCE.dinoRespawnSec * 1000;
      const short = DINO_KINDS.filter((k) => this.wildCount(k) < dinoDef(k).cap);
      if (short.length > 0) this.spawnRandom(short[Math.floor(this.rand() * short.length)], now);
    }
    for (const [token, foe] of this.foes) if (foe.until <= now) this.foes.delete(token);

    const players = [...this.state.players.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }));
    const dinos = [...this.state.dinos.entries()]
      .filter(([, d]) => isDinoKind(d.kind))
      .map(([id, d]) => ({ id, x: d.x, y: d.y, half: dinoDef(d.kind as DinoKind).half, tamed: this.owners.has(id) }));

    const aggroMul = this.hooks.night() ? BALANCE.nightAggroMul : 1;
    for (const [key, dino] of [...this.state.dinos.entries()]) {
      const brain = this.brains.get(key);
      if (!brain || this.frozen.has(key) || !this.state.dinos.has(key)) continue;
      brain.x = dino.x;
      brain.y = dino.y;
      const ownerToken = this.owners.get(key);
      const owner = ownerToken ? this.hooks.playerByToken(ownerToken) : null;
      const foe = ownerToken ? this.foes.get(ownerToken) : undefined;
      const view: DinoView = {
        players,
        dinos: dinos.filter((d) => d.id !== key),
        owner: owner ? { x: owner.x, y: owner.y } : null,
        ownerFoe: foe && foe.ref.id !== key ? foe.ref : null,
        aggroMul,
      };
      const intent = think(brain, view, now, this.rand);
      if (intent.speed > 0) {
        const body = { x: dino.x, y: dino.y, vx: 0, vy: 0 };
        const solid = brain.tamed ? this.solid : this.wildSolid;
        stepMover(body, intent.moveX, intent.moveY, intent.speed, dinoDef(brain.kind).half, dt, this.map, solid);
        dino.x = body.x;
        dino.y = body.y;
        if (Math.abs(intent.moveX) > 0.1) dino.facing = intent.moveX < 0 ? -1 : 1;
      }
      dino.mood = brain.mode === "flee" ? 1 : brain.mode === "chase" ? 2 : 0;
      if (intent.bite) this.bite(key, brain, intent.bite, now);
    }
  }

  /** เจ้าของกลับมาด้วยชื่อใหม่ → ป้ายบนไดโนของเขาเปลี่ยนตาม */
  renameOwner(token: string, name: string): void {
    for (const [key, t] of this.owners) {
      const d = this.state.dinos.get(key);
      if (t === token && d) d.owner = name;
    }
  }

  /** ข้อมูลสำหรับไฟล์บันทึก */
  snapshot(): SavedDino[] {
    return [...this.state.dinos.entries()].map(([key, d]) => {
      const b = this.brains.get(key)!;
      return {
        kind: d.kind,
        x: d.x,
        y: d.y,
        hp: d.hp,
        homeX: b.homeX,
        homeY: b.homeY,
        owner: this.owners.get(key) ?? "",
        ownerName: d.owner,
      };
    });
  }

  /** โหลดจากไฟล์บันทึก */
  restore(saved: SavedDino[], now: number): void {
    for (const s of saved) {
      if (!isDinoKind(s.kind)) continue;
      const key = this.spawnAt(s.kind, s.x, s.y, now, Math.max(1, Math.min(dinoDef(s.kind).hp, s.hp)));
      const brain = this.brains.get(key)!;
      brain.homeX = s.homeX;
      brain.homeY = s.homeY;
      if (s.owner) this.tame(key, s.owner, s.ownerName);
    }
  }

  // ---------------------------------------------------------------

  private tame(key: string, token: string, ownerName: string) {
    const dino = this.state.dinos.get(key)!;
    const brain = this.brains.get(key)!;
    this.owners.set(key, token);
    // ใครเคยถือว่าตัวนี้เป็นศัตรู ให้ลืม (กันไดโนที่เทมแล้วสู้กันเอง)
    for (const [t, foe] of this.foes) if (foe.ref.type === "dino" && foe.ref.id === key) this.foes.delete(t);
    for (const other of this.brains.values()) if (other.target?.type === "dino" && other.target.id === key) other.target = null;
    brain.tamed = true;
    brain.target = null;
    brain.mode = "idle";
    dino.owner = ownerName;
    dino.mood = 0;
  }

  private tamedBy(token: string): number {
    let n = 0;
    for (const t of this.owners.values()) if (t === token) n++;
    return n;
  }

  private wildCount(kind: DinoKind): number {
    let n = 0;
    for (const [key, d] of this.state.dinos) if (d.kind === kind && !this.owners.has(key)) n++;
    return n;
  }

  /** สุ่มที่เกิดที่ถูกกติกา แล้วสร้างไดโน — หาไม่ได้คืน false */
  private spawnRandom(kind: DinoKind, now: number): boolean {
    const half = dinoDef(kind).half;
    const players = [...this.state.players.values()];
    for (let i = 0; i < SPAWN_TRIES; i++) {
      const tx = Math.floor(this.rand() * this.map.size);
      const ty = Math.floor(this.rand() * this.map.size);
      const x = (tx + 0.5) * TILE_SIZE;
      const y = (ty + 0.5) * TILE_SIZE;
      if (!dinoSpawnOk(this.map, this.solid, tx, ty, players, this.spawns)) continue;
      if (blocked(this.map, x, y, this.solid, half)) continue; // ตัวใหญ่ต้องมีที่ยืนพอ
      this.spawnAt(kind, x, y, now);
      return true;
    }
    return false;
  }

  /** ไดโนกัดเป้าหมาย */
  private bite(key: string, brain: DinoBrain, target: Ref, now: number) {
    const dmg = dinoDef(brain.kind).bite;
    if (dmg <= 0) return;
    const me: Ref = { type: "dino", id: key };
    if (target.type === "player") {
      if (brain.tamed) return; // ไดโนที่เทมแล้วไม่กัดคน
      const p = this.state.players.get(target.id);
      if (!p) return;
      p.health = Math.max(0, p.health - dmg); // ตาย → SurvivalSystem จัดการใน tick เดียวกัน
      this.foes.set(this.hooks.tokenOf(p), { ref: me, until: now + FOE_MS });
      return;
    }
    if (brain.tamed && this.owners.has(target.id)) return; // ไดโนที่เทมแล้วไม่สู้กันเอง
    const ownerToken = this.owners.get(key);
    const owner = ownerToken ? this.hooks.playerByToken(ownerToken) : null;
    this.damage(target.id, dmg, me, owner, now);
  }

  /** ไดโน key โดนดาเมจจาก by — ตายแล้วเนื้อเข้ากระเป๋า rewardTo */
  private damage(key: string, dmg: number, by: Ref, rewardTo: Player | null, now: number) {
    const dino = this.state.dinos.get(key);
    const brain = this.brains.get(key);
    if (!dino || !brain) return;
    dino.hp = Math.max(0, dino.hp - dmg);
    if (dino.hp > 0) {
      hurt(brain, by, now);
      return;
    }
    this.state.dinos.delete(key);
    this.brains.delete(key);
    this.owners.delete(key);
    this.feeding.delete(key);
    this.frozen.delete(key);
    if (rewardTo) {
      const meat = rewardTo.inventory.get("meat") ?? 0;
      setCount(rewardTo, "meat", Math.min(BALANCE.stackMax, meat + dinoDef(brain.kind).meat));
    }
  }
}
