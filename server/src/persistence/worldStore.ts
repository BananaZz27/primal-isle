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

/**
 * เก็บแต่ละโลกเป็นไฟล์ JSON หนึ่งไฟล์: <dir>/<รหัส>.json
 * - แตะไฟล์เฉพาะรหัสที่ผ่าน isWorldCode เท่านั้น (กันชื่อไฟล์แปลกๆ เช่น ../)
 * - เขียนไฟล์ชั่วคราวแล้ว rename (ไฟล์ไม่ขาดครึ่งถ้าเครื่องดับกลางทาง)
 * - ไฟล์เสียอ่านไม่ได้ → คืน null และไม่ลบไฟล์ (เก็บไว้ตรวจ)
 */
export class JsonFileStore implements WorldStore {
  private dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  async load(code: string): Promise<WorldSave | null> {
    if (!isWorldCode(code)) return null;
    try {
      const data = JSON.parse(await readFile(this.path(code), "utf8")) as WorldSave;
      return data?.version === 1 && data.code === code ? data : null;
    } catch {
      return null;
    }
  }

  async save(code: string, data: WorldSave): Promise<void> {
    if (!isWorldCode(code)) throw new Error(`invalid world code: ${code}`);
    await mkdir(this.dir, { recursive: true });
    const tmp = `${this.path(code)}.tmp`;
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, this.path(code));
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
