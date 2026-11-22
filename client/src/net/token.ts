import { storage } from "../ui/dom";

const KEY = "primal-isle:token";

/** token สุ่มใหม่ (ตัวอักษร/ตัวเลข 32 ตัว) */
export function newToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** token ประจำเบราว์เซอร์นี้ — เซิร์ฟเวอร์ใช้จำว่า "เราคือใคร" เพื่อคืนตัวละคร/กระเป๋าเดิม */
export function myToken(): string {
  let token = storage.get(KEY);
  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    token = newToken();
    storage.set(KEY, token);
  }
  return token;
}
