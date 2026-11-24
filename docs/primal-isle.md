# Primal Isle — สรุปโปรเจกต์ (อ่านไฟล์นี้ก่อนเริ่มแชตใหม่)

> อัปเดต: 2026-11-24 · เขียนทับทุกครั้งที่จบรอบงาน · repo: `BananaZz27/primal-isle`

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
- ภาพ: วาดด้วยโค้ดทั้งหมดใน `client/src/art/hd/` (ไม่มีไฟล์ภาพ) — เพิ่มของใหม่ = เขียนฟังก์ชันวาด + เทสต์ขนาด/ขอบ
- ขึ้นออนไลน์: หน้าเว็บ → GitHub Pages (`.github/workflows/pages.yml`, ถูกข้ามจนกว่าจะตั้งตัวแปร `SERVER_URL` = `wss://...`) · เซิร์ฟเวอร์ → `Dockerfile` (Oracle) หรือ `render.yaml` (Render, region singapore, deploy เฉพาะเมื่อโค้ดเซิร์ฟเวอร์เปลี่ยน) · คู่มือไทย `docs/DEPLOY.md`

## สถานะ
- ✅ main (merge แล้ว, CI เขียว):
  - ขั้นที่ 1–4: เดินด้วยกัน, ภาพ Pixel-boy, เอาชีวิตรอด (หิว/น้ำ/เลือด), เก็บทรัพยากร, คราฟต์, กองไฟ/ย่าง
  - ขั้นที่ 5: กำแพง/ประตู/ที่นอน, รื้อ, ตายทิ้งถุงของ, บันทึกโลก, token
  - ขั้นที่ 6ก: ไดโน 4 ชนิด (จิ๋ว/ปากเป็ด/แร็พเตอร์/ไทรเซอราทอปส์), ล่าได้เนื้อ, ย่างเนื้อ, หอก, เทม (จิ๋ว=ผลไม้ 3, แร็พเตอร์=เนื้อ 4, คนละ 3 ตัว) ตามเจ้าของ/ช่วยสู้, ประตูกันไดโนป่า, ผู้เล่นชั่วคราวเทมไม่ได้
  - ขั้นที่ 6ข: PWA (ไอคอนบนหน้าจอโฮม, service worker autoUpdate), Docker/Render/Pages, คู่มือ DEPLOY
  - **ขั้นที่ 7 โลกมีชีวิต** (merge จาก branch `m7-living`, รีวิว opus แล้ว ไม่มี Critical):
    - shared `living.ts`: `darkness()/isNight()` (วัน 12 นาที กลางคืนตั้งแต่ 2/3 ของวัน), `CONSUMABLES` (canned +40 อิ่ม, bottle +50 น้ำ, bandage +35 เลือด), `rollLoot`, `crateSpawnOk`, `moveAmount` · ของใหม่ `canned bottle bandage chest` · แร็พเตอร์กลางคืนไล่ ×1.5 · ไดโนกลับบ้านไม่ได้ 8 วิ → ตั้งบ้านใหม่
    - server: `state.clock` · `crateSystem.ts` (ตกทุก 4 นาที สูงสุด 3 หาย 10 นาที, ไม่ตกทับสิ่งก่อสร้าง/ของตกแต่งทุกชนิด, `open {key}`) · กล่องเก็บของใน `buildingSystem.ts` (`chest {key,item,n,dir}`, `state.chests`, 12 ชนิด, รื้อไม่ได้ถ้ามีของ) · รื้อไม่ได้ถ้าของคืนจะเกิน 99 · ไฟล์บันทึก v3
    - client: ความมืด (`render/night.ts` + กติกาใน `render/dayNight.ts`) + แสงกองไฟ ADD · ชิป ☀️/🌅/🌙 ใน `ui/stats.ts` · กล่องเสบียง `render/crates.ts` (ร่มแกว่ง, แจ้งเมื่อตกใหม่) · ลูกศรขอบจอ `ui/crateArrow.ts` · ข้อความ "📦 ได้ …" (`ui/loot.ts`) · หน้าต่างกล่อง `ui/chestPanel.ts` · `pickTarget(px, py, {…})` รับ object · ป้าย ❤️ ใต้เท้าไดโน (`render/labelLayout.ts`) · 🪓 ข้ามกล่องที่มีของ (`demolishTarget`) · "โลกเต็มแล้ว … หรือกำลังเปิดอยู่"
- ✅ ป้ายชื่อเป้า ✋ (merge แล้ว 2026-11-24): ป้ายเหนือสิ่งที่ปุ่ม ✋ จะทำ เช่น "ต้นไม้ → ไม้" (`client/src/ui/targetLabel.ts` + `render/targetLabel.ts`, ใช้ `WorldScene.surroundings` ชุดเดียวกับปุ่ม) · ยกป้ายขึ้นเหนือชื่อตัวเองถ้าเป้าติดตัว
- ✅ **ขั้นที่ 8 ภาพ 32px** (branch `m8-hd-art` → merge) — โบ๊ทเลือก "วาดใหม่ทั้งเกม 2 เท่า" + ไดโนสรีระตามจริง · ไม่มีไฟล์ภาพแล้ว (Pixel-boy ลบออก)
  - ออกแบบ: `docs/superpowers/specs/2026-11-24-m8-hd-art-design.md` (มีตารางไดโน 12 ชนิด + หลักฐานที่ใช้)
  - แสดงผล: `client/src/display.ts` — canvas = พิกเซลจริง (Phaser scale zoom 1/dpr), ซูมกล้องเป็นจำนวนเต็มให้ 1 texel = จำนวนพิกเซลเต็ม (DPR 2 → zoom 6 เท่าเดิม), ภาพ HD วาดที่ `HD_SCALE` 0.5 · DOM ทับโลกใช้ `screenPx` · จอ DPR 1 เห็นใกล้ขึ้นนิด (1 ช่อง 64px)
  - ภาพ (`client/src/art/hd/`): `canvas.ts` เครื่องมือ (ramp + แสงซ้ายบน + dither + outline) · `ground.ts` พื้นแบบ dual grid (4 ชั้น × 16 รูปขอบ ขอบต่อกันสนิท — มีเทสต์) · `nature.ts` ต้นไม้ 2 แบบ ตอ หิน พุ่มไม้ กอหญ้า · `dinoRig.ts` + `species.ts` ไดโน 12 ชนิด · `survivor.ts` คน 8 แบบ × 4 ทิศ × 4 ท่า · `built.ts` สิ่งก่อสร้าง กองไฟ ถุง ลัง · `icons.ts` ไอคอน 18 + หัวใจ
  - `art/textures.ts` = ชื่อ texture + ตารางไอคอน (แทน ninjaAtlas) · BootScene วาดทุกอย่างตอนเริ่ม ~200ms (≈0.8 วิ ที่ CPU ช้า 4 เท่า)
  - ไดโนในเกมยังเป็น 4 ชนิดเดิม (raptor → ยูทาห์แร็พเตอร์, duckbill → พาราซอโรโลฟัส ชื่อในเกมเปลี่ยน id เดิม) · อีก 8 ชนิดวาดแล้ว รอขั้นที่ 9
  - วิธีดูภาพตัวอย่างนอกเกม: สคริปต์ tsx + pngjs (นอก repo) วาด PixelCanvas ลง PNG
- ขึ้นออนไลน์แล้ว ✅ เซิร์ฟเวอร์ Render `wss://primal-isle-st4g.onrender.com` (ตัวแปร `SERVER_URL` ใน GitHub) · หน้าเว็บ https://bananazz27.github.io/primal-isle/ (deploy เองเมื่อ push main) · push ที่แตะ `server/` `shared/` = Render รีสตาร์ท โลกที่เปิดอยู่หาย
- เทสต์ล่าสุด: shared 106 · server 91 · client 161

## การตัดสินใจระหว่างทำขั้นที่ 7 (rulings)
- โลกใหม่เริ่มตอนเช้า (`dayStartSec` 60)
- กล่องเสบียงไม่ตกทับสิ่งก่อสร้างใดๆ (ไม่ใช่แค่ของแข็ง)
- ของจากกล่องเสบียงที่เกิน 99 ทิ้งไป (กล่องเปิดได้ตามปกติ)
- ระยะไล่กลางคืนต่อผ่าน `DinoHooks.night()` — เทสต์ที่ shared แล้ว ยังไม่มีเทสต์ฝั่งเซิร์ฟเวอร์
- หน้าต่างกล่องเก็บของ: แตะของ = ย้ายทั้งกอง (เอกสารออกแบบเคยเขียน "แตะ = 1, ค้าง = ทั้งกอง" — เลือกแบบง่ายกว่า เพราะกดค้างบนมือถือชนกับการเลื่อน)
- เลือกกล่องเก็บของด้วยระยะ 24px (เท่าเก็บของ) แต่หน้าต่างปิดเมื่อเกิน 32px (= ระยะที่เซิร์ฟเวอร์ยอมให้ย้ายของ)
- ลูกศรกล่องเสบียงเว้นขอบล่าง 96px (พ้นแถบกระเป๋า) ขอบบน 56px — พบตอนตรวจในเบราว์เซอร์ว่าลูกศรไปซ่อนหลังกระเป๋า
- ความมืดสูงสุด 0.55 อยู่ใน `client/src/config.ts` (ค่าการแสดงผล ไม่ใช่กติกาเกม จึงไม่อยู่ใน balance.json)

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
| `client/src/render/{players,structures,dinos,crates,night}.ts` · `client/src/input/{interact,building,feed}.ts` | วาด / เลือกเป้า |
| `client/src/ui/{chestPanel,crateArrow,loot,stats,inventory}.ts` | UI ที่เป็น HTML |
| `Dockerfile` · `render.yaml` · `.github/workflows/{ci,pages}.yml` · `docs/DEPLOY.md` | ขึ้นออนไลน์ |

## บั๊ก/ข้อจำกัดที่ยังเปิดอยู่ (เล็ก)
- แร็พเตอร์กัดชิดจนภาพทับตัวละคร · ไดโนไม่มีระบบหาทาง (ติดกำแพง/ต้นไม้ได้ — ตั้งใจ) · ไดโนจิ๋วที่เทมไม่มีแรงกัด · ตอนเน็ตหลุด 20 วิ ตัวละครยังโดนกัดได้ · `Dino.mood` ไม่แม่น (client ยังไม่ใช้)
- จากรีวิวขั้นที่ 7 (เล็ก ยังไม่แก้): ย้ายที่นอนตอนมีที่นอน 99 อันเสีย 1 อัน · ย้ายของในกล่องได้แค่ทั้งกอง · ยังไม่มีเทสต์ฝั่งเซิร์ฟเวอร์ของแร็พเตอร์ไล่ไกลตอนกลางคืน และ NightView/CrateView (คลาส Phaser) ตรวจด้วยเบราว์เซอร์เท่านั้น
- Render ฟรีหลับเมื่อว่าง 15 นาที และลบเซฟทุกครั้ง → เก็บเกาะถาวรต้อง Oracle · iPhone ไม่สนค่า fullscreen/landscape
- ไฟล์ JS ของ client ~1.5 MB · ยังไม่ได้วัด FPS บนมือถือจริง · กด Enter ในเมนูยังไม่ทำงาน · เครื่องมือยังไม่มีความทนทาน

## ขั้นต่อไป
1. ขั้นที่ 9: ใส่ไดโน 8 ชนิดใหม่ลงเกม (balance.json + เกิดใกล้น้ำ/เป็นฝูง + ขนาดกล่องชนตัวใหญ่ — บทบาทที่เสนออยู่ในเอกสารออกแบบขั้นที่ 8)
2. ถ้าอยากต่อ: เซฟถาวร (ย้ายไป Oracle), ทดสอบบนมือถือจริง, ปรับสมดุล, เสียง, ระบบหาทางของไดโน

## เอกสารอื่น
- [INDEX](INDEX.md) · [คู่มือขึ้นออนไลน์](DEPLOY.md)
