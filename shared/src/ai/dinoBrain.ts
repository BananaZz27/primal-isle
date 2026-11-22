import { BALANCE } from "../rules/resources";
import { dinoDef, type DinoKind } from "../rules/dinos";

/** อ้างถึงผู้เล่น (sessionId) หรือไดโน (key ใน state) */
export interface Ref {
  type: "player" | "dino";
  id: string;
}

export type DinoMode = "idle" | "wander" | "flee" | "chase" | "home";

/** ความคิดของไดโน 1 ตัว — เก็บฝั่งเซิร์ฟเวอร์ (ไม่ซิงก์) */
export interface DinoBrain {
  kind: DinoKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  tamed: boolean;
  mode: DinoMode;
  /** โหมดตอนนี้หมดเวลาเมื่อไร (ms ของห้อง) */
  until: number;
  goalX: number;
  goalY: number;
  /** หนีจาก / ไล่ใคร */
  target: Ref | null;
  /** defensive/aggressive ที่โดนตี: ไล่คนตีถึงเมื่อไร */
  angryUntil: number;
  nextBite: number;
}

/** สิ่งที่ไดโนมองเห็นตอนคิด (ห้องเตรียมให้ทุก tick) */
export interface DinoView {
  players: { id: string; x: number; y: number }[];
  /** tamed = มีเจ้าของแล้ว (ไดโนที่เทมแล้วไม่สู้กันเอง) */
  dinos: { id: string; x: number; y: number; half: number; tamed: boolean }[];
  /** ตำแหน่งเจ้าของ (ตัวที่เทมแล้ว, เจ้าของออนไลน์) */
  owner: { x: number; y: number } | null;
  /** ศัตรูของเจ้าของ (เพิ่งตีเจ้าของ หรือเจ้าของเพิ่งตี) */
  ownerFoe: Ref | null;
  /** ตัวคูณระยะไล่ (กลางคืน = nightAggroMul) — ไม่ใส่ = 1 */
  aggroMul?: number;
}

export interface DinoIntent {
  /** ทิศ (เวกเตอร์ยาว ≤ 1) */
  moveX: number;
  moveY: number;
  /** px/วินาที (0 = ยืนนิ่ง) */
  speed: number;
  /** กัดใครใน tick นี้ */
  bite: Ref | null;
}

const FLEE_MS = 3000;
const ANGRY_MS = 10_000;
const ARRIVE_PX = 4;
const WANDER_TIMEOUT_MS = 6000;
const STILL: DinoIntent = { moveX: 0, moveY: 0, speed: 0, bite: null };

export function newBrain(kind: DinoKind, x: number, y: number): DinoBrain {
  return {
    kind,
    x,
    y,
    homeX: x,
    homeY: y,
    tamed: false,
    mode: "idle",
    until: 0,
    goalX: x,
    goalY: y,
    target: null,
    angryUntil: 0,
    nextBite: 0,
  };
}

/** โดนตี: ตัวขี้กลัวหนี ตัวดุ/ตัวหวงถิ่นโกรธไล่คนตี */
export function hurt(b: DinoBrain, by: Ref, now: number): void {
  const t = dinoDef(b.kind).temper;
  b.target = by;
  if (!b.tamed && (t === "skittish" || t === "shy")) {
    b.mode = "flee";
    b.until = now + FLEE_MS;
  } else {
    b.mode = "chase";
    b.angryUntil = now + ANGRY_MS;
  }
}

/**
 * คิด 1 tick: ตัดสินว่าจะเดินไปทางไหน เร็วเท่าไร กัดใครไหม (pure: ผลขึ้นกับอินพุตเท่านั้น, สุ่มผ่าน rand)
 * เปลี่ยนสถานะใน b (โหมด/เป้า/เวลา) แต่ไม่ขยับตำแหน่ง — ห้องเป็นคนเดินด้วย stepMover
 */
export function think(b: DinoBrain, view: DinoView, now: number, rand: () => number): DinoIntent {
  return b.tamed ? thinkTamed(b, view, now) : thinkWild(b, view, now, rand);
}

function thinkTamed(b: DinoBrain, view: DinoView, now: number): DinoIntent {
  const def = dinoDef(b.kind);
  // ศัตรูของเจ้าของ (หรือตัวที่ตีเรา) ที่ยังมีอยู่ → ไล่กัด
  // ไม่กัดผู้เล่น และไม่สู้กับไดโนที่เทมแล้ว (ของเราหรือของคนอื่น) เด็ดขาด
  const wildFoe = (ref: Ref | null) => {
    if (ref?.type !== "dino") return null;
    const d = view.dinos.find((x) => x.id === ref.id);
    return d && !d.tamed ? { ref, d } : null;
  };
  const foe = wildFoe(view.ownerFoe) ?? wildFoe(b.target);
  if (foe && view.owner && dist(foe.d, view.owner) <= BALANCE.dinoLeashPx) return attack(b, foe.ref, foe.d, foe.d.half, now);
  b.target = null;
  b.mode = "idle";
  if (view.owner && dist(b, view.owner) > BALANCE.tamedFollowPx) return toward(b, view.owner, BALANCE.tamedFollowSpeed);
  return STILL;
}

function thinkWild(b: DinoBrain, view: DinoView, now: number, rand: () => number): DinoIntent {
  const def = dinoDef(b.kind);
  const home = { x: b.homeX, y: b.homeY };

  // กำลังกลับบ้าน (เลิกไล่เพราะไกลบ้าน) — ไม่สนใครจนถึงบ้าน
  // กลับไม่ถึงในเวลา (เช่น มีกำแพง/น้ำขวาง) → เลิกดื้อ แล้วถือว่าที่นี่เป็นบ้านใหม่
  if (b.mode === "home") {
    if (dist(b, home) > BALANCE.dinoWanderPx && now < b.until) return toward(b, home, def.speed);
    if (now >= b.until) {
      b.homeX = home.x = b.x;
      b.homeY = home.y = b.y;
    }
    b.mode = "idle";
    b.until = now;
  }

  if (def.temper === "skittish" || def.temper === "shy") {
    // หนี: จากคนที่ตีเรา (ช่วงเวลาหนึ่ง) หรือคนที่เข้าใกล้เกินไป (ไดโนจิ๋ว)
    let threat = b.mode === "flee" && now < b.until ? locate(b.target, view) : null;
    if (!threat && def.temper === "skittish") {
      const near = nearest(b, view.players);
      if (near && dist(b, near) <= def.aggroPx) threat = near;
    }
    if (threat) return away(b, threat, def.runSpeed);
    if (b.mode === "flee") b.mode = "idle";
    return roam(b, now, rand, def.speed);
  }

  // ดุ/หวงถิ่น: ไล่คนที่ตีเรา (ตอนยังโกรธ) หรือ (ตัวดุ) คนที่ใกล้ที่สุดในระยะ
  let ref: Ref | null = now < b.angryUntil ? b.target : null;
  let pos = locate(ref, view);
  let targetHalf = ref?.type === "dino" ? (view.dinos.find((d) => d.id === ref!.id)?.half ?? 0) : 0;
  if (!pos && def.temper === "aggressive") {
    const near = nearest(b, view.players);
    if (near && dist(b, near) <= def.aggroPx * (view.aggroMul ?? 1)) {
      ref = { type: "player", id: near.id };
      pos = near;
      targetHalf = 0;
    }
  }
  if (ref && pos) {
    if (dist(b, home) > BALANCE.dinoLeashPx) {
      // ไกลบ้านเกินไป: เลิกไล่ แล้วเดินกลับ
      b.mode = "home";
      b.until = now + BALANCE.homeTimeoutMs;
      b.target = null;
      b.angryUntil = 0;
      return toward(b, home, def.speed);
    }
    return attack(b, ref, pos, targetHalf, now);
  }
  if (b.mode === "chase") {
    b.mode = "idle";
    b.target = null;
  }
  return roam(b, now, rand, def.speed);
}

/** เข้าไปกัด: ถึงระยะแล้วยืนกัดตามคูลดาวน์ ไม่ถึงก็วิ่งเข้าหา */
function attack(b: DinoBrain, ref: Ref, pos: { x: number; y: number }, targetHalf: number, now: number): DinoIntent {
  const def = dinoDef(b.kind);
  b.mode = "chase";
  b.target = ref;
  const reach = def.half + (ref.type === "player" ? 8 : targetHalf + 2);
  if (dist(b, pos) > reach) return toward(b, pos, def.runSpeed);
  if (def.bite > 0 && now >= b.nextBite) {
    b.nextBite = now + def.biteCooldownMs;
    return { ...STILL, bite: ref };
  }
  return STILL;
}

/** เดินเล่นรอบบ้าน: ยืน 1–3 วิ → เดินไปจุดสุ่มในรัศมี dinoWanderPx → ยืน … */
function roam(b: DinoBrain, now: number, rand: () => number, speed: number): DinoIntent {
  if (b.mode === "wander") {
    if (dist(b, { x: b.goalX, y: b.goalY }) > ARRIVE_PX && now < b.until) return toward(b, { x: b.goalX, y: b.goalY }, speed);
    b.mode = "idle";
    b.until = now + 1000 + rand() * 2000;
    return STILL;
  }
  if (b.mode !== "idle") {
    b.mode = "idle";
    b.until = now + 1000 + rand() * 2000;
  }
  if (now < b.until) return STILL;
  const angle = rand() * Math.PI * 2;
  const r = rand() * BALANCE.dinoWanderPx;
  b.mode = "wander";
  b.goalX = b.homeX + Math.cos(angle) * r;
  b.goalY = b.homeY + Math.sin(angle) * r;
  b.until = now + WANDER_TIMEOUT_MS;
  return toward(b, { x: b.goalX, y: b.goalY }, speed);
}

function locate(ref: Ref | null, view: DinoView): { x: number; y: number } | null {
  if (!ref) return null;
  const list = ref.type === "player" ? view.players : view.dinos;
  return list.find((e) => e.id === ref.id) ?? null;
}

function nearest<T extends { x: number; y: number }>(from: { x: number; y: number }, list: T[]): T | null {
  let best: T | null = null;
  for (const e of list) if (!best || dist(from, e) < dist(from, best)) best = e;
  return best;
}

function toward(from: { x: number; y: number }, to: { x: number; y: number }, speed: number): DinoIntent {
  const d = dist(from, to);
  if (d < 0.001) return STILL;
  return { moveX: (to.x - from.x) / d, moveY: (to.y - from.y) / d, speed, bite: null };
}

function away(from: { x: number; y: number }, threat: { x: number; y: number }, speed: number): DinoIntent {
  const d = dist(from, threat);
  if (d < 0.001) return { moveX: 1, moveY: 0, speed, bite: null };
  return { moveX: (from.x - threat.x) / d, moveY: (from.y - threat.y) / d, speed, bite: null };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
