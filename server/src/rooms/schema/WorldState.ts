import { schema, t, type SchemaType } from "@colyseus/schema";

/**
 * Input 1 ชิ้นจากผู้เล่น (รับผ่าน Room.defineInput)
 * มีแค่ "ทิศที่อยากเดิน" — ห้ามส่งตำแหน่ง เพราะผู้เล่นจะแก้ค่าแล้ววาร์ปได้
 * ช่วงค่า -1..1 ถูกบังคับจริงโดย `sanitize` ในห้อง ไม่ใช่โดยชนิดข้อมูลนี้
 */
export const MoveInput = schema({
  moveX: t.int8<-1 | 0 | 1>(),
  moveY: t.int8<-1 | 0 | 1>(),
});
export type MoveInput = SchemaType<typeof MoveInput>;

/** ข้อมูลผู้เล่นที่ทุกคนในห้องมองเห็น */
export const Player = schema({
  x: t.number(),
  y: t.number(),
  vx: t.number(),
  vy: t.number(),
  name: t.string(),
  /** สีเสื้อ 0..7 ใช้แยกผู้เล่นด้วยตา */
  colorIndex: t.uint8(),
});
export type Player = SchemaType<typeof Player>;

/**
 * State ของโลกที่ซิงก์ไปให้ทุกคน
 * ส่งแค่ seed — แผนที่ทั้งก้อนแต่ละเครื่องสร้างเองจาก seed (ประหยัดเน็ต)
 */
export const WorldState = schema({
  seed: t.uint32(),
  players: t.map(Player),
});
export type WorldState = SchemaType<typeof WorldState>;
