import { describe, it, expect } from "vitest";
import { RepeatGate } from "../src/input/repeatGate";

const GAP = 380;

describe("RepeatGate", () => {
  it("fires at once on the first press, then every GAP while held", () => {
    const g = new RepeatGate(GAP);
    g.press();
    expect(g.update(0, true)).toBe(true);
    expect(g.update(200, true)).toBe(false);
    expect(g.update(380, true)).toBe(true);
  });

  it("a quick re-tap waits for the gap instead of firing too early (and is not lost)", () => {
    const g = new RepeatGate(GAP);
    g.press();
    expect(g.update(0, true)).toBe(true);
    expect(g.update(50, false)).toBe(false); // ปล่อย
    g.press(); // กดใหม่เร็วเกิน
    expect(g.update(100, false)).toBe(false); // ยังไม่ถึงเวลา — ไม่ส่ง (เซิร์ฟเวอร์จะเมินอยู่แล้ว)
    expect(g.update(380, false)).toBe(true); // ถึงเวลา — ส่งให้ แม้ปล่อยนิ้วไปแล้ว
    expect(g.update(800, false)).toBe(false); // ไม่ส่งซ้ำ
  });

  it("a tap shorter than one frame still fires", () => {
    const g = new RepeatGate(GAP);
    g.press(); // กดแล้วปล่อยก่อนเฟรมถัดไป
    expect(g.update(16, false)).toBe(true);
  });
});
