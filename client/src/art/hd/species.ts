import type { DinoSpec, Palette } from "./dinoRig";

/**
 * ไดโน 12 ชนิด อิงลักษณะจริงตามหลักฐานปัจจุบัน (ดูเหตุผลใน docs/superpowers/specs/2026-11-24-m8-hd-art-design.md)
 * ขนาดบนจอบีบลง (ของจริงต่างกันหลายสิบเท่า) แต่ยังเรียงเล็ก → ใหญ่ตามจริง · 32 texel = 1 ช่อง
 */

const P = (skin: string[], belly: string[], accent: string[], mark?: string): Palette => ({ skin, belly, accent, mark });

export const SPECIES = {
  /** คอมซอกนาทัส: ตัวเล็ก ขายาว 2 นิ้วมือ มีขนอ่อน (ญาติใกล้ชิดมีขน) */
  compy: {
    width: 40, height: 28, groundY: 26, seed: 11,
    palette: P(["#4a3d22", "#6e5c32", "#94804a", "#b9a568", "#d8c88e"], ["#a8987a", "#d6c8a4"], ["#4a3d22", "#6e5c32", "#94804a"]),
    body: { c: [19, 15], rx: 6, ry: 4 },
    tail: { from: [14, 14], to: [4, 11], r: 2.6, tip: 0.7, sag: 1 },
    neck: { from: [23, 13], to: [29, 8], r0: 2, r1: 1.5 },
    head: { kind: "theropod", c: [31, 7], size: 2.6 },
    hind: { hip: [18, 17], thigh: 3, style: "digitigrade", width: 1.6 },
    arms: { shoulder: [23, 16], length: 5, width: 1.2, fingers: 2 },
    features: [{ kind: "fuzz" }],
  },
  /** แพคิเซฟาโลซอรัส: เดิน 2 ขา กะโหลกโดมหนามีปุ่มรอบ */
  pachy: {
    width: 64, height: 44, groundY: 42, seed: 12,
    palette: P(["#3d2e22", "#5e4632", "#806048", "#a57e5e", "#c8a27e"], ["#9c8a70", "#cdbb98"], ["#5a4630", "#86704e", "#b49c74", "#dccaa2"]),
    body: { c: [30, 24], rx: 11, ry: 8 },
    tail: { from: [21, 22], to: [5, 18], r: 5, tip: 1, sag: 2 },
    neck: { from: [38, 20], to: [44, 15], r0: 4, r1: 3.4 },
    head: { kind: "dome", c: [46, 12], size: 5 },
    hind: { hip: [28, 28], thigh: 5, style: "digitigrade", width: 3 },
    arms: { shoulder: [38, 26], length: 6, width: 2, fingers: 3 },
    features: [{ kind: "stripes", count: 4 }],
  },
  /** แกลลิไมมัส: คล้ายนกกระจอกเทศ ขายาว คอยาว ปากนกไม่มีฟัน มีขนและขนปีกที่แขน */
  galli: {
    width: 72, height: 60, groundY: 58, seed: 13,
    palette: P(["#5a4a36", "#7e6a4e", "#a48c68", "#c6ae86", "#e2ceaa"], ["#cfc2a8", "#efe6d2"], ["#6a5a48", "#9a8a72", "#d8ccb4", "#f2ece0"]),
    body: { c: [32, 32], rx: 11, ry: 8 },
    tail: { from: [23, 31], to: [3, 27], r: 5, tip: 1, sag: 1 },
    neck: { from: [40, 28], to: [53, 11], r0: 3.6, r1: 2.2, bend: 3 },
    head: { kind: "beak", c: [54, 9], size: 3.4 },
    hind: { hip: [31, 36], thigh: 5, style: "digitigrade", width: 2.6 },
    arms: { shoulder: [40, 33], length: 9, width: 1.8, fingers: 3, wing: true },
    features: [{ kind: "feathers" }],
  },
  /** ยูทาห์แร็พเตอร์: แร็พเตอร์ตัวใหญ่ที่สุด ขนคลุมตัว ขนปีกที่แขน เล็บเคียวนิ้วที่ 2 หางแข็งตรง */
  raptor: {
    width: 80, height: 52, groundY: 50, seed: 14,
    palette: P(["#3a2618", "#5c3a22", "#7e5030", "#a26a40", "#c48a58"], ["#a89074", "#d4c0a0"], ["#2a1c14", "#4e3424", "#8a6040", "#e8dcc8"], "#24160e"),
    body: { c: [38, 26], rx: 13, ry: 9 },
    tail: { from: [27, 24], to: [5, 19], r: 6, tip: 1.5, sag: -1 },
    neck: { from: [49, 22], to: [57, 15], r0: 5, r1: 4 },
    head: { kind: "theropod", c: [61, 13], size: 5.5 },
    hind: { hip: [36, 30], thigh: 6.5, style: "digitigrade", width: 3.2, sickle: true },
    arms: { shoulder: [48, 27], length: 11, width: 2.4, fingers: 3, wing: true },
    features: [{ kind: "feathers" }, { kind: "stripes", count: 6 }],
  },
  /** ไดโลโฟซอรัส: หงอนคู่บางบนหัว ไม่มีแผงคอ ไม่พ่นพิษ (แบบในหนังไม่มีหลักฐาน) */
  dilo: {
    width: 96, height: 60, groundY: 58, seed: 15,
    palette: P(["#2e3226", "#4a5038", "#68704c", "#8a9264", "#aab282"], ["#a49c80", "#d2c8a8"], ["#5a1a14", "#8e2a1e", "#c4482e", "#e8774e"], "#262a1e"),
    body: { c: [44, 30], rx: 15, ry: 9.5 },
    tail: { from: [31, 28], to: [5, 22], r: 7, tip: 1.4, sag: 1 },
    neck: { from: [57, 26], to: [67, 16], r0: 5.5, r1: 4.3 },
    head: { kind: "crested", c: [71, 14], size: 5.5 },
    hind: { hip: [42, 34], thigh: 7.5, style: "digitigrade", width: 3.6 },
    arms: { shoulder: [56, 32], length: 10, width: 2.4, fingers: 3 },
    features: [{ kind: "stripes", count: 7 }],
  },
  /** แองคิโลซอรัส: ตัวกว้างเตี้ย เดิน 4 ขา เกราะปุ่มกระดูกทั้งหลัง หางเป็นตะบอง */
  ankylo: {
    width: 96, height: 48, groundY: 46, seed: 16,
    palette: P(["#3a3424", "#5a5036", "#7a6e4a", "#9a8e64", "#bcb084"], ["#9a9078", "#c6bc9e"], ["#4a4436", "#7a7058", "#ab9f80", "#d8cdb0"]),
    body: { c: [46, 30], rx: 22, ry: 10 },
    tail: { from: [26, 32], to: [10, 30], r: 6, tip: 2.5, sag: 2 },
    neck: { from: [66, 30], to: [72, 32], r0: 6, r1: 5 },
    head: { kind: "armored", c: [77, 32], size: 6 },
    hind: { hip: [34, 33], thigh: 7, style: "column", width: 6 },
    front: { shoulder: [60, 34], width: 5.5 },
    features: [{ kind: "osteoderms" }, { kind: "club" }],
  },
  /** สเตโกซอรัส: สะโพกสูง ขาหน้าสั้น แผ่นหลังสลับ 2 แถว หนามหาง 4 อัน หัวเล็ก */
  stego: {
    width: 104, height: 72, groundY: 70, seed: 17,
    palette: P(["#30382a", "#4a563e", "#667456", "#86946e", "#a8b48c"], ["#a8a088", "#d0c8ae"], ["#5a2418", "#8e3e22", "#c2622e", "#e89048"]),
    body: { c: [52, 46], rx: 22, ry: 12 },
    humps: [{ c: [42, 42], rx: 14, ry: 12 }],
    tail: { from: [32, 44], to: [8, 42], r: 7, tip: 1.6, sag: -3 },
    neck: { from: [70, 50], to: [80, 55], r0: 5, r1: 3.6 },
    head: { kind: "small", c: [84, 56], size: 4.5 },
    hind: { hip: [40, 49], thigh: 8, style: "column", width: 7 },
    front: { shoulder: [68, 55], width: 5 },
    features: [{ kind: "plates", from: 30, to: 70, height: 15 }, { kind: "thagomizer" }],
  },
  /** ไทรเซอราทอปส์: แผงคอใหญ่ เขาคิ้วยาว 2 เขาจมูกสั้น 1 ปากจะงอย เดิน 4 ขา */
  trike: {
    width: 104, height: 64, groundY: 62, seed: 18,
    palette: P(["#3a3028", "#5a4a3c", "#7a6652", "#9c866c", "#bea88a"], ["#a8987e", "#d2c4a6"], ["#5a3a26", "#8a5a38", "#b8844e", "#dcae72"]),
    body: { c: [46, 38], rx: 24, ry: 13 },
    tail: { from: [26, 38], to: [6, 40], r: 7, tip: 2, sag: 2 },
    neck: { from: [68, 40], to: [74, 42], r0: 7, r1: 6 },
    head: { kind: "ceratops", c: [80, 40], size: 8 },
    hind: { hip: [36, 42], thigh: 8, style: "column", width: 7 },
    front: { shoulder: [64, 46], width: 6.5 },
    features: [],
  },
  /** พาราซอโรโลฟัส (ไดโนปากเป็ด): หงอนท่อยาวชี้หลัง เดินได้ทั้ง 2 และ 4 ขา */
  duckbill: {
    width: 104, height: 72, groundY: 70, seed: 19,
    palette: P(["#2e3a2c", "#465a42", "#5e7856", "#7c9870", "#a0b890"], ["#b4ac90", "#dcd4b8"], ["#6a3018", "#a04a22", "#d0702e", "#f09a4a"], "#24301f"),
    body: { c: [48, 40], rx: 20, ry: 12 },
    tail: { from: [30, 38], to: [3, 34], r: 8, tip: 1.5, sag: 1 },
    neck: { from: [64, 36], to: [72, 26], r0: 6, r1: 4.5, bend: 1 },
    head: { kind: "duckbill", c: [76, 24], size: 5 },
    hind: { hip: [44, 44], thigh: 9, style: "digitigrade", width: 4.5 },
    front: { shoulder: [62, 47], width: 4.6 },
    features: [{ kind: "stripes", count: 6 }],
  },
  /** สไปโนซอรัส: ใบเรือสูงบนหลัง ปากยาวแบบจระเข้ ขาหลังสั้น หางสูงแบบใบพาย (ว่ายเก่งแค่ไหนยังถกเถียงอยู่) */
  spino: {
    width: 136, height: 88, groundY: 86, seed: 20,
    palette: P(["#2a2622", "#423a32", "#5e5244", "#7c6c5a", "#9c8a74"], ["#a89a84", "#d0c4ac"], ["#4a1e18", "#7a3424", "#a85232", "#d27a4a"]),
    body: { c: [64, 56], rx: 24, ry: 12 },
    tail: { from: [42, 56], to: [6, 54], r: 9, tip: 2, sag: 2 },
    neck: { from: [82, 52], to: [96, 46], r0: 7, r1: 5.5 },
    head: { kind: "croc", c: [99, 44], size: 6 },
    hind: { hip: [60, 62], thigh: 9, style: "digitigrade", width: 4.5 },
    arms: { shoulder: [80, 58], length: 14, width: 3, fingers: 3 },
    features: [{ kind: "sail", from: 46, to: 84, height: 26 }, { kind: "tailFin", height: 12 }],
  },
  /** ทีเร็กซ์: หัวใหญ่ลึก ปากปิดมีริมฝีปาก (ไม่โชว์ฟัน) แขนเล็ก 2 นิ้ว ตัวใหญ่ส่วนใหญ่เป็นเกล็ด */
  trex: {
    width: 144, height: 96, groundY: 94, seed: 21,
    palette: P(["#2c241c", "#46382a", "#62503c", "#806a50", "#a08a6c"], ["#a89478", "#d2c0a0"], ["#3a2c20", "#5a4632", "#7a6248"], "#2a2016"),
    body: { c: [66, 50], rx: 26, ry: 17 },
    tail: { from: [44, 48], to: [5, 40], r: 13, tip: 2, sag: 3 },
    neck: { from: [88, 44], to: [100, 40], r0: 11, r1: 10 },
    head: { kind: "tyrant", c: [107, 38], size: 11 },
    hind: { hip: [62, 60], thigh: 13, style: "digitigrade", width: 7 },
    arms: { shoulder: [90, 58], length: 9, width: 3, fingers: 2 },
    features: [{ kind: "stripes", count: 7 }],
  },
  /** แบรคิโอซอรัส: ขาหน้ายาวกว่าขาหลัง ไหล่สูง คอชูขึ้น โหนกจมูกเหนือตา */
  brachio: {
    width: 160, height: 150, groundY: 148, seed: 22,
    palette: P(["#2e3430", "#48524a", "#647064", "#848f80", "#a6b0a0"], ["#a4a494", "#cccabc"], ["#3a4038", "#5a6458", "#7c8878"]),
    body: { c: [66, 106], rx: 30, ry: 17 },
    humps: [{ c: [84, 98], rx: 18, ry: 15 }],
    tail: { from: [40, 108], to: [4, 120], r: 11, tip: 2, sag: -2 },
    neck: { from: [92, 92], to: [126, 22], r0: 10, r1: 5, bend: -6 },
    head: { kind: "sauropod", c: [131, 18], size: 7 },
    hind: { hip: [50, 114], thigh: 11, style: "column", width: 9 },
    front: { shoulder: [88, 104], width: 9 },
    features: [],
  },
} satisfies Record<string, DinoSpec>;

export type SpeciesId = keyof typeof SPECIES;
export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];
