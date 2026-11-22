import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isWorldCode } from "@primal/shared";

/** ข้อมูลโลกที่บันทึกลงไฟล์ (เวลาเก็บเป็น "อีกกี่ ms" เพราะนาฬิกาห้องเริ่มนับใหม่ทุกครั้งที่เปิด) */
export interface WorldSave {
  version: 1;
  code: string;
  seed: number;
  savedAt: number;
  nodes: { id: string; hp: number; regrowInMs: number }[];
  structures: { kind: string; tx: number; ty: number; owner: string }[];
  drops: { tx: number; ty: number; expiresInMs: number; items: Record<string, number> }[];
  /** key = token ของผู้เล่น */
  players: Record<string, SavedPlayer>;
}

export interface SavedPlayer {
  x: number;
  y: number;
  health: number;
  hunger: number;
  thirst: number;
  colorIndex: number;
  inventory: Record<string, number>;
}

/** ที่เก็บโลก — แยกเป็น interface เพื่อเปลี่ยนเป็นฐานข้อมูลจริงได้ภายหลังโดยไม่แตะส่วนอื่น */
export interface WorldStore {
  load(code: string): Promise<WorldSave | null>;
  save(code: string, data: WorldSave): Promise<void>;
  exists(code: string): Promise<boolean>;
}

const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** ไฟล์มีโครงตรงตามที่ห้องจะอ่านไหม (ไฟล์ที่แก้มือ/บั๊กในอนาคต ห้ามทำห้องพังกลางการโหลด) */
function isWorldSave(d: unknown, code: string): d is WorldSave {
  if (!isObj(d) || d.version !== 1 || d.code !== code || !isNum(d.seed)) return false;
  const { nodes, structures, drops, players } = d;
  if (!Array.isArray(nodes) || !Array.isArray(structures) || !Array.isArray(drops) || !isObj(players)) return false;
  return (
    nodes.every((n) => isObj(n) && typeof n.id === "string" && isNum(n.hp) && isNum(n.regrowInMs)) &&
    structures.every((s) => isObj(s) && typeof s.kind === "string" && isNum(s.tx) && isNum(s.ty) && typeof s.owner === "string") &&
    drops.every((x) => isObj(x) && isNum(x.tx) && isNum(x.ty) && isNum(x.expiresInMs) && isObj(x.items)) &&
    Object.values(players).every(
      (p) => isObj(p) && isNum(p.x) && isNum(p.y) && isNum(p.health) && isNum(p.hunger) && isNum(p.thirst) && isNum(p.colorIndex) && isObj(p.inventory),
    )
  );
}

/** งานบันทึกที่ยังเขียนไม่เสร็จ ต่อรหัสโลก — ทุก store ในโปรเซสใช้ร่วมกัน */
const inFlight = new Map<string, Promise<void>>();
let tmpCounter = 0;

/**
 * เก็บแต่ละโลกเป็นไฟล์ JSON หนึ่งไฟล์: <dir>/<รหัส>.json
 * - แตะไฟล์เฉพาะรหัสที่ผ่าน isWorldCode เท่านั้น (กันชื่อไฟล์แปลกๆ เช่น ../)
 * - เขียนไฟล์ชั่วคราว (ชื่อไม่ซ้ำ) แล้ว rename (ไฟล์ไม่ขาดครึ่งถ้าเครื่องดับกลางทาง)
 * - บันทึกโลกเดียวกันต่อคิวทีละครั้ง และการโหลดรอให้บันทึกที่ค้างอยู่เสร็จก่อน
 *   (ห้องเก่ากำลังบันทึกครั้งสุดท้าย ขณะที่มีคนเปิดโลกนั้นใหม่ → ต้องได้ข้อมูลล่าสุด)
 * - ไฟล์เสีย/โครงผิด → คืน null และไม่ลบไฟล์ (เก็บไว้ตรวจ)
 */
export class JsonFileStore implements WorldStore {
  private dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  async load(code: string): Promise<WorldSave | null> {
    if (!isWorldCode(code)) return null;
    await this.settled(code);
    try {
      const data: unknown = JSON.parse(await readFile(this.path(code), "utf8"));
      return isWorldSave(data, code) ? data : null;
    } catch {
      return null;
    }
  }

  async save(code: string, data: WorldSave): Promise<void> {
    if (!isWorldCode(code)) throw new Error(`invalid world code: ${code}`);
    const key = this.path(code);
    const write = (inFlight.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
      await mkdir(this.dir, { recursive: true });
      const tmp = `${key}.${process.pid}.${tmpCounter++}.tmp`;
      await writeFile(tmp, JSON.stringify(data));
      await rename(tmp, key);
    });
    inFlight.set(key, write);
    try {
      await write;
    } finally {
      if (inFlight.get(key) === write) inFlight.delete(key);
    }
  }

  /** รอจนบันทึกของโลกนี้ที่ค้างอยู่เสร็จ (สำเร็จหรือไม่ก็ตาม) */
  private async settled(code: string): Promise<void> {
    await inFlight.get(this.path(code))?.catch(() => {});
  }

  async exists(code: string): Promise<boolean> {
    return (await this.load(code)) !== null;
  }

  private path(code: string) {
    return join(this.dir, `${code}.json`);
  }
}

let shared: WorldStore | null = null;

/** ที่เก็บของเซิร์ฟเวอร์ (สร้างตอนใช้ครั้งแรก — อ่าน DATA_DIR ตอนนั้น) */
export function getWorldStore(): WorldStore {
  shared ??= new JsonFileStore(process.env.DATA_DIR ?? "data/worlds");
  return shared;
}
