# Primal Isle — สรุปโปรเจกต์ (อ่านไฟล์นี้ก่อนเริ่มแชตใหม่)

> อัปเดต: 2026-11-22 · เขียนทับทุกครั้งที่จบรอบงาน

## คืออะไร
เกมเอาชีวิตรอดออนไลน์แนว Durango: Wild Lands (คนยุคปัจจุบันติดเกาะไดโนเสาร์) มุมมองจากด้านบน ภาพพิกเซล
เล่นบนเว็บได้ทุกแพลตฟอร์ม เพื่อนเข้าผ่านลิงก์ สูงสุด 8 คนต่อโลก · PvE เท่านั้น
ห้ามใช้ชื่อ/ภาพ/เสียงของ Durango · asset ภายนอกต้องเป็น CC0 หรือ CC-BY เท่านั้น (บันทึกใน `CREDITS.md`)

## สิ่งที่ตัดสินใจแล้ว
- Stack: TypeScript ทั้งระบบ · Phaser 4.2 (client) · Colyseus 0.18 (server) · Vite · Vitest · npm workspaces
- โครงสร้าง: `shared/` กติกาเกม pure function · `server/` ห้อง `world` (server authoritative) · `client/` หน้าจอ
- แผนที่ไม่ส่งทางเน็ต: ทั้งสองฝั่งสร้างจาก `seed` · ทรัพยากร = ของตกแต่งจาก seed (id = ลำดับใน `generateDecor`)
- Netcode: fixed timestep 20Hz + `defineInput` (server) · `Predict` reconciler (client) · `stepPlayer` ตัวเดียวใช้ทั้งสองฝั่ง · `stepBudget` กันโกงความเร็ว
- ตัวเลขสมดุลทั้งหมด: `shared/src/data/balance.json` · ค่าคงที่: `shared/src/constants.ts`
- ภาพ: asset CC0 ของ Pixel-boy (`client/public/assets/ninja-adventure/`) + ภาพวาดเองด้วยโค้ด (`client/src/art/structures.ts`, `campfire.ts`)
- **บันทึกโลก (ขั้นที่ 5):** ไฟล์ JSON ต่อโลก `server/data/worlds/<รหัส>.json` (เปลี่ยนที่ด้วย `DATA_DIR`) ผ่าน interface `WorldStore` — เปลี่ยนเป็นฐานข้อมูลทีหลังได้โดยไม่แตะห้อง · บันทึกทุก 30 วิ, ตอนห้องปิด, และตอน Ctrl+C
- รหัสโลกถาวร 6 ตัว (ไม่มี 0/O/1/I) = `roomId` · เข้ารหัสที่ไม่มีห้องเปิด → เปิดห้องจากไฟล์บันทึก
- token จำตัวผู้เล่น: สุ่มในเบราว์เซอร์ เก็บใน localStorage `primal-isle:token` · token เดียวกันเข้าซ้อนสองแท็บไม่ได้
- วางของ: ช่องหน้าตัวนับจากขอบกล่องชน (`client/src/input/building.ts` `frontTile`) · ระยะวาง `placeReach` 32px (เก็บของ 24px)

## สถานะ
- ✅ ขั้นที่ 1–2 เดินด้วยกัน · ✅ ภาพ Pixel-boy · ✅ ขั้นที่ 3 เอาชีวิตรอด · ✅ ขั้นที่ 4 คราฟต์/กองไฟ
- ✅ ขั้นที่ 5: กำแพง (ชนได้) ประตู ที่นอน (ฟื้นที่ที่นอน, คนละ 1 อัน), รื้อได้ของคืน, ตายแล้วทิ้งถุงของ (หาย 15 นาที), บันทึก/โหลดโลก, token
- ทดสอบในเบราว์เซอร์ (headless Chrome): ตีต้นไม้ → คราฟต์กำแพง → วาง → Ctrl+C เซิร์ฟเวอร์ → เปิดใหม่ → ใส่รหัสเดิม = กำแพงและของในกระเป๋ากลับมาครบ (ผ่าน 2 รอบติด)
- เทสต์: shared 76 · server 57 · client 95 · CI บน GitHub
- เล่นได้เฉพาะ Wi-Fi เดียวกัน (เซิร์ฟเวอร์รันบนคอมโบ๊ท)

## ไฟล์สำคัญ
| ไฟล์ | หน้าที่ |
|---|---|
| `shared/src/rules/building.ts` | กติกาการวาง `placeCheck`, รหัสโลก, token |
| `shared/src/rules/{survival,crafting,resources}.ts` | ค่าสถานะ, สูตรคราฟต์, ทรัพยากร |
| `server/src/rooms/WorldRoom.ts` | ห้องเกม: สร้าง/เปิดจากไฟล์, เข้า/ออก, ข้อความ, บันทึก |
| `server/src/rooms/{survival,crafting,building}System.ts` | ระบบแยกตามหน้าที่ |
| `server/src/persistence/{worldStore,snapshot}.ts` | อ่าน/เขียนไฟล์บันทึก, แปลง state ↔ ไฟล์ |
| `server/src/rooms/schema/WorldState.ts` | ข้อมูลที่ซิงก์ (Player, NodeState, Structure, Drop) |
| `client/src/scenes/WorldScene.ts` | ต่อชิ้นส่วนในเกม |
| `client/src/net/{connection,token,errors}.ts` | เข้าโลก, token, ข้อความ error ภาษาไทย |
| `client/src/render/structures.ts` | วาดสิ่งก่อสร้าง + ถุงของ |

## บั๊ก/ข้อจำกัดที่ยังเปิดอยู่
- กล่องเก็บของ (chest) ยังไม่มี — เลื่อนไปขั้นที่ 7
- (เล็ก) รื้อ/ย้ายที่นอนตอนถือชิ้นนั้นครบ 99 แล้ว ชิ้นที่คืนจะหาย · โลกเต็ม 8 คนแล้วขึ้นข้อความ "เชื่อมต่อไม่ได้" แทน "โลกเต็ม"
- token = กุญแจตัวละคร: ห้ามส่งให้ client (เจ้าของสิ่งก่อสร้างเก็บฝั่งเซิร์ฟเวอร์เท่านั้น) · กด F5 แล้วรับตัวละครเดิมคืนได้ทันที
- `npm run watch -w server` (รีสตาร์ทเองเมื่อแก้โค้ด) กด Ctrl+C แล้วอาจไม่ทันบันทึก — ใช้ `npm run dev:server` ตอนเล่นจริง
- กระเป๋า/ค่าสถานะทุกคนในห้องมองเห็นได้ทาง state · ยังไม่จำกัดจำนวนข้อความต่อวินาที
- ไฟล์ JS ของ client ~1.5 MB (Phaser) — ค่อยแบ่งโหลดตอนทำ PWA ขั้นที่ 6
- (เล็ก) joystick/ปุ่ม ✋ ค้างได้ถ้าพับจอกลางการกด · กระเป๋าล้ำเข้าโซน joystick · หน้าคราฟต์ไม่ปิดตอนเน็ตสะดุด · ป้ายชื่อถูกต้นไม้บัง · กด Enter ในเมนูยังไม่ทำงาน
- (เล็ก) เครื่องมือยังไม่มีความทนทาน · ยังไม่ได้วัด FPS บนมือถือจริง
- `/monitor` และ playground เปิดอยู่ตอน dev — ตอนขึ้นเซิร์ฟเวอร์จริงต้องตั้ง `NODE_ENV=production`

## ขั้นต่อไป
1. **ขั้นที่ 6:** ไดโนเสาร์ 3–4 ชนิด (AI เดินเล่น/หนี/โจมตี, ล่าได้เนื้อ, เทมด้วยการให้อาหาร → ตามและช่วยสู้) + PWA + เตรียมขึ้นเซิร์ฟเวอร์ (client → GitHub Pages, server → Render/Oracle, `VITE_SERVER_URL`)
2. **ขั้นที่ 7:** กล่องเสบียงจากโลกปัจจุบัน, กลางวัน/กลางคืน, กล่องเก็บของ, ขัดเกลา

## เอกสารอื่น
- [INDEX](INDEX.md)
