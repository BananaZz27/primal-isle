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
  /** ลำดับผู้เล่น 0..7 — ใช้เลือกหน้าตาตัวละครและจุดเกิด */
  colorIndex: t.uint8(),
  /** ค่าสถานะ 0..100 */
  health: t.number(),
  hunger: t.number(),
  thirst: t.number(),
  /** กระเป๋า: ชนิดของ → จำนวน (สูงสุด 99 ต่อชนิด) */
  inventory: t.map("uint8"),
});
export type Player = SchemaType<typeof Player>;

/**
 * State ของโลกที่ซิงก์ไปให้ทุกคน
 * ส่งแค่ seed — แผนที่ทั้งก้อนแต่ละเครื่องสร้างเองจาก seed (ประหยัดเน็ต)
 */
/** สถานะของทรัพยากรที่เคยถูกเก็บ (ที่ไม่เคยถูกแตะไม่อยู่ใน map = เต็ม) */
export const NodeState = schema({
  /** จำนวนครั้งที่ยังตีได้ — 0 = หมด รองอก */
  hp: t.uint8(),
  /** เวลาของห้อง (ms) ที่จะงอกคืน */
  regrowAt: t.number(),
});
export type NodeState = SchemaType<typeof NodeState>;

/**
 * สิ่งที่ผู้เล่นวางไว้บนพื้น (กองไฟ กำแพง ประตู ที่นอน)
 * เจ้าของ (token) ไม่อยู่ในนี้ — เก็บฝั่งเซิร์ฟเวอร์ใน BuildingSystem เพราะ token คือกุญแจตัวละคร ห้ามส่งให้ client
 */
export const Structure = schema({
  kind: t.string(),
  tx: t.uint16(),
  ty: t.uint16(),
});
export type Structure = SchemaType<typeof Structure>;

/** ถุงของที่ตกตอนผู้เล่นสลบ — ใครก็เก็บได้ */
export const Drop = schema({
  tx: t.uint16(),
  ty: t.uint16(),
  /** เวลาของห้อง (ms) ที่ถุงจะหายไปเอง */
  expiresAt: t.number(),
  items: t.map("uint8"),
});
export type Drop = SchemaType<typeof Drop>;

/**
 * ไดโน 1 ตัว — เซิร์ฟเวอร์เดินและคิดให้ (สมอง/เจ้าของตัวจริงเก็บใน DinoSystem ไม่ซิงก์)
 * owner = ชื่อที่แสดงของเจ้าของ ("" = ไดโนป่า) — ห้ามใส่ token
 */
export const Dino = schema({
  kind: t.string(),
  x: t.number(),
  y: t.number(),
  hp: t.uint16(),
  /** 0 ปกติ · 1 กำลังหนี · 2 กำลังไล่/โกรธ */
  mood: t.uint8(),
  owner: t.string(),
  /** -1 หันซ้าย · 1 หันขวา */
  facing: t.int8(),
});
export type Dino = SchemaType<typeof Dino>;

/** กล่องเสบียงจากโลกปัจจุบัน (ของข้างในสุ่มตอนเปิด ไม่ส่งล่วงหน้า) */
export const Crate = schema({
  tx: t.uint16(),
  ty: t.uint16(),
  /** เวลาของห้อง (ms) ที่กล่องจะหายเอง */
  expiresAt: t.number(),
});
export type Crate = SchemaType<typeof Crate>;

/** ของในกล่องเก็บของ 1 ใบ (key = key ของสิ่งก่อสร้าง) — ทุกคนในโลกใช้ร่วมกัน */
export const ChestState = schema({
  items: t.map("uint8"),
});
export type ChestState = SchemaType<typeof ChestState>;

export const WorldState = schema({
  seed: t.uint32(),
  players: t.map(Player),
  /** key = id ทรัพยากร (ลำดับใน generateDecor) เป็นข้อความ */
  nodes: t.map(NodeState),
  /** key = เลขลำดับที่วาง (ข้อความ) */
  structures: t.map(Structure),
  /** key = เลขลำดับ (ข้อความ) */
  drops: t.map(Drop),
  /** key = เลขลำดับ (ข้อความ) */
  dinos: t.map(Dino),
  /** วินาทีของวัน 0..dayLengthSec (อัปเดตทุก 1 วิ) — client คำนวณความมืดเอง */
  clock: t.uint16(),
  /** key = เลขลำดับ (ข้อความ) */
  crates: t.map(Crate),
  /** key = key ของสิ่งก่อสร้างชนิด chest */
  chests: t.map(ChestState),
});
export type WorldState = SchemaType<typeof WorldState>;
