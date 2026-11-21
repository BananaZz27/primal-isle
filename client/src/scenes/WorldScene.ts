import Phaser from "phaser";
import { generateDecor, generateWorld, solidFromNodes, TILE_SIZE } from "@primal/shared";
import { CAMERA_ZOOM } from "../config";
import { combineInputs } from "../input/combine";
import { InteractControls, pickTarget } from "../input/interact";
import { KeyboardInput } from "../input/keyboard";
import { TouchJoystick } from "../input/touchJoystick";
import type { WorldRoom } from "../net/connection";
import { startPrediction, type Prediction } from "../net/prediction";
import { PlayerSprites } from "../render/players";
import { ResourceView } from "../render/resourceNodes";
import { buildTilemap } from "../render/tilemap";
import { showConnectionLost, showReconnecting } from "../ui/hud";
import { InventoryHud } from "../ui/inventory";
import { showInvitePanel } from "../ui/invitePanel";
import { StatsHud } from "../ui/stats";

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
  private keyboard!: KeyboardInput;
  private joystick: TouchJoystick | null = null;
  private interact!: InteractControls;
  private statsHud!: StatsHud;
  private inventoryHud!: InventoryHud;
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
    const solid = solidFromNodes(map, decor, (id) => this.room.state.nodes.get(String(id))?.hp === 0);

    const worldPx = map.size * TILE_SIZE;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldPx, worldPx);
    cam.setZoom(CAMERA_ZOOM);

    this.players = new PlayerSprites(this, this.room);
    this.prediction = startPrediction(this.room, map, solid);
    this.keyboard = new KeyboardInput(this);
    if (TouchJoystick.wanted()) this.joystick = new TouchJoystick();

    const self = this.players.get(this.room.sessionId);
    if (self) cam.startFollow(self, true, 0.2, 0.2);

    // โต้ตอบ: หาสิ่งที่ใกล้ที่สุดจากตำแหน่งที่เห็นบนจอ แล้วขอเซิร์ฟเวอร์ (เซิร์ฟเวอร์ตรวจซ้ำเสมอ)
    const isDepleted = (id: number) => this.room.state.nodes.get(String(id))?.hp === 0;
    this.interact = new InteractControls(this, TouchJoystick.wanted(), () => {
      const me = this.room.state.players.get(this.room.sessionId);
      if (!me || !this.connected) return;
      const { x, y } = this.prediction.pos(me);
      const target = pickTarget(x, y, decor, map, isDepleted);
      if (target?.kind === "node") this.room.send("gather", { node: target.id });
      else if (target?.kind === "water") this.room.send("drink", {});
    });
    this.statsHud = new StatsHud();
    this.inventoryHud = new InventoryHud((item) => this.room.send("eat", { item }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
    this.interact.update(now);

    // HUD เป็น HTML อัปเดตทุก 200ms พอ ไม่ต้องทุกเฟรม
    if (now - this.hudTimer > 200) {
      this.hudTimer = now;
      const me = this.room.state.players.get(this.room.sessionId);
      if (me) {
        this.statsHud.update(me);
        this.inventoryHud.update(me);
      }
    }
  }
}
