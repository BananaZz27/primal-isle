# Primal Isle — สรุปโปรเจกต์ (อ่านไฟล์นี้ก่อนเริ่มแชตใหม่)

> อัปเดต: 2026-11-23 · เขียนทับทุกครั้งที่จบรอบงาน · repo: `BananaZz27/primal-isle`

## คืออะไร
เกมเอาชีวิตรอดออนไลน์แนว Durango: Wild Lands (คนยุคปัจจุบันติดเกาะไดโนเสาร์) มุมมองจากด้านบน ภาพพิกเซล
เล่นบนเว็บได้ทุกแพลตฟอร์ม เพื่อนเข้าผ่านลิงก์ สูงสุด 8 คนต่อโลก · PvE เท่านั้น
ห้ามใช้ชื่อ/ภาพ/เสียงของ Durango · asset ภายนอกต้องเป็น CC0/CC-BY เท่านั้น (บันทึกใน `CREDITS.md`)
โบ๊ทสั่ง "ทำให้ครบทุกขั้นตอน ไม่ต้องขออนุมัติ" — Claude ตัดสินใจเองได้ ยกเว้นสิ่งที่ย้อนไม่ได้หรือต้องใช้บัญชีของโบ๊ท

## วิธีทำงานที่ใช้มาตลอด (ให้เซสชันใหม่ทำต่อแบบเดิม)
- แต่ละขั้น: เอกสารออกแบบ `docs/superpowers/specs/` → แผน `docs/superpowers/plans/` → ทำทีละ task แบบ TDD (เขียนเทสต์ให้แดงก่อน) → ตรวจในเบราว์เซอร์ (headless Chrome + puppeteer-core) → ให้ reviewer ตัวใหม่ (model opus) ตรวจทั้ง branch → แก้ Critical/Important (แต่ละข้อมีเทสต์แดง→เขียว) → merge `--no-ff` เข้า main → push → เช็ก CI
- ทำงานบน feature branch ไม่ทำบน main ตรงๆ · commit ลงท้ายด้วยบรรทัด Co-Authored-By / Claude-Session
- รันเทสต์: `npm test` (ทุก workspace) · `npm run typecheck` · เล่นเอง: `npm run dev:server` + `npm run dev:client`
- เทสต์ฝั่งเซิร์ฟเวอร์ตั้ง `WILD_DINOS=0` (ใน `server/test/setup.ts`) — เทสต์วางไดโน/กล่องเองด้วย `spawnAt`

## สิ่งที่ตัดสินใจแล้ว
- Stack: TypeScript ทั้งระบบ · Phaser 4.2 · Colyseus 0.18 · Vite 8 · Vitest · npm workspaces (`shared/` กติกา pure · `server/` ห้อง `world` server authoritative · `client/`)
- แผนที่ไม่ส่งทางเน็ต: สร้างจาก `seed` ทั้งสองฝั่ง · ตัวเลขสมดุลทั้งหมดใน `shared/src/data/balance.json`
- Netcode: fixed timestep 20Hz + `defineInput` · client ทำนายตัวเอง (Predict) · ไดโนใช้ lerp · `stepPlayer` ต้องให้ผลเหมือนเดิมทุกบิต (มีเทสต์)
- บันทึกโลก: JSON ต่อโลก `server/data/worlds/<รหัส>.json` (`DATA_DIR`) ผ่าน `WorldStore` · บันทึกทุก 30 วิ/ตอนห้องปิด/ตอน Ctrl+C · บันทึกต่อคิว + ตรวจโครงไฟล์ · **version 3** (อ่าน 1–2 ได้)
- รหัสโลกถาวร 6 ตัว · token ผู้เล่นใน localStorage `primal-isle:token` · **token ห้ามอยู่ใน state ที่ซิงก์** (เจ้าของสิ่งก่อสร้าง/ไดโนเก็บฝั่งเซิร์ฟเวอร์) · กด F5 รับตัวละครเดิมคืนทันที
- ภาพ: Pixel-boy CC0 + ภาพวาดเองด้วยตัวอักษรในโค้ด (`client/src/art/`: กองไฟ, สิ่งก่อสร้าง, ไดโน 4 ชนิด, เนื้อดิบ)
- ขึ้นออนไลน์: หน้าเว็บ → GitHub Pages (`.github/workflows/pages.yml`, ถูกข้ามจนกว่าจะตั้งตัวแปร `SERVER_URL` = `wss://...`) · เซิร์ฟเวอร์ → `Dockerfile` (Oracle) หรือ `render.yaml` (Render, region singapore, deploy เฉพาะเมื่อโค้ดเซิร์ฟเวอร์เปลี่ยน) · คู่มือไทย `docs/DEPLOY.md`

## สถานะ
- ✅ main (merge แล้ว, CI เขียว):
  - ขั้นที่ 1–4: เดินด้วยกัน, ภาพ Pixel-boy, เอาชีวิตรอด (หิว/น้ำ/เลือด), เก็บทรัพยากร, คราฟต์, กองไฟ/ย่าง
  - ขั้นที่ 5: กำแพง/ประตู/ที่นอน, รื้อ, ตายทิ้งถุงของ, บันทึกโลก, token
  - ขั้นที่ 6ก: ไดโน 4 ชนิด (จิ๋ว/ปากเป็ด/แร็พเตอร์/ไทรเซอราทอปส์), ล่าได้เนื้อ, ย่างเนื้อ, หอก, เทม (จิ๋ว=ผลไม้ 3, แร็พเตอร์=เนื้อ 4, คนละ 3 ตัว) ตามเจ้าของ/ช่วยสู้, ประตูกันไดโนป่า, ผู้เล่นชั่วคราวเทมไม่ได้
  - ขั้นที่ 6ข: PWA (ไอคอนบนหน้าจอโฮม, service worker autoUpdate), Docker/Render/Pages, คู่มือ DEPLOY
- 🚧 **ขั้นที่ 7 กำลังทำ — branch `m7-living` (push ขึ้น GitHub แล้ว ยังไม่ merge)**
  - แผน: `docs/superpowers/plans/2026-11-22-m7-living.md` · ออกแบบ: `docs/superpowers/specs/2026-11-22-m7-living-design.md` (อยู่บน branch นี้)
  - ✅ Task 1 (shared, `9453b49`): `shared/src/rules/living.ts` — `darkness()/isNight()` (วัน 12 นาที กลางคืนตั้งแต่ 2/3 ของวัน), `CONSUMABLES` (+ `canned` +40 อิ่ม, `bottle` +50 น้ำ, `bandage` +35 เลือด), `rollLoot`, `crateSpawnOk`, `moveAmount` (ย้ายของกระเป๋า↔กล่อง) · ของใหม่ `canned bottle bandage chest` (chest = ไม้ 6 หิน 2, ชนได้) · แร็พเตอร์กลางคืนไล่ไกล ×1.5 (`DinoView.aggroMul`) · ไดโนกลับบ้านไม่ได้ 8 วิ → ตั้งบ้านใหม่
  - ✅ Task 2 (server, `dba7ec9`): `state.clock` (วินาทีของวัน, เริ่มเช้า 60) · `server/src/rooms/crateSystem.ts` (กล่องเสบียงตกทุก 4 นาที สูงสุด 3 หาย 10 นาที, ข้อความ `open {key}`) · กล่องเก็บของใน `buildingSystem.ts` (ข้อความ `chest {key,item,n,dir:"put"|"take"}`, `state.chests`, รื้อไม่ได้ถ้ามีของ) · รื้อไม่ได้ถ้าของคืนจะเกิน 99 · `survival.eat` ใช้ CONSUMABLES · `dinos.renameOwner` · ไฟล์บันทึก v3 (`clock`, `crates`, `structures[].items`)
  - ⏭️ **Task 3 (client) — ยังไม่เริ่ม ทำต่อจากตรงนี้** (ตอนนี้ client typecheck/เทสต์แดง 2 ข้อ เพราะยังไม่มีไอคอน/ชื่อของใหม่ — ตั้งใจ)
  - ⏭️ Task 4: ตรวจในเบราว์เซอร์ + อัปเดต README/เอกสารนี้ + final review (opus) + แก้ + merge + push + CI
- เทสต์ล่าสุด (branch m7): shared 106 · server 89 · client 103/105 (2 แดงที่รอ Task 3)
- **ยังไม่ได้ขึ้นออนไลน์จริง**: รอโบ๊ทสมัคร Render หรือ Oracle + เปิด Pages + ตั้ง `SERVER_URL` ตาม `docs/DEPLOY.md` (ระหว่างนี้เล่นได้เฉพาะ Wi-Fi เดียวกัน)

## งาน Task 3 (client) ที่ต้องทำ
1. `client/src/ui/labels.ts`: ชื่อไทย canned "อาหารกระป๋อง", bottle "น้ำขวด", bandage "ผ้าพันแผล", chest "กล่องเก็บของ" + RECIPE_HINTS.chest · แก้รายการที่ปักชื่อไว้ใน `client/test/crafting-ui.test.ts`
2. ไอคอนใน `client/src/art/ninjaAtlas.ts` (วาดเองด้วยตัวอักษร: กระป๋อง ขวด ผ้าพันแผล กล่อง) · ภาพกล่องเก็บของ (สิ่งก่อสร้าง) + ลังเสบียงมีร่มชูชีพ · `TEX` ใหม่ + paint ใน `BootScene`
3. `client/src/ui/inventory.ts` ACTIONS: canned/bottle/bandage = "eat" (ใช้), chest = "place"
4. ความมืด: Graphics สี่เหลี่ยมติดกล้อง alpha = `darkness(state.clock) * 0.55` + วงแสงส้ม additive รอบกองไฟ (ไม่ใช้ Phaser Lights) · ชิป ☀️/🌙 ใน HUD
5. กล่องเสบียง: วาดจาก `state.crates` · `pickTarget` ลำดับใหม่: ถุงของ → กล่องเสบียง (ส่ง `open`) → ไดโน → กล่องเก็บของ (เปิดหน้าต่าง) → ทรัพยากร → กองไฟ → น้ำ · ลูกศรขอบจอชี้กล่องที่ใกล้สุด + ระยะ · ข้อความแจ้งเมื่อกล่องใหม่ตก
6. หน้าต่างกล่องเก็บของ: สองฝั่ง กระเป๋า ↔ กล่อง แตะของ = ย้ายทั้งกอง (`chest` n = จำนวนที่มี) · ปิดเมื่อเดินออกนอกระยะ 32px · ใช้ `textContent`
7. เก็บกวาด: ป้าย ❤️ ไดโนย้ายไปใต้เท้า (ไม่ทับชื่อคน) · `client/src/net/errors.ts`: "world already open" → "โลกเต็มแล้ว (สูงสุด 8 คน)"
8. เทสต์: ภาพใหม่ parse ได้ · ลำดับ pickTarget · ลูกศรชี้ทิศถูก · ข้อความ error · ชื่อ/ไอคอนครบ

## การตัดสินใจระหว่างทำขั้นที่ 7 (rulings)
- โลกใหม่เริ่มตอนเช้า (`dayStartSec` 60)
- กล่องเสบียงไม่ตกทับสิ่งก่อสร้างใดๆ (ไม่ใช่แค่ของแข็ง)
- ของจากกล่องเสบียงที่เกิน 99 ทิ้งไป (กล่องเปิดได้ตามปกติ)
- ระยะไล่กลางคืนต่อผ่าน `DinoHooks.night()` — เทสต์ที่ shared แล้ว ยังไม่มีเทสต์ฝั่งเซิร์ฟเวอร์ (ตรวจตอนเบราว์เซอร์)

## ไฟล์สำคัญ
| ไฟล์ | หน้าที่ |
|---|---|
| `shared/src/rules/{building,crafting,resources,survival,dinos,living}.ts` | กติกาทั้งหมด |
| `shared/src/ai/dinoBrain.ts` | สมองไดโน `think()/hurt()` (pure) |
| `server/src/rooms/WorldRoom.ts` | ห้องเกม: เปิด/โหลด, เข้า/ออก, ข้อความ, เวลา, บันทึก |
| `server/src/rooms/{survival,crafting,building,dino,crate}System.ts` | ระบบแยกตามหน้าที่ |
| `server/src/persistence/{worldStore,snapshot}.ts` | ไฟล์บันทึก + ตรวจโครงไฟล์ |
| `server/src/rooms/schema/WorldState.ts` | state ที่ซิงก์ |
| `client/src/scenes/WorldScene.ts` | ต่อชิ้นส่วนในเกม |
| `client/src/render/{players,structures,dinos}.ts` · `client/src/input/{interact,building,feed}.ts` | วาด / เลือกเป้า |
| `Dockerfile` · `render.yaml` · `.github/workflows/{ci,pages}.yml` · `docs/DEPLOY.md` | ขึ้นออนไลน์ |

## บั๊ก/ข้อจำกัดที่ยังเปิดอยู่ (เล็ก)
- แร็พเตอร์กัดชิดจนภาพทับตัวละคร · ไดโนไม่มีระบบหาทาง (ติดกำแพง/ต้นไม้ได้ — ตั้งใจ) · ไดโนจิ๋วที่เทมไม่มีแรงกัด · ตอนเน็ตหลุด 20 วิ ตัวละครยังโดนกัดได้ · `Dino.mood` ไม่แม่น (client ยังไม่ใช้)
- Render ฟรีหลับเมื่อว่าง 15 นาที และลบเซฟทุกครั้ง → เก็บเกาะถาวรต้อง Oracle · iPhone ไม่สนค่า fullscreen/landscape
- ไฟล์ JS ของ client ~1.5 MB · ยังไม่ได้วัด FPS บนมือถือจริง · กด Enter ในเมนูยังไม่ทำงาน · เครื่องมือยังไม่มีความทนทาน

## ขั้นต่อไป
1. ทำ Task 3 → Task 4 ของขั้นที่ 7 บน branch `m7-living` แล้ว merge
2. โบ๊ท: ขึ้นออนไลน์ตาม `docs/DEPLOY.md`
3. หลังจากนั้น (ถ้าอยากต่อ): ทดสอบบนมือถือจริง, ปรับสมดุล, เสียง, ระบบหาทางของไดโน

## เอกสารอื่น
- [INDEX](INDEX.md) · [คู่มือขึ้นออนไลน์](DEPLOY.md)
