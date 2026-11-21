/** พอร์ตเซิร์ฟเวอร์เกมตอนรันเอง (ตรงกับ server/.env.development) */
const DEFAULT_PORT = 2567;

/**
 * หาที่อยู่เซิร์ฟเวอร์เกม
 * - ตั้ง VITE_SERVER_URL ไว้ → ใช้ค่านั้น (ใช้ตอนขึ้นเซิร์ฟเวอร์จริง)
 * - ไม่ได้ตั้ง → ใช้เครื่องเดียวกับที่เปิดหน้าเว็บ พอร์ต 2567
 *   (มือถือที่เปิด http://192.168.x.x:5173 จะต่อไปที่ 192.168.x.x:2567 อัตโนมัติ)
 */
export function resolveServerUrl(
  envUrl: string | undefined,
  loc: { protocol: string; hostname: string },
): string {
  const fromEnv = envUrl?.trim();
  if (fromEnv) return fromEnv;
  const scheme = loc.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${loc.hostname}:${DEFAULT_PORT}`;
}
