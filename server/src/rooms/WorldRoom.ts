import { Room, Client, CloseCode, type StepContext } from "colyseus";
import {
  findSpawn,
  generateWorld,
  sanitizeName,
  stepPlayer,
  MAX_PLAYERS,
  TICK_RATE,
  type WorldMap,
} from "@primal/shared";
import { MoveInput, Player, WorldState } from "./schema/WorldState.js";
import { StepBudget } from "./stepBudget.js";

/** เวลาที่รอผู้เล่นที่เน็ตหลุดให้ต่อกลับมา (วินาที) */
export const RECONNECT_SECONDS = 20;

export interface WorldCreateOptions {
  /** ไม่ส่งมา = สุ่ม */
  seed?: number;
}

export interface WorldJoinOptions {
  name?: string;
}

/**
 * ห้อง "world" = เกาะ 1 เกาะ ผู้เล่นสูงสุด MAX_PLAYERS คน
 * รหัสโลกที่ให้เพื่อนคือ roomId ของห้องนี้
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

  /**
   * บัฟเฟอร์ input ต่อผู้เล่น — sanitize บังคับค่าทุกช่องให้อยู่ใน -1..1 ตอนถอดรหัส (ไม่เชื่อข้อมูลจากเน็ต)
   * เก็บได้ ~3 วินาทีที่ 20Hz เผื่อเน็ตสะดุดแล้ว input ไหลมาทีเดียว
   */
  inputs = this.defineInput(MoveInput, {
    bufferMaxSize: 64,
    sanitize: { moveX: [-1, 1], moveY: [-1, 1] },
  });

  messages = {};

  onCreate(options: WorldCreateOptions = {}) {
    const seed = Number.isInteger(options.seed)
      ? (options.seed as number) >>> 0
      : Math.floor(Math.random() * 0x1_0000_0000) >>> 0;

    this.state.seed = seed;
    this.map = generateWorld(seed);
    this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
  }

  onJoin(client: Client, options: WorldJoinOptions = {}) {
    const index = this.joinCount++;
    const spawn = findSpawn(this.map, index % MAX_PLAYERS);

    this.state.players.set(
      client.sessionId,
      new Player({
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        name: sanitizeName(options?.name),
        colorIndex: index % MAX_PLAYERS,
      }),
    );
  }

  /**
   * เน็ตหลุดโดยไม่ได้ตั้งใจออก (เช่น Wi-Fi มือถือสะดุด): เก็บตัวละครไว้ RECONNECT_SECONDS วินาที
   * ถ้าต่อกลับมาทันก็เล่นต่อตัวเดิม ถ้าไม่ทัน Colyseus จะเรียก onLeave ให้เอง
   */
  onDrop(client: Client) {
    this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onLeave(client: Client, _code: CloseCode) {
    this.state.players.delete(client.sessionId);
    this.budget.forget(client.sessionId);
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
      for (const input of batch) stepPlayer(player, input, ctx.dt, this.map);
      this.budget.spend(sessionId, batch.length);
    }
  }
}
