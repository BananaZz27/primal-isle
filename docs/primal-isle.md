# Primal Isle — สรุปโปรเจกต์ (อ่านไฟล์นี้ก่อนเริ่มแชตใหม่)

> อัปเดต: 2026-11-21 · เขียนทับทุกครั้งที่จบรอบงาน

## คืออะไร
เกมเอาชีวิตรอดออนไลน์แนว Durango: Wild Lands (คนยุคปัจจุบันติดเกาะไดโนเสาร์) มุมมองจากด้านบน ภาพพิกเซล
เล่นบนเว็บได้ทุกแพลตฟอร์ม เพื่อนเข้าผ่านลิงก์ สูงสุด 8 คนต่อโลก · PvE เท่านั้น
ห้ามใช้ชื่อ/ภาพ/เสียงของ Durango · asset ภายนอกต้องเป็น CC0 หรือ CC-BY เท่านั้น (บันทึกใน `CREDITS.md`)

## สิ่งที่ตัดสินใจแล้ว
- Stack: TypeScript ทั้งระบบ · Phaser 4.2 (client) · Colyseus 0.18 (server) · Vite · Vitest · npm workspaces
- โครงสร้าง: `shared/` กติกาเกม pure function · `server/` ห้อง `world` (server authoritative) · `client/` หน้าจอ
- แผนที่ไม่ส่งทางเน็ต: ทั้งสองฝั่งสร้างจาก `seed` ด้วย `generateWorld` · ซิงก์เฉพาะสิ่งที่เปลี่ยน
- Netcode: fixed timestep 20Hz + `defineInput` (server) · `Predict` reconciler + lerp (client) · `stepPlayer` ตัวเดียวใช้ทั้งสองฝั่ง
- รหัสโลก = `roomId` ของ Colyseus · ลิงก์เชิญ `?w=<รหัส>`
- ภาพตอนนี้ Claude วาดด้วยโค้ดทั้งหมด (`client/src/art/`)
- ค่าคงที่ทั้งหมดอยู่ที่ `shared/src/constants.ts`

## สถานะ
- ✅ ขั้นที่ 1–2 เสร็จ: สร้างโลก/เข้าโลก, เดินด้วยกัน, joystick มือถือ, แจ้งเน็ตหลุด, หน้าหมุนจอ
- เทสต์: shared 21 · server 13 (รวม e2e ด้วย SDK จริง) · client 30 · ทดสอบใน headless Chrome แล้ว (2–3 ผู้เล่น, touch, หลุดการเชื่อมต่อ)
- เล่นได้เฉพาะ Wi-Fi เดียวกัน (เซิร์ฟเวอร์รันบนคอมโบ๊ท)

## ไฟล์สำคัญ
| ไฟล์ | หน้าที่ |
|---|---|
| `shared/src/world/generate.ts` | สร้างเกาะจาก seed |
| `shared/src/movement/step.ts` | การเดิน + ชนน้ำ (ใช้ทั้ง server/client) |
| `server/src/rooms/WorldRoom.ts` | ห้องเกม: เข้า/ออก/เดิน |
| `server/src/rooms/schema/WorldState.ts` | ข้อมูลที่ซิงก์ (Player, MoveInput) |
| `client/src/scenes/WorldScene.ts` | ต่อชิ้นส่วนในเกม |
| `client/src/net/prediction.ts` | ระบบทำนายการเดิน |
| `client/src/ui/menu.ts` | เมนูสร้าง/เข้าโลก |

## บั๊ก/ข้อจำกัดที่ยังเปิดอยู่
- ยังไม่มีระบบบันทึกโลก: ทุกคนออก = ห้องหายและเกาะหายไปด้วย (ทำในขั้นที่ 5)
- ยังไม่มี token จำตัวผู้เล่น: เข้าใหม่ = ตัวใหม่ (ทำในขั้นที่ 5)
- ไฟล์ JS ของ client ~1.5 MB (Phaser) — ค่อยแบ่งโหลดตอนทำ PWA ขั้นที่ 6

## ขั้นต่อไป
**ขั้นที่ 3 — เอาชีวิตรอด:** ทรัพยากรบนแผนที่ (ต้นไม้ หิน พุ่มไม้ แหล่งน้ำ) เก็บได้ · กระเป๋า · ค่าเลือด/หิว/น้ำ · กิน/ดื่ม
ต้องเขียนแผน `docs/superpowers/plans/` ใหม่ก่อนลงมือ

## เอกสารอื่น
- [INDEX](INDEX.md)
