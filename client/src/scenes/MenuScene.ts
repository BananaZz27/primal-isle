import Phaser from "phaser";
import { sanitizeName } from "@primal/shared";
import { createWorld, joinWorld, type WorldRoom } from "../net/connection";
import { describeJoinError } from "../net/errors";
import { readInviteCode } from "../net/invite";
import { showMenu } from "../ui/menu";

/** ฉากเมนู: แสดงฟอร์ม HTML ทับเกม แล้วพาเข้าโลกเมื่อเชื่อมต่อสำเร็จ */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const menu = showMenu({
      inviteCode: readInviteCode(window.location.href),
      onCreate: (name) => this.connect(menu, () => createWorld(sanitizeName(name))),
      onJoin: (code, name) => this.connect(menu, () => joinWorld(code, sanitizeName(name))),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => menu.hide());
  }

  private async connect(menu: ReturnType<typeof showMenu>, open: () => Promise<WorldRoom>) {
    menu.setBusy(true);
    try {
      const room = await open();
      // รอ state ชุดแรกจากเซิร์ฟเวอร์ (มี seed และตัวเรา) ก่อนเข้าโลก
      if (!room.state.players?.get(room.sessionId)) {
        await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
      }
      this.scene.start("World", { room });
    } catch (err) {
      console.error(err);
      menu.setBusy(false);
      menu.setError(describeJoinError(err));
    }
  }
}
