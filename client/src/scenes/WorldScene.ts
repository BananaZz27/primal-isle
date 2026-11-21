import Phaser from "phaser";
import { generateWorld, TILE_SIZE } from "@primal/shared";
import { CAMERA_ZOOM } from "../config";
import { combineInputs } from "../input/combine";
import { KeyboardInput } from "../input/keyboard";
import { TouchJoystick } from "../input/touchJoystick";
import type { WorldRoom } from "../net/connection";
import { startPrediction, type Prediction } from "../net/prediction";
import { PlayerSprites } from "../render/players";
import { buildTilemap } from "../render/tilemap";
import { showConnectionLost } from "../ui/hud";
import { showInvitePanel } from "../ui/invitePanel";

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
    buildTilemap(this, map);

    const worldPx = map.size * TILE_SIZE;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldPx, worldPx);
    cam.setZoom(CAMERA_ZOOM);

    this.players = new PlayerSprites(this, this.room);
    this.prediction = startPrediction(this.room, map);
    this.keyboard = new KeyboardInput(this);
    if (TouchJoystick.wanted()) this.joystick = new TouchJoystick();

    const self = this.players.get(this.room.sessionId);
    if (self) cam.startFollow(self, true, 0.2, 0.2);

    const cleanups: Array<() => void> = [showInvitePanel(this.room.roomId)];

    this.room.onLeave(() => {
      this.connected = false;
      cleanups.push(showConnectionLost(() => this.scene.start("Menu")));
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cleanups.forEach((fn) => fn());
      this.joystick?.destroy();
      this.joystick = null;
      this.players.destroy();
      if (this.connected) this.room.leave();
    });
  }

  update() {
    if (!this.connected) return;
    const dir = this.joystick
      ? combineInputs(this.keyboard.read(), this.joystick.read())
      : this.keyboard.read();
    this.prediction.tick(performance.now(), dir);
    this.players.update((p) => this.prediction.pos(p));
  }
}
