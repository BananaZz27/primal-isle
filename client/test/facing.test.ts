import { describe, it, expect } from "vitest";
import { facingFrom, FACING_COLUMN, walkFrames } from "../src/render/facing";

describe("facingFrom", () => {
  it("moving right", () => expect(facingFrom(1.2, 0, "down")).toEqual({ facing: "right", moving: true }));
  it("moving up (screen y grows downwards)", () =>
    expect(facingFrom(0, -1, "down")).toEqual({ facing: "up", moving: true }));
  it("tiny jitter counts as standing and keeps the old facing", () =>
    expect(facingFrom(0.01, 0.01, "left")).toEqual({ facing: "left", moving: false }));
  it("diagonal uses the larger axis", () =>
    expect(facingFrom(-0.8, 0.5, "up")).toEqual({ facing: "left", moving: true }));
  it("perfect diagonal keeps the current axis", () => {
    expect(facingFrom(0.7, 0.7, "up")).toEqual({ facing: "down", moving: true });
    expect(facingFrom(0.7, 0.7, "left")).toEqual({ facing: "right", moving: true });
  });
  it("no movement keeps facing", () => expect(facingFrom(0, 0, "right")).toEqual({ facing: "right", moving: false }));

  it("diagonal walking with floating-point jitter does not flip between axes", () => {
    // การเกลี่ยตำแหน่งทำให้ |dx| กับ |dy| ต่างกันนิดเดียว สลับไปมาทุกเฟรม
    let facing = facingFrom(0.7, -0.7, "down").facing;
    const start = facing;
    for (let i = 0; i < 50; i++) {
      const tiny = i % 2 === 0 ? 1e-13 : -1e-13;
      facing = facingFrom(0.7 + tiny, -0.7, facing).facing;
      expect(facing).toBe(start);
    }
  });

  it("joystick slightly off 45° keeps the current axis until the other axis clearly dominates", () => {
    expect(facingFrom(0.66, 0.74, "right").facing).toBe("right"); // dy ใหญ่กว่านิดเดียว → ยังหันขวา
    expect(facingFrom(0.4, 0.9, "right").facing).toBe("down"); // dy ใหญ่กว่าชัดเจน → เปลี่ยน
    expect(facingFrom(0.74, 0.66, "down").facing).toBe("down");
  });
});

describe("sheet layout", () => {
  it("columns are down, up, left, right", () =>
    expect(FACING_COLUMN).toEqual({ down: 0, up: 1, left: 2, right: 3 }));
  it("walk frames are rows 0–3 of the facing's column (4 columns per row)", () => {
    expect(walkFrames("down")).toEqual([0, 4, 8, 12]);
    expect(walkFrames("right")).toEqual([3, 7, 11, 15]);
  });
});
