import { ErrorCode } from "@colyseus/sdk";
import { MAX_PLAYERS } from "@primal/shared";

/**
 * แปลง error ตอนสร้าง/เข้าโลก เป็นข้อความภาษาไทยที่ผู้เล่นเข้าใจ
 * Colyseus ส่งรหัสเดียวกัน (MATCHMAKE_INVALID_ROOM_ID) ทั้งกรณีไม่มีห้องและห้องเต็ม/ล็อก
 */
export function describeJoinError(err: unknown): string {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  const message = String((err as { message?: unknown } | null | undefined)?.message ?? "");
  if (message.includes("world not found")) return "ไม่พบโลกนี้ ตรวจรหัสอีกครั้ง";
  if (message.includes("already playing")) return "คุณเล่นโลกนี้อยู่ในอีกหน้าต่างแล้ว";
  // ห้องเต็ม = ล็อก → joinById ไม่เจอห้อง → ลองเปิดจากไฟล์ → เซิร์ฟเวอร์ตอบว่าห้องเปิดอยู่แล้ว
  if (message.includes("world already open")) return `โลกเต็มแล้ว (สูงสุด ${MAX_PLAYERS} คน)`;
  if (code === ErrorCode.MATCHMAKE_INVALID_ROOM_ID) {
    return `ไม่พบโลกนี้ หรือโลกเต็มแล้ว (สูงสุด ${MAX_PLAYERS} คน)`;
  }
  return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง";
}
