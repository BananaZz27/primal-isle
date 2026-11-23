import Phaser from "phaser";
import { generateDecor, generateWorld, inPlaceReach, solidFromNodes, TILE_SIZE } from "@primal/shared";
import type { Player } from "@primal/server/schema";
import { CAMERA_ZOOM } from "../config";
import { combineInputs } from "../input/combine";
import { InteractControls, pickTarget } from "../input/interact";
import { KeyboardInput } from "../input/keyboard";
import { TouchJoystick } from "../input/touchJoystick";
import type { WorldRoom } from "../net/connection";
import { startPrediction, type Prediction } from "../net/prediction";
import { PlayerSprites } from "../render/players";
import { DinoView } from "../render/dinos";
import { feedTarget } from "../input/feed";
import { ResourceView } from "../render/resourceNodes";
import { StructureView } from "../render/structures";
import { CrateView } from "../render/crates";
import { NightView } from "../render/night";
import { ChestPanel, chestStillOpen } from "../ui/chestPanel";
import { CrateArrow, nearestCrate } from "../ui/crateArrow";
import { lootGained, lootText } from "../ui/loot";
import { CraftPanel } from "../ui/craftPanel";
import { el, uiRoot } from "../ui/dom";
import { frontTile, nearestInReach } from "../input/building";
import { buildTilemap } from "../render/tilemap";
import { showConnectionLost, showReconnecting } from "../ui/hud";
import { InventoryHud } from "../ui/inventory";
import { showInvitePanel } from "../ui/invitePanel";
import { StatsHud, toast } from "../ui/stats";

export interface WorldSceneData {
  room: WorldRoom;
}

/**
 * ฉากในเกม — ต่อชิ้นส่วนเข้าด้วยกัน (ไม่มี logic เกมในไฟล์นี้):
 * แผนที่ ← seed, ผู้เล่น ← state, input → ระบบทำนาย → เซิร์ฟเวอร์
 */
export class WorldScene extends Phaser.Scene {
  private room!: WorldRoom;
  private prediction!: Prediction;
  private players!: PlayerSprites;
  private dinoView!: DinoView;
  private feedButton!: HTMLButtonElement;
  private keyboard!: KeyboardInput;
  private joystick: TouchJoystick | null = null;
  private interact!: InteractControls;
  private statsHud!: StatsHud;
  private inventoryHud!: InventoryHud;
  private craftPanel!: CraftPanel;
  private structures!: StructureView;
  private crates!: CrateView;
  private night!: NightView;
  private crateArrow!: CrateArrow;
  private chestPanel!: ChestPanel;
  /** กล่องเสบียงที่เพิ่งกดเปิด + ของในกระเป๋าก่อนเปิด (ไว้บอกว่าได้อะไร) */
  private pendingLoot: { key: string; before: Record<string, number>; at: number } | null = null;
  private hudTimer = 0;
  private connected = true;

  constructor() {
    super("World");
  }

  init(data: WorldSceneData) {
    this.room = data.room;
    this.connected = true;
  }

  create() {
    const map = generateWorld(this.room.state.seed);
    const decor = generateDecor(map);
    buildTilemap(this, map, decor);
    const resources = new ResourceView(this, decor, this.room);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => resources.destroy());
    // ต้นไม้/หินที่ยังไม่ถูกเก็บหมดเป็นของแข็ง — ใช้สถานะจากเซิร์ฟเวอร์ (ตัวเดียวกับที่เซิร์ฟเวอร์ใช้ชน)
    const resourceSolid = solidFromNodes(map, decor, (id) => this.room.state.nodes.get(String(id))?.hp === 0);
    const structures = new StructureView(this, this.room);
    this.structures = structures;
    this.crates = new CrateView(this, this.room, () => toast("📦 กล่องเสบียงตกลงมาแล้ว! ตามลูกศรไปเปิด"));
    this.night = new NightView(this, () => structures.campfires());
    this.crateArrow = new CrateArrow();
    this.chestPanel = new ChestPanel((key, item, n, dir) => this.room.send("chest", { key, item, n, dir }));
    // ชน = ต้นไม้/หินที่ยังอยู่ + กำแพง (ตัวเดียวกับที่เซิร์ฟเวอร์ใช้)
    const solid = (tx: number, ty: number) => resourceSolid(tx, ty) || structures.solid(tx, ty);

    const worldPx = map.size * TILE_SIZE;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldPx, worldPx);
    cam.setZoom(CAMERA_ZOOM);

    this.players = new PlayerSprites(this, this.room);
    this.dinoView = new DinoView(this, this.room);
    this.prediction = startPrediction(this.room, map, solid);
    this.keyboard = new KeyboardInput(this);
    if (TouchJoystick.wanted()) this.joystick = new TouchJoystick();

    const self = this.players.get(this.room.sessionId);
    if (self) cam.startFollow(self, true, 0.2, 0.2);

    // โต้ตอบ: หาสิ่งที่ใกล้ที่สุดจากตำแหน่งที่เห็นบนจอ แล้วขอเซิร์ฟเวอร์ (เซิร์ฟเวอร์ตรวจซ้ำเสมอ)
    const isDepleted = (id: number) => this.room.state.nodes.get(String(id))?.hp === 0;
    const myPos = () => {
      const me = this.room.state.players.get(this.room.sessionId);
      return me ? this.prediction.pos(me) : null;
    };
    this.interact = new InteractControls(this, TouchJoystick.wanted(), () => {
      const me = this.room.state.players.get(this.room.sessionId);
      if (!me || !this.connected) return;
      const { x, y } = this.prediction.pos(me);
      const canCook = (me.inventory.get("berry") ?? 0) > 0 || (me.inventory.get("meat") ?? 0) > 0;
      const target = pickTarget(x, y, {
        decor,
        map,
        isDepleted,
        campfires: structures.campfires(),
        canCook,
        drops: structures.bagList(),
        crates: this.crates.list(),
        dinos: this.dinoView.list(),
        chests: structures.chests(),
      });
      if (target?.kind === "drop") this.room.send("pickup", { key: target.key });
      else if (target?.kind === "crate") {
        this.pendingLoot = { key: target.key, before: Object.fromEntries(me.inventory.entries()), at: performance.now() };
        this.room.send("open", { key: target.key });
      } else if (target?.kind === "chest") {
        this.craftPanel.close(); // ใช้ที่เดียวกันบนจอ
        this.chestPanel.open(target.key);
      }
      else if (target?.kind === "dino") this.room.send("attack", { id: target.key });
      else if (target?.kind === "node") this.room.send("gather", { node: target.id });
      else if (target?.kind === "campfire") this.room.send("cook", {});
      else if (target?.kind === "water") this.room.send("drink", {});
    });
    this.statsHud = new StatsHud();
    this.inventoryHud = new InventoryHud((item, action) => {
      if (action === "eat") return this.room.send("eat", { item });
      // วางที่ช่องหน้าตัวละคร (ตามทิศที่หัน) — เซิร์ฟเวอร์ตรวจว่าวางได้จริงไหม
      const pos = myPos();
      if (!pos) return;
      const { tx, ty } = frontTile(pos.x, pos.y, this.players.facingOf(this.room.sessionId));
      this.room.send("place", { item, tx, ty });
    });
    this.craftPanel = new CraftPanel(this.inventoryHud.element, (recipe) => this.room.send("craft", { recipe }));
    // ปุ่มรื้อ: รื้อสิ่งก่อสร้างที่ใกล้ที่สุดในระยะ (ได้ของคืน)
    const demolish = el("button", { className: "craft-toggle", text: "🪓" });
    demolish.title = "รื้อสิ่งก่อสร้างที่ใกล้ที่สุด";
    demolish.addEventListener("click", () => {
      const pos = myPos();
      const target = pos && nearestInReach(pos.x, pos.y, structures.all(), inPlaceReach);
      if (target) this.room.send("demolish", { key: target.key });
    });
    this.inventoryHud.element.append(demolish);
    // ปุ่มป้อนอาหาร 🍖 (และปุ่ม F บนคอม): ขึ้นเฉพาะตอนมีไดโนที่เทมได้อยู่ใกล้ และเรามีอาหารที่มันชอบ
    const feed = () => {
      const me = this.room.state.players.get(this.room.sessionId);
      const pos = myPos();
      if (!me || !pos || !this.connected) return;
      const id = feedTarget(pos.x, pos.y, this.dinoView.list(), (i) => me.inventory.get(i) ?? 0);
      if (id) this.room.send("feed", { id });
    };
    this.feedButton = el("button", { className: "panel feed-button", text: "🍖" });
    this.feedButton.title = "ป้อนอาหารไดโน (ครบจำนวน = เทม) · ปุ่ม F";
    this.feedButton.hidden = true;
    this.feedButton.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      feed();
    });
    uiRoot().append(this.feedButton);
    this.input.keyboard?.addKey("F").on("down", feed);
    this.input.keyboard?.addKey("ESC").on("down", () => this.chestPanel.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      structures.destroy();
      this.crates.destroy();
      this.night.destroy();
      this.crateArrow.destroy();
      this.chestPanel.destroy();
      this.dinoView.destroy();
      this.feedButton.remove();
      this.craftPanel.destroy();
      this.interact.destroy();
      this.statsHud.destroy();
      this.inventoryHud.destroy();
    });

    this.watchConnection();
  }

  /**
   * เฝ้าดูการเชื่อมต่อ:
   * - onDrop: เน็ตสะดุด → หยุดส่ง input + แสดง "กำลังเชื่อมต่อใหม่…" (มีปุ่มกลับเมนู)
   * - onReconnect: ต่อกลับได้ → เล่นต่อตัวเดิม
   * - onLeave: หมดหวังแล้ว → แสดง "หลุดการเชื่อมต่อ"
   */
  private watchConnection() {
    const room = this.room;
    // ลองต่อกลับราว 20 วินาที ให้ตรงกับที่เซิร์ฟเวอร์รอ (RECONNECT_SECONDS) — ค่าเริ่มต้นของ SDK นานเกือบนาที
    room.reconnection.maxRetries = 8;
    room.reconnection.maxDelay = 3000;

    const hideInvite = showInvitePanel(room.roomId);
    let hideNotice: (() => void) | null = null;
    const setNotice = (show: (() => () => void) | null) => {
      hideNotice?.();
      hideNotice = show ? show() : null;
    };
    const toMenu = () => this.scene.start("Menu");

    const onDrop = () => {
      this.connected = false;
      setNotice(() => showReconnecting(toMenu));
    };
    const onReconnect = () => {
      this.connected = true;
      setNotice(null);
    };
    const onLeave = () => {
      this.connected = false;
      setNotice(() => showConnectionLost(toMenu));
    };
    room.onDrop(onDrop);
    room.onReconnect(onReconnect);
    room.onLeave(onLeave);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // ถอดตัวฟังก่อน leave() ไม่งั้น onLeave จะเด้งป้ายค้างทับหน้าเมนู
      room.onDrop.remove(onDrop);
      room.onReconnect.remove(onReconnect);
      room.onLeave.remove(onLeave);
      room.leave(); // ออกแบบตั้งใจ = ยกเลิกการต่อกลับอัตโนมัติด้วย

      setNotice(null);
      hideInvite();
      this.joystick?.destroy();
      this.joystick = null;
      this.players.destroy();
      // คืนปุ่ม W/A/S/D/ลูกศร ให้ช่องพิมพ์ในเมนู (Phaser ไม่ล้าง key capture ให้เองตอนปิดฉาก)
      this.input.keyboard?.removeAllKeys(true, true);
      this.input.keyboard?.clearCaptures();
    });
  }

  update() {
    if (!this.connected) return;
    const dir = this.joystick
      ? combineInputs(this.keyboard.read(), this.joystick.read())
      : this.keyboard.read();
    const now = performance.now();
    this.prediction.tick(now, dir);
    this.players.update((p) => this.prediction.pos(p));
    this.dinoView.update(now, (d) => this.prediction.pos(d));
    this.interact.update(now);
    this.night.update(now, this.room.state.clock);
    this.updateCrateArrow();

    // HUD เป็น HTML อัปเดตทุก 200ms พอ ไม่ต้องทุกเฟรม
    if (now - this.hudTimer > 200) {
      this.hudTimer = now;
      const me = this.room.state.players.get(this.room.sessionId);
      if (me) {
        this.statsHud.update(me);
        this.inventoryHud.update(me);
        this.craftPanel.update(me);
        const pos = this.prediction.pos(me);
        this.feedButton.hidden = !feedTarget(pos.x, pos.y, this.dinoView.list(), (i) => me.inventory.get(i) ?? 0);
        this.updateChestPanel(me, pos);
        this.reportLoot(me, now);
      }
      this.statsHud.updateClock(this.room.state.clock);
    }
  }

  /** ลูกศรขอบจอ → กล่องเสบียงที่ใกล้ที่สุด (ซ่อนเมื่อกล่องอยู่ในจอ) */
  private updateCrateArrow() {
    const me = this.room.state.players.get(this.room.sessionId);
    const pos = me && this.prediction.pos(me);
    const crate = pos ? nearestCrate(pos.x, pos.y, this.crates.list()) : null;
    const cam = this.cameras.main;
    const view = cam.worldView;
    const target = crate && {
      sx: ((crate.tx + 0.5) * TILE_SIZE - view.x) * cam.zoom,
      sy: ((crate.ty + 0.5) * TILE_SIZE - view.y) * cam.zoom,
      tiles: crate.tiles,
    };
    this.crateArrow.update(target, this.scale.width, this.scale.height);
  }

  /** หน้าต่างกล่องเก็บของ: อัปเดตตาม state · ปิดเองเมื่อเดินออกนอกระยะหรือกล่องถูกรื้อ */
  private updateChestPanel(me: Player, pos: { x: number; y: number }) {
    const key = this.chestPanel.openKey;
    if (key === null) return;
    if (!chestStillOpen(pos.x, pos.y, this.structures.get(key))) return this.chestPanel.close();
    this.chestPanel.update(me.inventory, this.room.state.chests.get(key)?.items);
  }

  /** กล่องเสบียงที่เพิ่งเปิดหายไปแล้ว → บอกว่าได้อะไร (รอไม่เกิน 3 วิ เผื่อเซิร์ฟเวอร์ไม่ยอม) */
  private reportLoot(me: Player, now: number) {
    const pending = this.pendingLoot;
    if (!pending) return;
    if (this.crates.has(pending.key)) {
      if (now - pending.at > 3000) this.pendingLoot = null;
      return;
    }
    this.pendingLoot = null;
    const gained = lootGained(pending.before, Object.fromEntries(me.inventory.entries()));
    if (gained.length > 0) toast(lootText(gained));
  }
}
