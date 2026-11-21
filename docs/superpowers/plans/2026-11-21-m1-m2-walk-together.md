# Primal Isle — ขั้นที่ 1–2 "เดินด้วยกัน" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ได้เกมเวอร์ชันแรกที่ "เปิดเล่นได้จริง" — สร้างโลก (เกาะสุ่มจาก seed) ส่งรหัส/ลิงก์ให้เพื่อน แล้วเดินบนเกาะเดียวกันพร้อมกันได้ ทั้งบนคอม (WASD) และมือถือ (joystick บนจอ) ผ่าน Wi-Fi วงเดียวกัน

**Architecture:** npm workspaces 3 แพ็กเกจ: `shared` (กติกาเกมแบบ pure function: สร้างแผนที่, การเดิน, ตรวจชื่อ) ถูกใช้ทั้งฝั่ง `server` (Colyseus 0.18 ห้อง `world`, server authoritative, fixed timestep + input buffer) และ `client` (Phaser 4 + Vite, ทำนายการเดินของตัวเองด้วย `Predict` ของ SDK และเกลี่ย (lerp) ตำแหน่งผู้เล่นคนอื่น) แผนที่ไม่ถูกส่งทางเน็ต — ทั้งสองฝั่งสร้างจาก `seed` เดียวกัน

**Tech Stack:** Node ≥ 22, TypeScript ^5.9, Colyseus 0.18 (`colyseus`, `@colyseus/schema` 5, `@colyseus/sdk`, `@colyseus/tools`, `@colyseus/testing`), Phaser 4.2, Vite 8, Vitest, tsx, simplex-noise 4

**Spec:** `docs/superpowers/specs/2026-11-21-primal-isle-design.md`

## Global Constraints

- Node `>= 22`; ล็อกเวอร์ชัน: `phaser` `~4.2.1`, `colyseus` `~0.18.12`, `@colyseus/sdk` `~0.18.10`, `@colyseus/schema` `^5.0.50`, `@colyseus/tools` `~0.18`, `@colyseus/testing` `~0.18.6`, `vite` `^8.3`, `vitest` `^5.1`, `typescript` `~5.9` (**ไม่ใช้ TypeScript 7** — template ของ Colyseus ยังอิง 5.x), `simplex-noise` `^4.0.3`
- โครงสร้าง repo: `shared/`, `server/`, `client/` ที่ root; ชื่อแพ็กเกจ `@primal/shared`, `@primal/server`, `@primal/client`
- `shared` ห้าม import อะไรจาก Phaser, Colyseus, DOM หรือ Node APIs — pure TypeScript เท่านั้น
- ค่าคงที่ (อยู่ที่ `shared/src/constants.ts` ที่เดียว): `TILE_SIZE = 16`, `WORLD_SIZE = 128` (ช่อง), `TICK_RATE = 20` (Hz), `PLAYER_SPEED = 80` (px/วินาที), `PLAYER_HALF = 5` (ครึ่งความกว้าง hitbox, px), `MAX_PLAYERS = 8`, `NAME_MAX = 16` (ตัวอักษร), `DEFAULT_NAME = "ผู้รอดชีวิต"`, `MAX_CATCHUP_STEPS = 5`
- Server authoritative: client ส่งเฉพาะ input (`moveX`, `moveY` ∈ {-1,0,1}) ไม่ส่งตำแหน่ง
- ไฟล์หนึ่งมีหน้าที่เดียว; จุดสำคัญมีคอมเมนต์ภาษาไทย; โค้ด/ชื่อตัวแปรเป็นภาษาอังกฤษ
- ข้อความที่ผู้เล่นเห็นเป็นภาษาไทย
- ภาพในขั้นนี้ Claude วาดเองด้วยโค้ด (ตารางพิกเซล) — ไม่มี asset ภายนอก; `CREDITS.md` มีหัวข้อพร้อมสำหรับขั้นถัดไป
- ห้ามมี secret/API key ใน repo; repo `BananaZz27/primal-isle` แบบ public, code license MIT
- จอมือถือ: ล็อกแนวนอน (แสดงหน้า "กรุณาหมุนจอ" เมื่อเป็นแนวตั้ง)
- ไม่ใช้ชื่อ โลโก้ ภาพ หรือเสียงของ Durango

## Review Focus

1. **รหัสโลกผิด/โลกเต็ม** — ผู้เล่นต้องเห็นข้อความไทยที่เข้าใจได้และยังอยู่ที่หน้าเมนู ไม่ใช่จอดำ → `describeJoinError` (Task 6)
2. **seed ที่ได้เกาะเล็กหรือแปลก** — จุดเกิดต้องอยู่บนบกเสมอและไม่ทับกัน ทั้ง 8 คน → ทดสอบ 50 seed (Task 2)
3. **พับจอ/สลับแอปแล้วกลับมา** — `predict.tick` อาจคืนจำนวน step มหาศาล ต้องจำกัดไม่เกิน `MAX_CATCHUP_STEPS` ไม่ให้ยิง input รัว → `clampSteps` (Task 7)
4. **เน็ตหลุดกลางเกม** — ต้องเห็น "หลุดการเชื่อมต่อ" พร้อมปุ่มกลับเมนู ไม่ใช่ตัวละครค้างนิ่ง → `connectionLostText` + จัดการ `room.onLeave` (Task 7)
5. **ชื่อเล่นแปลก** (ว่าง, ช่องว่างล้วน, ยาวมาก, มี `<script>`, อีโมจิ) — ตัด/แทนค่าให้ปลอดภัยทั้งสองฝั่ง และแสดงเป็นข้อความธรรมดาเสมอ (ห้าม `innerHTML`) → `sanitizeName` (Task 1) + ทดสอบในห้อง (Task 4)

---

### Task 1: Monorepo, ค่าคงที่, `sanitizeName`, CI และสร้าง repo บน GitHub

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `.nvmrc` (`22`), `LICENSE` (MIT, © 2026 BananaZz27), `README.md` (ไทย: เกมคืออะไร, วิธีรัน), `CREDITS.md`
- Create: `shared/package.json`, `shared/tsconfig.json`, `shared/src/index.ts`, `shared/src/constants.ts`, `shared/src/rules/name.ts`
- Create: `.github/workflows/ci.yml`
- Test: `shared/test/name.test.ts`

**Interfaces:**
- Produces: ค่าคงที่ทั้งหมดใน Global Constraints export จาก `@primal/shared`; `sanitizeName(raw: unknown): string`
- `shared/package.json`: `"type": "module"`, `"exports": { ".": "./src/index.ts" }` (ใช้ซอร์ส TS ตรงๆ — tsx, Vite, Vitest อ่านได้ ไม่ต้อง build)
- root `package.json`: `"workspaces": ["shared", "server", "client"]`, scripts `test` = `npm test --workspaces --if-present`, `typecheck` = `npm run typecheck --workspaces --if-present`, `dev:server` = `npm start -w server`, `dev:client` = `npm run dev -w client`

- [ ] **Step 1: เขียนเทสต์ที่ fail** — `shared/test/name.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { sanitizeName, NAME_MAX, DEFAULT_NAME } from "../src/index";

describe("sanitizeName", () => {
  it("trims spaces", () => expect(sanitizeName("  โบ๊ท  ")).toBe("โบ๊ท"));
  it("falls back when empty or not a string", () => {
    expect(sanitizeName("")).toBe(DEFAULT_NAME);
    expect(sanitizeName("    ")).toBe(DEFAULT_NAME);
    expect(sanitizeName(undefined)).toBe(DEFAULT_NAME);
    expect(sanitizeName(42)).toBe(DEFAULT_NAME);
  });
  it("cuts to NAME_MAX code points", () => {
    expect(Array.from(sanitizeName("ก".repeat(40))).length).toBe(NAME_MAX);
  });
  it("removes angle brackets and control chars", () => {
    expect(sanitizeName("<b>Rex</b>\n")).toBe("bRex/b");
  });
  it("keeps emoji intact", () => expect(sanitizeName("🦖Dino")).toBe("🦖Dino"));
});
```

- [ ] **Step 2: รัน `npm test -w shared` → FAIL** (module not found)
- [ ] **Step 3: เขียน `sanitizeName` ใน `shared/src/rules/name.ts`** — ไม่ใช่ string → `DEFAULT_NAME`; ลบ `<`, `>` และอักขระควบคุม (`\p{Cc}`); trim; ตัดด้วย `Array.from` ให้เหลือ `NAME_MAX`; ถ้าว่าง → `DEFAULT_NAME`
- [ ] **Step 4: รัน `npm install && npm test -w shared` → PASS** และ `npm run typecheck` ผ่าน
- [ ] **Step 5: CI** — `ci.yml` รันบน push/PR: `actions/setup-node` (Node 22, cache npm) → `npm ci` → `npm run typecheck` → `npm test`
- [ ] **Step 6: สร้าง repo และ push**

```bash
git init -b main && git add -A
git commit -m "chore: monorepo skeleton, shared constants, sanitizeName, CI"
gh repo create BananaZz27/primal-isle --public --source=. --push \
  --description "เกมเอาชีวิตรอดออนไลน์บนเกาะไดโนเสาร์ เล่นบนเว็บได้ทุกแพลตฟอร์ม"
```
Expected: CI บน GitHub เป็นสีเขียว (`gh run watch`)

---

### Task 2: สร้างเกาะจาก seed (`shared/world`)

**Files:**
- Create: `shared/src/world/tiles.ts`, `shared/src/world/rng.ts`, `shared/src/world/generate.ts`, `shared/src/world/spawn.ts`
- Modify: `shared/src/index.ts` (export เพิ่ม)
- Test: `shared/test/world.test.ts`, `shared/test/helpers.ts`

**Interfaces:**
- Produces:
  - `enum Tile { Water = 0, Sand = 1, Grass = 2, Forest = 3 }`; `isWalkable(tile: Tile): boolean` (ทุกอย่างยกเว้น Water)
  - `interface WorldMap { seed: number; size: number; tiles: Uint8Array }` (index = `ty * size + tx`)
  - `tileAt(map: WorldMap, tx: number, ty: number): Tile` — นอกขอบแผนที่คืน `Tile.Water`
  - `mulberry32(seed: number): () => number` (ค่าใน [0,1))
  - `generateWorld(seed: number, size = WORLD_SIZE): WorldMap`
  - `findSpawn(map: WorldMap, index: number): { x: number; y: number }` — พิกัด **พิกเซล** ที่กลางช่อง
  - `makeMap(rows: string[]): WorldMap` ใน `shared/test/helpers.ts` (`~`=Water, `s`=Sand, `.`=Grass, `f`=Forest) สำหรับเทสต์

- [ ] **Step 1: เขียนเทสต์ที่ fail** — `shared/test/world.test.ts`

```ts
it("same seed → identical tiles", () =>
  expect(generateWorld(1234).tiles).toEqual(generateWorld(1234).tiles));
it("different seeds → different tiles", () =>
  expect(generateWorld(1).tiles).not.toEqual(generateWorld(2).tiles));
it("is an island: 2-tile border is all water", () => { /* loop ขอบ 2 ช่องทั้ง 4 ด้าน expect Tile.Water */ });
it("has 35%–75% land", () => { /* นับ isWalkable / size² */ });
it("centre 9x9 contains land", () => { /* อย่างน้อย 1 ช่องเดินได้ */ });
it("tileAt outside the map is water", () => {
  const m = generateWorld(7);
  expect(tileAt(m, -1, 0)).toBe(Tile.Water);
  expect(tileAt(m, m.size, 5)).toBe(Tile.Water);
});
it("spawns are walkable and distinct for 50 seeds × 8 players", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const map = generateWorld(seed);
    const seen = new Set<string>();
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = findSpawn(map, i);
      expect(isWalkable(tileAt(map, Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE)))).toBe(true);
      seen.add(`${p.x},${p.y}`);
    }
    expect(seen.size).toBe(MAX_PLAYERS);
  }
});
```

- [ ] **Step 2: รัน `npm test -w shared` → FAIL**
- [ ] **Step 3: เขียน `generateWorld`** — `createNoise2D(mulberry32(seed))` จาก simplex-noise; ความสูง = ผลรวม noise 2 octave ลบด้วย falloff ตามระยะจากกลางเกาะ (รูปเกาะ); แบ่งช่วงเป็น Water / Sand (ริมฝั่ง) / Grass / Forest; บังคับขอบ 2 ช่องเป็น Water. ปรับ threshold จนเทสต์สัดส่วนบกผ่านทุก seed ที่ทดสอบ
- [ ] **Step 4: เขียน `findSpawn`** — ค้นช่องที่เดินได้แบบวนก้นหอย (spiral) จากกลางเกาะ เก็บรายการตามลำดับ แล้วคืนช่องที่ `index * 3` (ให้ผู้เล่นห่างกันเล็กน้อย) แปลงเป็นพิกเซลกลางช่อง
- [ ] **Step 5: รันเทสต์ → PASS**
- [ ] **Step 6: Commit** `feat(shared): seeded island generation and spawn points`

---

### Task 3: การเดินแบบ pure function (`shared/movement`)

**Files:**
- Create: `shared/src/movement/step.ts`
- Modify: `shared/src/index.ts`
- Test: `shared/test/movement.test.ts`

**Interfaces:**
- Consumes: `WorldMap`, `tileAt`, `isWalkable` (Task 2); `PLAYER_SPEED`, `PLAYER_HALF`, `TILE_SIZE`
- Produces:
  - `interface EntityState { x: number; y: number; vx: number; vy: number }`
  - `interface MoveInputLike { moveX: number; moveY: number }`
  - `stepPlayer(entity: EntityState, input: MoveInputLike, dt: number, map: WorldMap): void` — แก้ค่า `entity` ในตัว; ไม่มีนาฬิกา/การสุ่ม/สถานะภายนอก (ต้องให้ผลเหมือนกันทั้ง server และ client — นี่คือหัวใจของ prediction)

- [ ] **Step 1: เขียนเทสต์ที่ fail** (ใช้ `makeMap`, dt = `1 / TICK_RATE`)

```ts
const open = makeMap(Array(10).fill("..........")); // ทุ่งหญ้าล้วน 10x10
it("moves right at PLAYER_SPEED", () => {
  const e = { x: 80, y: 80, vx: 0, vy: 0 };
  stepPlayer(e, { moveX: 1, moveY: 0 }, 1 / TICK_RATE, open);
  expect(e.x).toBeCloseTo(80 + PLAYER_SPEED / TICK_RATE);
  expect(e.vx).toBe(PLAYER_SPEED);
});
it("diagonal is not faster", () => { /* ระยะทางรวม ≈ PLAYER_SPEED/TICK_RATE */ });
it("clamps input outside -1..1", () => { /* moveX: 100 → เดินเท่ากับ 1 */ });
it("is blocked by water and stops vx", () => {
  const m = makeMap(["..~", "..~", "..~"]);
  const e = { x: 2 * TILE_SIZE - PLAYER_HALF - 0.5, y: 24, vx: 0, vy: 0 };
  stepPlayer(e, { moveX: 1, moveY: 0 }, 1 / TICK_RATE, m);
  expect(e.x).toBe(2 * TILE_SIZE - PLAYER_HALF - 0.5); expect(e.vx).toBe(0);
});
it("slides along a wall when moving diagonally", () => { /* x ถูกบล็อก แต่ y ยังขยับ */ });
it("no input → no movement, velocity zero", () => { /* ... */ });
```

- [ ] **Step 2: รัน → FAIL**
- [ ] **Step 3: เขียน `stepPlayer`** — clamp input เป็น -1..1, normalize แนวทแยงด้วย `Math.SQRT1_2`; ขยับแกน X ก่อน ถ้ามุมใดของกล่อง hitbox (`±PLAYER_HALF`) ไปตกบนช่องที่เดินไม่ได้ → ยกเลิกการขยับแกนนั้นและตั้ง `vx = 0`; จากนั้นทำแบบเดียวกันกับแกน Y
- [ ] **Step 4: รัน → PASS**
- [ ] **Step 5: Commit** `feat(shared): deterministic player movement with tile collision`

---

### Task 4: เซิร์ฟเวอร์ — ห้อง `world`

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/src/app.config.ts`, `server/src/rooms/WorldRoom.ts`, `server/src/rooms/schema/WorldState.ts`, `server/.env.development` (`PORT=2567`)
- Test: `server/test/WorldRoom.test.ts`

**Interfaces:**
- Consumes: `generateWorld`, `findSpawn`, `stepPlayer`, `sanitizeName`, `TICK_RATE`, `MAX_PLAYERS` จาก `@primal/shared`
- Produces:
  - Schema (`@colyseus/schema` แบบ `schema({...})` ตาม template 0.18): `MoveInput { moveX: t.int8, moveY: t.int8 }`; `Player { x, y, vx, vy: t.number(); name: t.string(); colorIndex: t.uint8() }`; `WorldState { seed: t.uint32(); players: t.map(Player) }`
  - ห้องชื่อ `"world"` ใน `app.config.ts` ผ่าน `defineServer({ rooms: { world: defineRoom(WorldRoom) } })` — export default (client ใช้ `import type` เพื่อให้ชื่อห้องถูกตรวจชนิด)
  - Join options: `{ name?: string; seed?: number }` (`seed` ใช้ตอนสร้างห้องเท่านั้น ไม่ส่งมา = สุ่ม `uint32`)
  - **รหัสโลก = `room.roomId`**
  - `server/package.json`: `"exports": { "./app.config": "./src/app.config.ts", "./schema": "./src/rooms/schema/WorldState.ts" }` (client ใช้แค่ `import type` ทั้งสองทาง), scripts `start` = `tsx watch src/index.ts`, `test` = `vitest run`, `typecheck` = `tsc --noEmit`
- ทำตามแพตเทิร์น `netcode-fixed` ของ create-colyseus-app 0.18: `this.defineInput(MoveInput, { bufferMaxSize: 64, sanitize: { moveX: [-1, 1], moveY: [-1, 1] } })`, `this.setFixedTimestep(ctx => this.step(ctx), TICK_RATE)`, ใน `step` เรียก `stepPlayer(player, input, ctx.dt, this.map)` หนึ่งครั้งต่อ input ที่รับมา
- `maxClients = MAX_PLAYERS`; `colorIndex` = ลำดับการเข้า mod 8; `map` เก็บเป็น field ของห้อง (ไม่อยู่ใน state)

- [ ] **Step 1: เขียนเทสต์ที่ fail** (Vitest + `boot(appConfig)` จาก `@colyseus/testing`; `beforeAll` boot, `afterAll` shutdown, `beforeEach` cleanup)

```ts
it("creates the world from the given seed", async () => {
  const room = await colyseus.createRoom<WorldState>("world", { seed: 1234 });
  expect(room.state.seed).toBe(1234);
});
it("spawns a joining player on land with a sanitized name", async () => {
  const room = await colyseus.createRoom("world", { seed: 1234 });
  const c = await colyseus.connectTo(room, { name: "  <Rex>  " });
  const p = room.state.players.get(c.sessionId)!;
  expect(p.name).toBe("Rex");
  expect(findSpawn(generateWorld(1234), 0)).toEqual({ x: p.x, y: p.y });
});
it("applies a buffered input exactly one step", async () => { /* เหมือนเทสต์ template: moveX = 1 → x เพิ่ม PLAYER_SPEED / TICK_RATE */ });
it("clamps a cheating input of 100 to 1", async () => { /* ... */ });
it("two players see each other in state", async () => { /* players.size === 2 */ });
it("rejects the 9th player", async () => { /* connect 8 แล้วคนที่ 9 ต้อง reject */ });
it("removes a player who leaves", async () => { /* c.leave() → players.size ลดลง */ });
```

- [ ] **Step 2: รัน `npm test -w server` → FAIL**
- [ ] **Step 3: เขียน schema, `WorldRoom`, `app.config.ts`, `index.ts`** (`listen(app)` จาก `@colyseus/tools`; เปิด `monitor()` และ `playground()` เฉพาะตอน `NODE_ENV !== "production"`)
- [ ] **Step 4: รัน → PASS**; `npm run dev:server` แล้ว `curl localhost:2567/` ตอบกลับ
- [ ] **Step 5: Commit** `feat(server): authoritative world room with fixed-step input`

---

### Task 5: Client — โครง Phaser, ภาพพิกเซล, แผนที่, หน้าหมุนจอ

**Files:**
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`, `client/src/main.ts`, `client/src/config.ts`
- Create: `client/src/art/palette.ts`, `client/src/art/sprites.ts`, `client/src/art/paint.ts`
- Create: `client/src/scenes/BootScene.ts`, `client/src/scenes/WorldScene.ts`, `client/src/render/tilemap.ts`
- Create: `client/src/ui/rotate.css` (หรือใน `index.html`)
- Test: `client/test/paint.test.ts`

**Interfaces:**
- Consumes: `generateWorld`, `Tile`, `TILE_SIZE` จาก `@primal/shared`
- Produces:
  - `parsePixelArt(rows: string[], palette: Record<string, string>): { width: number; height: number; pixels: (string | null)[] }` — ตัวอักษร `.` = โปร่งใส; ตัวอักษรที่ไม่มีใน palette → throw `Error` ที่บอกตัวอักษรนั้น
  - `paintTexture(scene: Phaser.Scene, key: string, rows: string[], palette): void` — วาดลง CanvasTexture
  - Texture keys: `"tiles"` (strip 4 ช่อง 16×16 เรียงตาม `Tile` enum: น้ำ, ทราย, หญ้า, ป่า), `"survivor"` (ตัวละคร 16×16, สีเสื้อเปลี่ยนด้วย `setTint` ตาม `colorIndex`)
  - `buildTilemap(scene: Phaser.Scene, map: WorldMap): Phaser.Tilemaps.TilemapLayer`
  - `WorldScene` รับ data `{ room: Room<WorldState> }` (ใช้ใน Task 6–7)
- Phaser config: `pixelArt: true`, `roundPixels: true`, `scale: { mode: Phaser.Scale.RESIZE }`, กล้องซูม 3 เท่า, พื้นหลังสีน้ำทะเล
- `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`, กล่อง `#rotate` ข้อความ "กรุณาหมุนจอเป็นแนวนอน 📱↻" แสดงด้วย CSS `@media (orientation: portrait) and (pointer: coarse)`
- `vite.config.ts`: `server: { host: true, port: 5173 }` (เพื่อให้มือถือใน Wi-Fi เดียวกันเข้าได้)

- [ ] **Step 1: เขียนเทสต์ที่ fail** — `parsePixelArt` แปลงตาราง 2×2, `.` เป็น `null`, และ throw เมื่อเจอตัวอักษรที่ไม่รู้จัก
- [ ] **Step 2: รัน `npm test -w client` → FAIL**
- [ ] **Step 3: เขียน `paint.ts`, `palette.ts`, `sprites.ts`** (วาดคนรอดชีวิตใส่เสื้อแบบง่าย ไม่เลียนแบบตัวละครของเกมใด), `BootScene` (สร้าง texture → ไป `MenuScene` ใน Task 6), `buildTilemap`
- [ ] **Step 4: รัน → PASS**; `npm run build -w client` ผ่าน
- [ ] **Step 5: Commit** `feat(client): phaser scaffold, code-drawn pixel art, island tilemap`

---

### Task 6: Client — เมนู สร้าง/เข้าโลก และลิงก์เชิญ

**Files:**
- Create: `client/src/net/serverUrl.ts`, `client/src/net/connection.ts`, `client/src/net/errors.ts`, `client/src/net/invite.ts`
- Create: `client/src/ui/menu.ts`, `client/src/scenes/MenuScene.ts`
- Test: `client/test/net.test.ts`

**Interfaces:**
- Consumes: `WorldScene` data `{ room }` (Task 5); type ของ `app.config` จาก `@primal/server/app.config` (เป็น `import type` เท่านั้น)
- Produces:
  - `resolveServerUrl(envUrl: string | undefined, loc: { protocol: string; hostname: string }): string` — ถ้ามี `VITE_SERVER_URL` ใช้ค่านั้น; ไม่มี → `ws://<hostname>:2567` (หรือ `wss://` ถ้าหน้าเว็บเป็น https)
  - `buildInviteLink(href: string, code: string): string` → URL เดิมแต่ตั้ง query `?w=<code>` (ลบ query อื่นที่ชื่อ `w` ออกก่อน)
  - `readInviteCode(href: string): string | null` — คืนรหัสที่ตัดช่องว่างแล้ว หรือ `null` ถ้าไม่มี/ว่าง
  - `describeJoinError(err: unknown): string` — `ErrorCode.MATCHMAKE_INVALID_ROOM_ID` (522) → `"ไม่พบโลกนี้ หรือโลกเต็มแล้ว (สูงสุด 8 คน)"`; อย่างอื่นทั้งหมด → `"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง"`
  - `createWorld(name: string): Promise<Room<WorldState>>` (`client.create("world", { name })`), `joinWorld(code: string, name: string): Promise<Room<WorldState>>` (`client.joinById(code, { name })`)
  - `showMenu(opts: { inviteCode: string | null; onCreate(name): void; onJoin(code, name): void }): { setError(msg: string): void; setBusy(b: boolean): void; hide(): void }` — DOM overlay; ช่องชื่อเล่น (`maxlength=16`, จำไว้ใน `localStorage` แบบ try/catch), ปุ่ม "สร้างโลกใหม่", ช่องรหัส + ปุ่ม "เข้าโลก" (ถ้ามี invite code ใส่ให้อัตโนมัติ), ข้อความผิดพลาดใช้ `textContent` เท่านั้น
- ในเกม: มุมจอแสดงรหัสโลกและปุ่ม "คัดลอกลิงก์เชิญ" (`navigator.clipboard.writeText` → ถ้าใช้ไม่ได้ให้แสดงลิงก์ให้กดค้างคัดลอก)

- [ ] **Step 1: เขียนเทสต์ที่ fail**

```ts
expect(resolveServerUrl(undefined, { protocol: "http:", hostname: "192.168.1.5" })).toBe("ws://192.168.1.5:2567");
expect(resolveServerUrl(undefined, { protocol: "https:", hostname: "x.io" })).toBe("wss://x.io:2567");
expect(resolveServerUrl("wss://game.example", { protocol: "http:", hostname: "a" })).toBe("wss://game.example");
expect(readInviteCode(buildInviteLink("http://h:5173/?w=old&x=1", "AbC123xyz"))).toBe("AbC123xyz");
expect(readInviteCode("http://h:5173/")).toBeNull();
expect(readInviteCode("http://h:5173/?w=%20%20")).toBeNull();
expect(describeJoinError({ code: 522 })).toBe("ไม่พบโลกนี้ หรือโลกเต็มแล้ว (สูงสุด 8 คน)");
expect(describeJoinError(new Error("boom"))).toBe("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
```

- [ ] **Step 2: รัน → FAIL**
- [ ] **Step 3: เขียนโค้ดตาม Interfaces**; `MenuScene` แสดงเมนู → สำเร็จ: `scene.start("World", { room })` → ล้มเหลว: `setError(describeJoinError(e))` และกดซ้ำได้
- [ ] **Step 4: รัน → PASS**
- [ ] **Step 5: Commit** `feat(client): menu, create/join world, invite links`

---

### Task 7: Client — เดินด้วยกัน (input, prediction, เรนเดอร์ผู้เล่น, หลุดการเชื่อมต่อ)

**Files:**
- Create: `client/src/input/keyboard.ts`, `client/src/input/joystick.ts`, `client/src/input/combine.ts`
- Create: `client/src/net/prediction.ts`, `client/src/render/players.ts`, `client/src/ui/hud.ts`
- Modify: `client/src/scenes/WorldScene.ts`
- Test: `client/test/input.test.ts`, `server/test/twoClients.e2e.test.ts`

**Interfaces:**
- Consumes: `stepPlayer`, `generateWorld` (shared); `import type { WorldState, MoveInput } from "@primal/server/schema"` (Task 4); room (Task 6); `buildTilemap`, texture `"survivor"` (Task 5)
- Produces:
  - `type Axis = -1 | 0 | 1`
  - `quantizeStick(dx: number, dy: number, radius: number, deadzone = 0.25): { moveX: Axis; moveY: Axis }` — ถ้าระยะ < `deadzone × radius` → (0,0); นอกนั้นแบ่ง 8 ทิศตามมุม (ช่องละ 45°, ทิศหลักอยู่กลางช่อง)
  - `combineInputs(a: {moveX: Axis; moveY: Axis}, b: {moveX: Axis; moveY: Axis}): {moveX: Axis; moveY: Axis}` — แกนไหนของ `a` ไม่ใช่ 0 ใช้ `a` ไม่งั้นใช้ `b`
  - `clampSteps(steps: number): number` — คืนค่าใน `[0, MAX_CATCHUP_STEPS]`
  - `connectionLostText(): string` → `"หลุดการเชื่อมต่อกับโลก"`
  - `startPrediction(room, map)` ใช้ `Predict.get(room)` จาก `@colyseus/sdk/predict`: `attachAll("players", { mode: "lerp", fields: ["x","y"], smoothMs: 65 })`, `reconciler(self, { input, fields: ["x","y","vx","vy"], step: (ctx, p, cmd) => stepPlayer(p, cmd, ctx.dt, map) })`; input handle = `room.input<MoveInput>({ mode: "reliable" })`
- joystick: วาดวงกลมโปร่งแสงครึ่งจอซ้าย เกิดตรงที่นิ้วแตะ (floating joystick), แสดงเฉพาะอุปกรณ์สัมผัส
- ทุกเฟรม: `n = clampSteps(predict.tick(now))` → ส่ง input `n` ครั้ง → อัปเดต sprite ทุกคนด้วย `predict.value(player, "x"/"y")`; ชื่อเล่นแสดงเป็น `Phaser.GameObjects.Text` เหนือหัว; กล้อง follow ตัวเรา
- `room.onLeave` → แสดง HUD `connectionLostText()` + ปุ่ม "กลับเมนู" → `scene.start("Menu")`

- [ ] **Step 1: เขียนเทสต์ที่ fail**

```ts
expect(quantizeStick(2, 0, 50)).toEqual({ moveX: 0, moveY: 0 });   // อยู่ใน deadzone
expect(quantizeStick(40, 0, 50)).toEqual({ moveX: 1, moveY: 0 });
expect(quantizeStick(-30, -30, 50)).toEqual({ moveX: -1, moveY: -1 });
expect(quantizeStick(40, -10, 50)).toEqual({ moveX: 1, moveY: 0 });  // ~14° ยังเป็นขวา
expect(combineInputs({ moveX: 1, moveY: 0 }, { moveX: -1, moveY: 1 })).toEqual({ moveX: 1, moveY: 1 });
expect(clampSteps(-3)).toBe(0);
expect(clampSteps(2)).toBe(2);
expect(clampSteps(600)).toBe(MAX_CATCHUP_STEPS);
```

- [ ] **Step 2: รัน → FAIL**
- [ ] **Step 3: เขียนโค้ด input, prediction, render, HUD และต่อเข้ากับ `WorldScene`**
- [ ] **Step 4: รัน `npm test` (ทุก workspace) → PASS** และ `npm run typecheck` ผ่าน
- [ ] **Step 5: ทดสอบปลายทาง (end-to-end)** — รัน `npm run dev:server` + `npm run dev:client`; ใช้สคริปต์ `server/test/twoClients.e2e.test.ts` ที่ต่อ `@colyseus/sdk` 2 ตัวเข้าเซิร์ฟเวอร์จริง: คนแรก `create`, คนที่สอง `joinById(roomId)`, คนแรกส่ง moveX=1 หลายครั้ง → state ฝั่งคนที่สองเห็น x ของคนแรกเพิ่มขึ้น. ถ้ามีเบราว์เซอร์ headless ในเครื่อง ให้เปิด client 2 แท็บแล้วถ่ายภาพหน้าจอแนบรายงาน
- [ ] **Step 6: Commit** `feat(client): walk together with prediction, joystick and disconnect handling`

---

### Task 8: เอกสารสรุปโปรเจกต์ และวิธีเล่นกับเพื่อน

**Files:**
- Create: `docs/INDEX.md`, `docs/primal-isle.md`
- Modify: `README.md`

- [ ] **Step 1: `README.md`** (ภาษาไทย) — วิธีติดตั้ง (`npm install`), วิธีรัน 2 คำสั่ง, **วิธีเล่นกับเพื่อนใน Wi-Fi เดียวกัน**: หา IP ของคอม (`ipconfig` บน Windows), เปิด `http://<IP>:5173` บนมือถือ, อนุญาต Node ผ่าน Windows Firewall (พอร์ต 5173 และ 2567), โครงสร้างโฟลเดอร์ 3 ส่วนพร้อมหน้าที่
- [ ] **Step 2: `docs/primal-isle.md`** — สรุปแบบกลั่นแล้ว (ไม่ใช่บทสนทนา): สิ่งที่ตัดสินใจแล้ว, สถานะปัจจุบัน (ขั้นที่ 1–2 เสร็จ), ไฟล์สำคัญ, บั๊กที่ยังเปิดอยู่, ขั้นต่อไป (ขั้นที่ 3: เก็บของ + ค่าสถานะ); `docs/INDEX.md` ลิงก์ไปเอกสารนี้ + spec + plan
- [ ] **Step 3: ตรวจไม่มี secret** — `git grep -nE "(api[_-]?key|secret|token)\s*[:=]"` ต้องไม่เจออะไร
- [ ] **Step 4: Commit + push** `docs: project summary and how to play with friends`; CI เขียว
