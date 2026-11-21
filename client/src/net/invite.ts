/** ชื่อ query ในลิงก์เชิญ เช่น https://…/?w=AbC123xyz */
const PARAM = "w";

/** สร้างลิงก์เชิญเพื่อนเข้าโลก `code` จาก URL ของหน้าปัจจุบัน */
export function buildInviteLink(href: string, code: string): string {
  const url = new URL(href);
  url.searchParams.set(PARAM, code);
  url.hash = "";
  return url.toString();
}

/** อ่านรหัสโลกจากลิงก์เชิญ — ไม่มีหรือว่างคืน null */
export function readInviteCode(href: string): string | null {
  const code = new URL(href).searchParams.get(PARAM)?.trim();
  return code ? code : null;
}
