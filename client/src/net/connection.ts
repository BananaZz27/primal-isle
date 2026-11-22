import { ColyseusSDK, type Room } from "@colyseus/sdk";
import type server from "@primal/server/app.config";
import type { WorldState } from "@primal/server/schema";
import { ErrorCode } from "@colyseus/sdk";
import { resolveServerUrl } from "./serverUrl";
import { myToken } from "./token";

export type WorldRoom = Room<any, WorldState>;

/** ตัวเชื่อมต่อเซิร์ฟเวอร์ (สร้างครั้งเดียวใช้ทั้งเกม) */
const client = new ColyseusSDK<typeof server>(
  resolveServerUrl(import.meta.env.VITE_SERVER_URL, window.location),
);

/** สร้างโลกใหม่ (เกาะใหม่ seed สุ่ม) แล้วเข้าไปเป็นคนแรก */
export async function createWorld(name: string): Promise<WorldRoom> {
  return (await client.create("world", { name, token: myToken() })) as unknown as WorldRoom;
}

/**
 * เข้าโลกด้วยรหัส: ห้องเปิดอยู่ → เข้าเลย · ปิดไปแล้ว → เปิดใหม่จากไฟล์บันทึก
 * (เซิร์ฟเวอร์ตอบ "world not found" ถ้าไม่มีไฟล์)
 */
export async function joinWorld(code: string, name: string): Promise<WorldRoom> {
  const options = { name, token: myToken() };
  const clean = code.trim().toUpperCase();
  try {
    return (await client.joinById(clean, options)) as unknown as WorldRoom;
  } catch (err) {
    if ((err as { code?: unknown })?.code !== ErrorCode.MATCHMAKE_INVALID_ROOM_ID) throw err;
    return (await client.create("world", { ...options, code: clean })) as unknown as WorldRoom;
  }
}
