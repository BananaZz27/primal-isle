import { Predict } from "@colyseus/sdk/predict";
import { stepPlayer, type WorldMap } from "@primal/shared";
import type { MoveInput, Player } from "@primal/server/schema";
import type { MoveDir } from "../input/joystick";
import type { WorldRoom } from "./connection";
import { clampSteps } from "./frameSteps";

export interface Prediction {
  /** เรียกทุกเฟรม: ส่ง input ตามจำนวน step ที่ถึงเวลา */
  tick(now: number, dir: MoveDir): void;
  /** ตำแหน่งที่ควรวาด — ตัวเรา = ค่าที่ทำนาย, คนอื่น = ค่าที่เกลี่ยแล้ว */
  pos(player: Player): { x: number; y: number };
}

/**
 * ตั้งระบบทำนาย (client-side prediction) ของ Colyseus
 * - ตัวเรา: ขยับทันทีด้วย stepPlayer ตัวเดียวกับเซิร์ฟเวอร์ แล้วแก้ให้ตรงเมื่อผลจริงมาถึง (reconcile)
 * - คนอื่น: เกลี่ยตำแหน่ง (lerp) ระหว่าง snapshot ให้ดูลื่น
 */
export function startPrediction(room: WorldRoom, map: WorldMap): Prediction {
  const predict = Predict.get(room as any);
  predict.attachAll("players", { mode: "lerp", fields: ["x", "y"], smoothMs: 65 });

  const input = room.input<MoveInput>({ mode: "reliable" });
  const self = room.state.players.get(room.sessionId)!;

  predict.reconciler(self, {
    input,
    fields: ["x", "y", "vx", "vy"],
    step: (ctx, predicted, command) => stepPlayer(predicted, command, ctx.dt, map),
  });

  return {
    tick(now, dir) {
      const steps = clampSteps(predict.tick(now));
      for (let i = 0; i < steps; i++) {
        input.data.moveX = dir.moveX;
        input.data.moveY = dir.moveY;
        input.send();
      }
    },
    pos(player) {
      return { x: predict.value(player, "x"), y: predict.value(player, "y") };
    },
  };
}
