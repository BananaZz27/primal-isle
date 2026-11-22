import { describe, it, expect } from "vitest";
import { hurt, newBrain, PLAYER_SPEED, think, type DinoKind, type DinoView } from "../src/index";

const rand = () => 0.5;
const view = (over: Partial<DinoView> = {}): DinoView => ({ players: [], dinos: [], owner: null, ownerFoe: null, ...over });
const brain = (kind: DinoKind, x = 500, y = 500) => newBrain(kind, x, y);
const dir = (i: { moveX: number; moveY: number }) => [Math.sign(i.moveX), Math.sign(i.moveY)];

describe("dino brain", () => {
  it("a compy runs away from a player that comes within 48px", () => {
    const b = brain("compy");
    const out = think(b, view({ players: [{ id: "p", x: 470, y: 500 }] }), 0, rand);
    expect(dir(out)).toEqual([1, 0]);
    expect(out.bite).toBeNull();
    const calm = think(brain("compy"), view({ players: [{ id: "p", x: 400, y: 500 }] }), 0, rand);
    expect(calm.speed).toBeLessThan(80);
  });

  it("a raptor chases a player within 96px and bites when close, on cooldown", () => {
    const b = brain("raptor");
    const chase = think(b, view({ players: [{ id: "p", x: 580, y: 500 }] }), 0, rand);
    expect(dir(chase)).toEqual([1, 0]);
    expect(chase.bite).toBeNull();

    const close = view({ players: [{ id: "p", x: 510, y: 500 }] });
    expect(think(b, close, 100, rand).bite).toEqual({ type: "player", id: "p" });
    expect(think(b, close, 600, rand).bite).toBeNull(); // ยังไม่ครบ 1 วิ
    expect(think(b, close, 1100, rand).bite).toEqual({ type: "player", id: "p" });
  });

  it("a raptor ignores players further than 96px", () => {
    const out = think(brain("raptor"), view({ players: [{ id: "p", x: 610, y: 500 }] }), 0, rand);
    expect(out.bite).toBeNull();
    expect(out.speed).toBeLessThanOrEqual(90);
  });

  it("a raptor gives up and goes home when 160px from home", () => {
    const b = brain("raptor");
    b.x = 670; // ห่างบ้าน 170px
    const out = think(b, view({ players: [{ id: "p", x: 700, y: 500 }] }), 0, rand);
    expect(dir(out)).toEqual([-1, 0]);
  });

  it("a trike ignores players until hurt, then charges for 10s", () => {
    const b = brain("trike");
    const players = [{ id: "p", x: 560, y: 500 }];
    expect(think(b, view({ players }), 0, rand).speed).toBeLessThanOrEqual(50);
    hurt(b, { type: "player", id: "p" }, 0);
    const mad = think(b, view({ players }), 100, rand);
    expect(dir(mad)).toEqual([1, 0]);
    expect(mad.speed).toBe(80);
    expect(think(b, view({ players }), 10_500, rand).speed).toBeLessThanOrEqual(50);
  });

  it("a duckbill flees from whoever hit it", () => {
    const b = brain("duckbill");
    hurt(b, { type: "player", id: "p" }, 0);
    const out = think(b, view({ players: [{ id: "p", x: 480, y: 500 }] }), 100, rand);
    expect(dir(out)).toEqual([1, 0]);
    expect(out.speed).toBe(75);
  });

  describe("tamed", () => {
    it("follows its owner when further than 40px and never bites players", () => {
      const b = brain("raptor");
      b.tamed = true;
      const out = think(b, view({ owner: { x: 600, y: 500 }, players: [{ id: "p", x: 505, y: 500 }] }), 0, rand);
      expect(dir(out)).toEqual([1, 0]);
      expect(out.bite).toBeNull();
      expect(think(b, view({ owner: { x: 520, y: 500 } }), 0, rand).speed).toBe(0);
    });

    it("attacks its owner's foe", () => {
      const b = brain("raptor");
      b.tamed = true;
      const foe = { type: "dino" as const, id: "d9" };
      const out = think(b, view({ owner: { x: 500, y: 500 }, ownerFoe: foe, dinos: [{ id: "d9", x: 515, y: 500, half: 6, tamed: false }] }), 0, rand);
      expect(out.bite).toEqual(foe);
    });

    // review #1: ไดโนที่เทมแล้วห้ามสู้กันเอง (เช่น เพิ่งเทมแร็พเตอร์ตัวที่ 2 ที่เคยกัดเจ้าของ)
    it("never targets another tamed dino, even as the owner's foe", () => {
      const b = brain("raptor");
      b.tamed = true;
      const foe = { type: "dino" as const, id: "pal" };
      b.target = foe;
      const out = think(b, view({ owner: { x: 500, y: 500 }, ownerFoe: foe, dinos: [{ id: "pal", x: 512, y: 500, half: 9, tamed: true }] }), 0, rand);
      expect(out.bite).toBeNull();
    });

    it("tamed dinos follow faster than a player walks; a fleeing compy is slower than a player", () => {
      const b = brain("compy");
      b.tamed = true;
      expect(think(b, view({ owner: { x: 700, y: 500 } }), 0, rand).speed).toBeGreaterThan(PLAYER_SPEED);
      const wild = think(brain("compy"), view({ players: [{ id: "p", x: 480, y: 500 }] }), 0, rand);
      expect(wild.speed).toBeLessThan(PLAYER_SPEED);
    });

    it("waits where it is while the owner is offline", () => {
      const b = brain("compy");
      b.tamed = true;
      expect(think(b, view(), 0, rand).speed).toBe(0);
    });
  });
});
