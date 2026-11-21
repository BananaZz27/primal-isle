/**
 * ตัวช่วยสร้าง element แบบปลอดภัย: ใส่ข้อความด้วย textContent เท่านั้น
 * (ห้ามใช้ innerHTML กับข้อความจากผู้เล่น เพราะเปิดช่องให้ฝังโค้ดได้)
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string } = {},
  ...children: HTMLElement[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  node.append(...children);
  return node;
}

/** ที่วาง UI ทั้งหมด (div#ui ใน index.html) */
export function uiRoot(): HTMLElement {
  const root = document.getElementById("ui");
  if (!root) throw new Error("#ui element missing in index.html");
  return root;
}

/** อ่าน/เขียน localStorage แบบไม่พัง (บางเบราว์เซอร์/โหมดส่วนตัวใช้ไม่ได้) */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ใช้ไม่ได้ก็ข้ามไป */
    }
  },
};
