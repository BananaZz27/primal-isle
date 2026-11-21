import { DEFAULT_NAME, NAME_MAX } from "../constants";

/** อักขระที่ไม่อนุญาตในชื่อ: วงเล็บแหลม (กัน HTML) และอักขระควบคุม (ขึ้นบรรทัดใหม่, tab ฯลฯ) */
const FORBIDDEN = /[<>\p{Cc}]/gu;

/**
 * ทำความสะอาดชื่อเล่นที่ผู้เล่นพิมพ์มา
 * ใช้ทั้งฝั่ง client (ก่อนส่ง) และ server (ตัวตัดสินจริง) ให้ได้ผลตรงกัน
 */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_NAME;

  const cleaned = raw.replace(FORBIDDEN, "").trim();
  // ใช้ Array.from เพื่อนับเป็นตัวอักษรจริง ไม่ตัดอีโมจิครึ่งตัว
  const cut = Array.from(cleaned).slice(0, NAME_MAX).join("").trim();

  return cut.length > 0 ? cut : DEFAULT_NAME;
}
