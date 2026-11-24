import { describe, it, expect } from "vitest";
import { DecorKind, TILE_SIZE } from "@primal/shared";
import { describeTarget, type LabelWorld } from "../src/ui/targetLabel";

const T = TILE_SIZE;
const me = { x: 5 * T + 8, y: 5 * T + 8 };
const world: LabelWorld = {
  decor: [
    { kind: DecorKind.Tree, tx: 6, ty: 5, variant: 0 },
    { kind: DecorKind.Pebble, tx: 4, ty: 5, variant: 0 },
    { kind: DecorKind.Bush, tx: 5, ty: 6, variant: 0 },
    { kind: DecorKind.Tuft, tx: 5, ty: 4, variant: 0 },
  ],
  drops: [{ key: "b", tx: 7, ty: 7 }],
  crates: [{ key: "c", tx: 3, ty: 3 }],
  chests: [{ key: "s", tx: 8, ty: 8 }],
  dinos: [{ key: "d", kind: "raptor", x: 100, y: 120, owner: "" }],
  campfires: [{ tx: 9, ty: 9 }],
};

describe("label over what ✋ will act on", () => {
  it("resources say what they are and what you get", () => {
    expect(describeTarget({ kind: "node", id: 0 }, world, me)?.text).toBe("ต้นไม้ → ไม้");
    expect(describeTarget({ kind: "node", id: 1 }, world, me)?.text).toBe("ก้อนหิน → หิน");
    expect(describeTarget({ kind: "node", id: 2 }, world, me)?.text).toBe("พุ่มผลไม้ → ผลไม้");
    expect(describeTarget({ kind: "node", id: 3 }, world, me)?.text).toBe("กอหญ้า → เส้นใย");
  });

  it("sits above the thing — above the whole tree, which is two tiles tall", () => {
    const tree = describeTarget({ kind: "node", id: 0 }, world, me)!;
    expect(tree.x).toBe(6 * T + 8);
    expect(tree.y).toBeLessThan(5 * T - T + 1); // เหนือยอดไม้ (ภาพสูง 2 ช่อง)
    const rock = describeTarget({ kind: "node", id: 1 }, world, me)!;
    expect(rock.y).toBeLessThanOrEqual(5 * T);
    expect(rock.y).toBeGreaterThan(5 * T - T);
  });

  it("bags, crates, chests, dinos, campfire and water", () => {
    expect(describeTarget({ kind: "drop", key: "b" }, world, me)).toMatchObject({ text: "🎒 ถุงของ → เก็บคืน", x: 7 * T + 8 });
    expect(describeTarget({ kind: "crate", key: "c" }, world, me)).toMatchObject({ text: "📦 กล่องเสบียง → เปิด", x: 3 * T + 8 });
    expect(describeTarget({ kind: "chest", key: "s" }, world, me)).toMatchObject({ text: "กล่องเก็บของ → เปิด", x: 8 * T + 8 });
    const dino = describeTarget({ kind: "dino", key: "d" }, world, me)!;
    expect(dino.text).toBe("ยูทาห์แร็พเตอร์ → ตี");
    expect([dino.x, dino.y < 120]).toEqual([100, true]);
    expect(describeTarget({ kind: "campfire" }, world, me)?.text).toBe("🔥 กองไฟ → ย่าง");
    const water = describeTarget({ kind: "water" }, world, me)!;
    expect(water.text).toBe("💧 ดื่มน้ำ");
    expect(water.x).toBe(me.x); // น้ำไม่มีจุดเดียว → ขึ้นเหนือหัวตัวเอง
  });

  it("nothing to do, or the thing vanished → no label", () => {
    expect(describeTarget(null, world, me)).toBeNull();
    expect(describeTarget({ kind: "crate", key: "gone" }, world, me)).toBeNull();
    expect(describeTarget({ kind: "node", id: 99 }, world, me)).toBeNull();
  });
});

describe("names are complete", () => {
  it("every resource and every dino in balance.json has a Thai name", async () => {
    const { BALANCE } = await import("@primal/shared");
    const { NODE_LABELS, DINO_LABELS } = await import("../src/ui/labels");
    for (const k of Object.keys(BALANCE.nodes)) expect(NODE_LABELS[k], k).toBeTruthy();
    for (const k of Object.keys(BALANCE.dinos)) expect(DINO_LABELS[k], k).toBeTruthy();
  });
});

describe("label never covers your own name", () => {
  it("a target right beside or above you lifts the label above your name", async () => {
    const { PLAYER_NAME_Y } = await import("../src/render/labelLayout");
    const nameTop = me.y + PLAYER_NAME_Y - 9; // ป้ายชื่อสูงราว 9px
    for (const target of [{ kind: "node", id: 3 }, { kind: "node", id: 1 }, { kind: "water" }] as const) {
      const spot = describeTarget(target, world, me)!;
      expect(spot.y, target.kind).toBeLessThanOrEqual(nameTop);
    }
  });

  it("targets further away keep their own spot", () => {
    const far = { x: me.x, y: me.y + 3 * T };
    const tuft = describeTarget({ kind: "node", id: 3 }, world, far)!;
    expect(tuft.y).toBe(4 * T - 2);
  });
});
