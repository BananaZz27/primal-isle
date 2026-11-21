import { el, uiRoot } from "../ui/dom";
import { quantizeStick, type MoveDir } from "./joystick";

/** รัศมีวง joystick (px บนจอ) */
const RADIUS = 56;

/**
 * Joystick ลอย (floating) สำหรับจอสัมผัส: แตะตรงไหนในครึ่งจอซ้าย วงจะเกิดตรงนั้น แล้วลากเพื่อเดิน
 * ทำเป็น HTML ทับเกม จึงไม่โดนกล้องซูมของเกมกระทบ
 */
export class TouchJoystick {
  private dir: MoveDir = { moveX: 0, moveY: 0 };
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private readonly zone = el("div", { className: "panel joystick-zone" });
  private readonly base = el("div", { className: "joystick-base" });
  private readonly knob = el("div", { className: "joystick-knob" });

  constructor() {
    this.base.append(this.knob);
    this.zone.append(this.base);
    this.base.hidden = true;

    this.zone.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    uiRoot().append(this.zone);
  }

  /** แสดงเฉพาะอุปกรณ์ที่ใช้นิ้วเป็นหลัก */
  static wanted(): boolean {
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  }

  read(): MoveDir {
    return this.dir;
  }

  destroy(): void {
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    this.zone.remove();
  }

  private onDown = (e: PointerEvent) => {
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.base.style.left = `${e.clientX - RADIUS}px`;
    this.base.style.top = `${e.clientY - RADIUS}px`;
    this.base.hidden = false;
    this.setKnob(0, 0);
    e.preventDefault();
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.originX;
    const dy = e.clientY - this.originY;
    this.dir = quantizeStick(dx, dy, RADIUS);
    // ปุ่มกลางเลื่อนตามนิ้ว แต่ไม่เกินขอบวง
    const len = Math.hypot(dx, dy);
    const k = len > RADIUS ? RADIUS / len : 1;
    this.setKnob(dx * k, dy * k);
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.dir = { moveX: 0, moveY: 0 };
    this.base.hidden = true;
  };

  private setKnob(x: number, y: number) {
    this.knob.style.transform = `translate(${x}px, ${y}px)`;
  }
}
