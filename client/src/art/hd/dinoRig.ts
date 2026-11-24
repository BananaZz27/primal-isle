import { PixelCanvas, rng, type Ramp } from "./canvas";

/**
 * "โครง" สำหรับวาดไดโนทุกชนิดด้วยโค้ดชุดเดียว (หันขวา มองด้านข้าง แสงซ้ายบน)
 * แต่ละชนิดเป็นแค่ข้อมูล DinoSpec (ขนาดลำตัว หาง คอ หัว ขา + ลักษณะเด่น) — ดู species.ts
 * ลำดับวาด: ขาข้างไกล → หาง → ลำตัว → ของบนหลัง → คอ/หัว → ขาข้างใกล้ → รายละเอียด → เส้นขอบ
 */

export type Pt = [number, number];

export interface Palette {
  skin: Ramp;
  belly: Ramp;
  /** สีลักษณะเด่น (ขน แผ่นหลัง เขา ครีบ หงอน) */
  accent: Ramp;
  /** สีลาย (แถบ/จุด) */
  mark?: string;
}

/** ขาหลัง: hip = ข้อสะโพก, ขาวางบนพื้นที่ groundY */
export interface HindLeg {
  hip: Pt;
  thigh: number; // รัศมีโคนขา
  /** digitigrade = เดินบนนิ้ว (เทอโรพอด/ปากเป็ด) · column = ขาเสาแบบช้าง (ซอโรพอด/สเตโก/แองคิโล/ไทรเซอรา) */
  style: "digitigrade" | "column";
  width: number; // ความหนาแข้ง
  /** นิ้วที่ 2 ยกขึ้นมีเล็บเคียว (ไดโนวงศ์แร็พเตอร์) */
  sickle?: boolean;
}

export interface Arms {
  shoulder: Pt;
  length: number;
  width: number;
  /** ขนปีกที่แขน (ไดโนมีขน) */
  wing?: boolean;
  fingers: 2 | 3;
}

export interface FrontLeg {
  shoulder: Pt;
  width: number;
}

export type Feature =
  | { kind: "plates"; from: number; to: number; height: number } // สเตโก: แผ่นสลับ 2 แถว (x ตามแนวหลัง)
  | { kind: "thagomizer" } // หนามหาง 4 อัน
  | { kind: "osteoderms" } // ปุ่มเกราะ (แองคิโล)
  | { kind: "club" } // ตะบองหาง
  | { kind: "sail"; from: number; to: number; height: number } // ใบเรือบนหลัง (สไปโน)
  | { kind: "tailFin"; height: number } // ครีบหางสูง (สไปโน)
  | { kind: "feathers" } // ขนคลุมตัว ขอบฟู
  | { kind: "fuzz" } // ขนอ่อนบางๆ
  | { kind: "stripes"; count: number };

export type HeadKind =
  | "theropod" // หัวเทอโรพอดทั่วไป ปากปิดมีริมฝีปาก
  | "tyrant" // หัวลึกใหญ่ (ทีเร็กซ์)
  | "croc" // ปากยาวแบบจระเข้ (สไปโน)
  | "crested" // หงอนคู่บาง (ไดโลโฟ)
  | "beak" // ปากนก ไม่มีฟัน (แกลลิไมมัส)
  | "duckbill" // ปากเป็ด + หงอนท่อชี้หลัง (พาราซอโรโลฟัส)
  | "ceratops" // แผงคอ + เขา 3 (ไทรเซอราทอปส์)
  | "small" // หัวเล็กต่ำ (สเตโก)
  | "armored" // หัวแบนกว้างมีเขามุม (แองคิโล)
  | "dome" // กะโหลกโดมมีปุ่ม (แพคิ)
  | "sauropod"; // หัวเล็กมีโหนกจมูก (แบรคิโอ)

export interface DinoSpec {
  width: number;
  height: number;
  groundY: number;
  palette: Palette;
  body: { c: Pt; rx: number; ry: number };
  /** ก้อนลำตัวเพิ่ม (ไหล่สูงของแบรคิโอ สะโพกสูงของสเตโก) */
  humps?: { c: Pt; rx: number; ry: number }[];
  /** หาง: จากโคน (ติดสะโพก) → ปลาย · sag = โค้งลง (+) / ขึ้น (−) ตรงกลาง */
  tail: { from: Pt; to: Pt; r: number; sag: number; tip?: number };
  /** คอ: จากโคน → ใต้หัว */
  neck: { from: Pt; to: Pt; r0: number; r1: number; bend?: number };
  head: { kind: HeadKind; c: Pt; size: number };
  hind: HindLeg;
  front?: FrontLeg;
  arms?: Arms;
  features: Feature[];
  seed: number;
}

/** จุดบนเส้นโค้ง quadratic จาก a → b ที่ยกกลางเส้นขึ้น/ลง bend พิกเซล */
function curve(a: Pt, b: Pt, bend: number, t: number): Pt {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2 + bend;
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1]];
}

/** ส่วนเรียวยาว (หาง คอ) = ลูกกลมเรียงตามเส้นโค้ง */
function tube(c: PixelCanvas, a: Pt, b: Pt, r0: number, r1: number, bend: number, ramp: Ramp, lift = 0): void {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.2) + 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = curve(a, b, bend, t);
    const r = r0 + (r1 - r0) * t;
    c.sphere(x, y, Math.max(0.8, r), Math.max(0.8, r * 0.92), ramp, lift);
  }
}

/** แท่งเรียว (แขน แข้ง) จาก a → b หนา w0 → w1 · ขอบบน/ซ้ายสว่างกว่า */
function limb(c: PixelCanvas, a: Pt, b: Pt, w0: number, w1: number, ramp: Ramp, light: number): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  c.polygon(
    [
      [a[0] + (nx * w0) / 2, a[1] + (ny * w0) / 2],
      [b[0] + (nx * w1) / 2, b[1] + (ny * w1) / 2],
      [b[0] - (nx * w1) / 2, b[1] - (ny * w1) / 2],
      [a[0] - (nx * w0) / 2, a[1] - (ny * w0) / 2],
    ],
    ramp,
    light,
  );
  // แสงขอบซ้าย
  c.line(a[0] - (nx * w0) / 2 + 0.5, a[1] - (ny * w0) / 2, b[0] - (nx * w1) / 2 + 0.5, b[1] - (ny * w1) / 2, ramp[Math.min(ramp.length - 1, Math.round(light * (ramp.length - 1)) + 1)]);
}

/** ขาหลัง · stride = เท้าเลื่อนหน้า(+)/หลัง(−) · near = ข้างใกล้ (สว่าง) */
function drawHind(c: PixelCanvas, s: DinoSpec, stride: number, near: boolean): void {
  const R = s.palette.skin;
  const L = near ? 0.55 : 0.3;
  const lift = near ? 0 : -0.18;
  const [hx, hy] = near ? s.hind.hip : [s.hind.hip[0] + 2, s.hind.hip[1] - 1];
  const g = s.groundY;
  if (s.hind.style === "column") {
    c.sphere(hx, hy, s.hind.thigh, s.hind.thigh * 1.1, R, lift);
    const foot: Pt = [hx + stride * 0.6, g - 1];
    limb(c, [hx, hy + s.hind.thigh * 0.5], foot, s.hind.width * 1.1, s.hind.width, R, L);
    c.sphere(foot[0], g - 1.5, s.hind.width * 0.62, 1.8, R, lift - 0.05); // ฝ่าเท้า
    for (let i = -1; i <= 1; i++) c.set(foot[0] + i * 2 + 1, g - 1, "#d9cfbf"); // เล็บ
    return;
  }
  // เดินบนนิ้ว: สะโพก → เข่า (ไปหน้า) → ข้อเท้า (ไปหลัง) → นิ้วเท้า
  c.sphere(hx, hy, s.hind.thigh, s.hind.thigh * 1.15, R, lift);
  const legLen = g - hy;
  const knee: Pt = [hx + legLen * 0.18 + stride * 0.3, hy + legLen * 0.42];
  const ankle: Pt = [hx - legLen * 0.08 + stride * 0.8, g - legLen * 0.22];
  const toe: Pt = [hx + legLen * 0.1 + stride, g - 0.5];
  limb(c, [hx, hy + s.hind.thigh * 0.4], knee, s.hind.width * 1.3, s.hind.width, R, L);
  limb(c, knee, ankle, s.hind.width, s.hind.width * 0.75, R, L - 0.05);
  limb(c, ankle, toe, s.hind.width * 0.7, s.hind.width * 0.55, R, L - 0.1);
  // นิ้วเท้า 3 นิ้วชี้หน้า
  c.line(toe[0], g - 1, toe[0] + s.hind.width * 1.4, g - 1, R[1]);
  c.set(toe[0] + s.hind.width * 1.4 + 1, g - 1, "#2a2018");
  if (s.hind.sickle) {
    // นิ้วที่ 2 ยกพ้นพื้น เล็บเคียวโค้ง
    const sx = toe[0] + 1;
    c.set(sx, g - 3, R[1]);
    c.set(sx + 1, g - 4, "#e8dcc6");
    c.set(sx + 2, g - 4, "#e8dcc6");
    c.set(sx + 3, g - 3, "#cfc2aa");
  }
}

function drawFront(c: PixelCanvas, s: DinoSpec, stride: number, near: boolean): void {
  if (!s.front) return;
  const R = s.palette.skin;
  const [sx, sy] = near ? s.front.shoulder : [s.front.shoulder[0] + 2, s.front.shoulder[1] - 1];
  const foot: Pt = [sx + stride * 0.6, s.groundY - 1];
  c.sphere(sx, sy, s.front.width * 0.8, s.front.width, R, near ? 0 : -0.18);
  limb(c, [sx, sy], foot, s.front.width, s.front.width * 0.85, R, near ? 0.5 : 0.28);
  c.sphere(foot[0], s.groundY - 1.5, s.front.width * 0.55, 1.6, R, near ? -0.05 : -0.22);
}

function drawArms(c: PixelCanvas, s: DinoSpec, near: boolean): void {
  if (!s.arms) return;
  const a = s.arms;
  const R = s.palette.skin;
  const [x0, y0] = near ? a.shoulder : [a.shoulder[0] - 1, a.shoulder[1] - 1];
  const elbow: Pt = [x0 + a.length * 0.25, y0 + a.length * 0.55];
  const wrist: Pt = [x0 + a.length * 0.7, y0 + a.length * 0.75];
  if (a.wing) {
    // ขนปีกห้อยจากแขนและมือ (ไดโนวงศ์แร็พเตอร์)
    c.polygon([[x0 - 1, y0 + 1], [wrist[0] + 1, wrist[1]], [wrist[0] - 2, wrist[1] + a.length * 0.55], [x0 - 3, y0 + a.length * 0.6]], s.palette.accent, near ? 0.45 : 0.25);
    for (let i = 0; i < 4; i++) c.line(x0 - 2 + i * 2, y0 + a.length * 0.35, x0 - 3 + i * 2.2, y0 + a.length * 0.6, s.palette.accent[0]);
  }
  limb(c, [x0, y0], elbow, a.width, a.width * 0.85, R, near ? 0.5 : 0.3);
  limb(c, elbow, wrist, a.width * 0.85, a.width * 0.7, R, near ? 0.48 : 0.28);
  // มือหันฝ่าเข้าหาตัว: เห็นจากด้านข้างเป็นนิ้วงอลงด้านหน้า
  for (let f = 0; f < a.fingers; f++) {
    const fx = wrist[0] + 1 + f * 0.8;
    c.line(fx, wrist[1], fx + 1, wrist[1] + 2 + (f === 0 ? 1 : 0), R[1]);
    c.set(fx + 1, wrist[1] + 3 + (f === 0 ? 1 : 0), "#2a2018");
  }
}

/** หัวแต่ละแบบ (c = กลางกะโหลก, size = ขนาดอ้างอิง) — ปากเทอโรพอดปิดด้วยริมฝีปาก ไม่โชว์ฟัน */
function drawHead(c: PixelCanvas, s: DinoSpec): void {
  const { kind, c: [x, y], size: z } = s.head;
  const R = s.palette.skin;
  const A = s.palette.accent;
  const eye = (ex: number, ey: number) => {
    c.set(ex, ey, "#120e0a");
    c.set(ex + 1, ey, "#120e0a");
    c.set(ex, ey - 1, "#f3e7c4");
  };
  const mouth = (x0: number, x1: number, my: number) => c.line(x0, my, x1, my, R[0]);
  switch (kind) {
    case "theropod":
    case "crested":
      c.sphere(x, y, z, z * 0.72, R, 0.05);
      c.sphere(x + z * 0.9, y + z * 0.15, z * 0.75, z * 0.48, R, 0.02);
      mouth(x - z * 0.4, x + z * 1.55, y + z * 0.5);
      eye(Math.round(x + z * 0.1), Math.round(y - z * 0.2));
      if (kind === "crested") {
        // หงอนคู่บางๆ เป็นครึ่งวงรีตามแนวจมูกถึงหัว (ไดโลโฟซอรัส)
        for (let i = 0; i < 2; i++) c.sphere(x + z * 0.4 + i, y - z * 0.75, z * 0.9, z * 0.45, A, 0.1 - i * 0.2);
        c.sphere(x + z * 0.4, y - z * 0.3, z * 1.0, z * 0.25, R, 0.05);
      }
      break;
    case "tyrant":
      c.sphere(x, y, z, z * 0.8, R, 0.05);
      c.sphere(x + z * 0.85, y + z * 0.2, z * 0.85, z * 0.6, R, 0);
      c.sphere(x + z * 0.2, y + z * 0.55, z * 0.95, z * 0.35, R, -0.12); // ขากรรไกรล่างหนา
      mouth(x - z * 0.5, x + z * 1.6, y + z * 0.55);
      c.line(x - z * 0.3, y - z * 0.45, x + z * 0.3, y - z * 0.55, R[1]); // คิ้วหนา
      eye(Math.round(x + z * 0.05), Math.round(y - z * 0.25));
      break;
    case "croc":
      c.sphere(x, y, z * 0.85, z * 0.6, R, 0.05);
      // ปากยาวแคบ ปลายบานเล็กน้อย
      c.polygon([[x, y - z * 0.25], [x + z * 3, y + z * 0.05], [x + z * 3.2, y + z * 0.45], [x, y + z * 0.55]], R, 0.55);
      c.sphere(x + z * 3, y + z * 0.25, z * 0.35, z * 0.3, R, 0);
      mouth(x - z * 0.3, x + z * 3.1, y + z * 0.35);
      eye(Math.round(x - z * 0.05), Math.round(y - z * 0.2));
      c.set(x + z * 1.2, y - z * 0.1, R[1]); // รูจมูกอยู่ค่อนไปทางตา
      break;
    case "beak":
      c.sphere(x, y, z * 0.8, z * 0.6, R, 0.08);
      c.polygon([[x + z * 0.4, y - z * 0.25], [x + z * 2, y + z * 0.15], [x + z * 0.4, y + z * 0.45]], ["#3a3530", "#6a6158", "#968a7a"], 0.5);
      eye(Math.round(x - z * 0.05), Math.round(y - z * 0.2));
      break;
    case "duckbill":
      c.sphere(x, y, z * 0.85, z * 0.65, R, 0.05);
      c.sphere(x + z * 1.2, y + z * 0.3, z * 0.9, z * 0.42, R, 0.02);
      c.sphere(x + z * 1.9, y + z * 0.35, z * 0.4, z * 0.35, ["#4a4038", "#7a6a5a", "#a89784"], 0.1); // จะงอยปากเป็ด
      // หงอนท่อยาวชี้ไปด้านหลัง (พาราซอโรโลฟัส)
      tube(c, [x, y - z * 0.5], [x - z * 2.6, y - z * 1.3], z * 0.32, z * 0.26, -z * 0.2, A, 0.05);
      eye(Math.round(x + z * 0.1), Math.round(y - z * 0.15));
      break;
    case "ceratops": {
      // แผงคอใหญ่ด้านหลังหัว
      c.sphere(x - z * 0.8, y - z * 0.5, z * 1.25, z * 1.5, A, 0);
      for (let i = 0; i < 7; i++) {
        const t = (i / 6) * Math.PI - Math.PI / 2;
        c.set(x - z * 0.8 + Math.cos(t) * z * -1.3, y - z * 0.5 + Math.sin(t) * z * 1.55, A[0]);
      }
      c.sphere(x + z * 0.3, y + z * 0.2, z, z * 0.75, R, 0.05);
      c.polygon([[x + z * 0.9, y - z * 0.1], [x + z * 1.9, y + z * 0.45], [x + z * 0.9, y + z * 0.85]], ["#3a3530", "#6a6158", "#968a7a"], 0.45); // จะงอยปาก
      // เขาคิ้ว 2 อันยาว ชี้หน้าขึ้น + เขาจมูกสั้น
      for (const dx of [0, -1]) limb(c, [x + z * 0.2 + dx, y - z * 0.45], [x + z * 2.1 + dx, y - z * 1.35], z * 0.35, 1, ["#6a5e4c", "#a8987c", "#e3d6b8"], dx === 0 ? 0.7 : 0.4);
      limb(c, [x + z * 1.1, y - z * 0.1], [x + z * 1.5, y - z * 0.7], z * 0.3, 1, ["#6a5e4c", "#a8987c", "#e3d6b8"], 0.6);
      eye(Math.round(x + z * 0.25), Math.round(y - z * 0.15));
      break;
    }
    case "small":
      c.sphere(x, y, z, z * 0.6, R, 0.05);
      c.polygon([[x + z * 0.7, y - z * 0.2], [x + z * 1.5, y + z * 0.25], [x + z * 0.6, y + z * 0.5]], ["#3a3530", "#6a6158", "#968a7a"], 0.45);
      eye(Math.round(x + z * 0.1), Math.round(y - z * 0.15));
      break;
    case "armored":
      c.sphere(x, y, z * 1.1, z * 0.65, R, 0.05);
      c.polygon([[x + z * 0.8, y - z * 0.15], [x + z * 1.5, y + z * 0.2], [x + z * 0.8, y + z * 0.5]], ["#3a3530", "#6a6158", "#968a7a"], 0.45);
      // เขาที่มุมหลังกะโหลก (บน/ล่าง)
      limb(c, [x - z * 0.6, y - z * 0.4], [x - z * 1.3, y - z * 0.75], z * 0.4, 1, A, 0.6);
      limb(c, [x - z * 0.5, y + z * 0.3], [x - z * 1.2, y + z * 0.65], z * 0.4, 1, A, 0.4);
      eye(Math.round(x + z * 0.15), Math.round(y - z * 0.1));
      break;
    case "dome": {
      c.sphere(x + z * 0.6, y + z * 0.3, z * 0.75, z * 0.5, R, 0.02); // หน้า + ปาก
      c.sphere(x, y - z * 0.25, z, z * 0.85, A, 0.08); // โดมกะโหลกหนา
      // ปุ่มกระดูกรอบโดม
      for (let i = 0; i < 8; i++) {
        const t = Math.PI * (0.55 + (i / 7) * 0.9);
        c.set(x + Math.cos(t) * z * 1.05, y - z * 0.25 + Math.sin(t) * z * 0.5 + z * 0.4, A[0]);
      }
      c.polygon([[x + z * 1.1, y + z * 0.05], [x + z * 1.6, y + z * 0.4], [x + z * 1.05, y + z * 0.65]], ["#3a3530", "#6a6158", "#968a7a"], 0.45);
      eye(Math.round(x + z * 0.45), Math.round(y + z * 0.05));
      break;
    }
    case "sauropod":
      c.sphere(x, y, z * 0.9, z * 0.6, R, 0.05);
      c.sphere(x + z * 0.8, y + z * 0.2, z * 0.6, z * 0.4, R, 0.02);
      c.sphere(x + z * 0.2, y - z * 0.5, z * 0.55, z * 0.45, R, 0.12); // โหนกจมูกเหนือตา
      mouth(x + z * 0.2, x + z * 1.3, y + z * 0.45);
      eye(Math.round(x - z * 0.2), Math.round(y - z * 0.1));
      break;
  }
}

/** ของที่อยู่ "หลัง" ลำตัว (ใบเรือ แผ่นแถวไกล) */
function drawBackFeatures(c: PixelCanvas, s: DinoSpec, r: () => number): void {
  const A = s.palette.accent;
  const top = (x: number) => {
    const { c: [bx, by], rx, ry } = s.body;
    const nx = (x - bx) / rx;
    return Math.abs(nx) >= 1 ? by : by - ry * Math.sqrt(1 - nx * nx);
  };
  for (const f of s.features) {
    if (f.kind === "sail") {
      for (let x = f.from; x <= f.to; x++) {
        const t = (x - f.from) / (f.to - f.from);
        const h = f.height * Math.sin(t * Math.PI) ** 0.7;
        for (let y = top(x) - h; y < top(x) + 1; y++) c.set(x, y, A[Math.min(A.length - 1, 1 + Math.round(((y - top(x) + h) / (h + 1)) * 2))]);
        if (x % 3 === 0) c.line(x, top(x) - h + 1, x, top(x), A[0]); // ก้านกระดูก
      }
    }
    if (f.kind === "plates") {
      // แถวไกล (มืดกว่า) — แผ่นรูปว่าวสลับกับแถวใกล้
      for (let x = f.from + 3; x <= f.to; x += 8) plate(c, x, top(x) + 1, f.height * plateScale(x, f) * 0.85, A, 0.25);
    }
  }
  void r;
}

const plateScale = (x: number, f: { from: number; to: number }) => 0.5 + 0.5 * Math.sin(((x - f.from) / (f.to - f.from)) * Math.PI);

function plate(c: PixelCanvas, x: number, base: number, h: number, ramp: Ramp, light: number): void {
  const w = h * 0.55;
  c.polygon([[x - w / 2, base], [x - w * 0.15, base - h], [x + w * 0.3, base - h * 0.8], [x + w / 2, base]], ramp, light);
}

/** ของที่อยู่ "หน้า" ลำตัว (แผ่นแถวใกล้ เกราะ ลาย ขน) */
function drawFrontFeatures(c: PixelCanvas, s: DinoSpec, r: () => number): void {
  const A = s.palette.accent;
  const { c: [bx, by], rx, ry } = s.body;
  const top = (x: number) => {
    const nx = (x - bx) / rx;
    return Math.abs(nx) >= 1 ? by : by - ry * Math.sqrt(1 - nx * nx);
  };
  for (const f of s.features) {
    switch (f.kind) {
      case "plates":
        for (let x = f.from; x <= f.to; x += 8) plate(c, x, top(x) + 2, f.height * plateScale(x, f), A, 0.6);
        break;
      case "thagomizer": {
        // หนามหาง 4 อัน (2 คู่) ใกล้ปลายหาง ชี้ขึ้นและไปด้านหลัง
        const [tx, ty] = s.tail.to;
        for (let i = 0; i < 2; i++) {
          const bx2 = tx + 4 + i * 5;
          limb(c, [bx2, ty - 1], [bx2 - 6, ty - 9 + i], 2.2, 0.6, ["#6a5e4c", "#a8987c", "#e3d6b8"], 0.6);
          limb(c, [bx2 + 1, ty], [bx2 - 4, ty - 6 + i], 2, 0.6, ["#6a5e4c", "#a8987c", "#e3d6b8"], 0.35);
        }
        break;
      }
      case "osteoderms":
        // ปุ่มเกราะเรียงเป็นแถวบนหลัง + หนามข้างลำตัว
        for (let row = 0; row < 3; row++)
          for (let x = bx - rx + 4 + row * 2; x < bx + rx - 3; x += 5) {
            const y = top(x) + 2 + row * 4;
            c.sphere(x, y, 1.6, 1.3, A, 0.1 - row * 0.05);
          }
        for (let x = bx - rx + 6; x < bx + rx - 4; x += 6) limb(c, [x, by + ry * 0.35], [x - 2, by + ry * 0.35 + 4], 2.2, 0.6, A, 0.5);
        break;
      case "club": {
        const [tx, ty] = s.tail.to;
        // ตะบองกระดูก 2 ก้อนใหญ่ที่ปลายหาง
        c.sphere(tx - 1, ty, 6.5, 4.8, A, 0.05);
        c.sphere(tx - 4, ty - 0.5, 4, 3.6, A, 0.12);
        c.sphere(tx + 1.5, ty + 0.5, 3.6, 3.2, A, -0.05);
        break;
      }
      case "tailFin": {
        // หางสูงแบบใบพาย: ก้านสูงบน-ล่างตามความยาวหาง
        const steps = 40;
        for (let i = 4; i < steps; i++) {
          const t = i / steps;
          const [x, y] = curve(s.tail.from, s.tail.to, s.tail.sag, t);
          const h = f.height * Math.sin(t * Math.PI) * (1 - t * 0.3);
          c.line(x, y - h, x, y - s.tail.r * (1 - t), A[1 + (i % 2)]);
          c.line(x, y + s.tail.r * 0.6 * (1 - t), x, y + h * 0.45, A[1]);
        }
        break;
      }
      case "stripes":
        for (let i = 0; i < f.count; i++) {
          const t = 0.15 + (i / f.count) * 0.8;
          const [x, y] = curve(s.tail.from, s.tail.to, s.tail.sag, t);
          const r0 = s.tail.r * (1 - t) + (s.tail.tip ?? 1) * t;
          c.line(x, y - r0, x + 1, y - r0 * 0.2, s.palette.mark ?? s.palette.skin[0]);
        }
        for (let x = bx - rx * 0.6; x < bx + rx * 0.5; x += 5) c.line(x, top(x) + 1, x + 1.5, top(x) + ry * 0.6, s.palette.mark ?? s.palette.skin[0]);
        break;
      case "feathers":
      case "fuzz": {
        // ขอบฟู: แต้มพิกเซลยื่นออกจากแนวหลัง/หาง/คอ + ลายขนบนตัว
        const ramp = f.kind === "feathers" ? s.palette.accent : s.palette.skin;
        const n = f.kind === "feathers" ? 140 : 50;
        for (let i = 0; i < n; i++) {
          const x = Math.floor(r() * c.width);
          const y = Math.floor(r() * (s.groundY - 6));
          if (c.alpha(x, y) > 0 || c.alpha(x, y + 1) < 255) continue;
          c.set(x, y, ramp[1 + Math.floor(r() * 2)]);
        }
        if (f.kind === "feathers")
          for (let i = 0; i < 60; i++) {
            const x = Math.floor(r() * c.width);
            const y = Math.floor(r() * (s.groundY - 8));
            if (c.alpha(x, y) < 255 || c.alpha(x + 1, y) < 255) continue;
            c.line(x, y, x + 1, y + 1, ramp[r() < 0.5 ? 0 : 3]);
          }
        break;
      }
      default:
        break;
    }
  }
}

/** วาดไดโนตาม spec · frame 0/1 = ท่าเดิน (สลับขา) */
export function drawDino(s: DinoSpec, frame: 0 | 1): PixelCanvas {
  const c = new PixelCanvas(s.width, s.height);
  const r = rng(s.seed);
  const stride = (frame === 0 ? 1 : -1) * Math.max(2, s.width / 28);
  c.shadow(s.body.c[0], s.groundY, s.body.rx * 1.15, Math.max(2, s.width / 32));

  // ขาข้างไกล
  drawFront(c, s, stride, false);
  drawHind(c, s, -stride, false);
  drawArms(c, s, false);
  // หาง ใบเรือ/แผ่นแถวไกล ลำตัว
  drawBackFeatures(c, s, r);
  tube(c, s.tail.from, s.tail.to, s.tail.r, s.tail.tip ?? 1, s.tail.sag, s.palette.skin);
  for (const h of s.humps ?? []) c.sphere(h.c[0], h.c[1], h.rx, h.ry, s.palette.skin);
  c.sphere(s.body.c[0], s.body.c[1], s.body.rx, s.body.ry, s.palette.skin);
  // ท้องสีอ่อน (แถบล่างของลำตัว)
  c.sphere(s.body.c[0] + s.body.rx * 0.1, s.body.c[1] + s.body.ry * 0.62, s.body.rx * 0.7, s.body.ry * 0.32, s.palette.belly, -0.1);
  // คอ หัว
  tube(c, s.neck.from, s.neck.to, s.neck.r0, s.neck.r1, s.neck.bend ?? 0, s.palette.skin, 0.03);
  drawHead(c, s);
  // ขาข้างใกล้ แขน
  drawHind(c, s, stride, true);
  drawFront(c, s, -stride, true);
  drawArms(c, s, true);
  drawFrontFeatures(c, s, r);
  c.outline(0.38);
  return c;
}
