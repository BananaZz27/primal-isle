import { ColyseusSDK, type Room } from "@colyseus/sdk";
import type server from "@primal/server/app.config";
import type { WorldState } from "@primal/server/schema";
import { resolveServerUrl } from "./serverUrl";

export type WorldRoom = Room<any, WorldState>;

/** ตัวเชื่อมต่อเซิร์ฟเวอร์ (สร้างครั้งเดียวใช้ทั้งเกม) */
const client = new ColyseusSDK<typeof server>(
  resolveServerUrl(import.meta.env.VITE_SERVER_URL, window.location),
);

/** สร้างโลกใหม่ (เกาะใหม่ seed สุ่ม) แล้วเข้าไปเป็นคนแรก */
export async function createWorld(name: string): Promise<WorldRoom> {
  return (await client.create("world", { name })) as unknown as WorldRoom;
}

/** เข้าโลกของเพื่อนด้วยรหัสโลก */
export async function joinWorld(code: string, name: string): Promise<WorldRoom> {
  return (await client.joinById(code, { name })) as unknown as WorldRoom;
}
