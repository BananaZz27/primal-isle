import { el, uiRoot } from "./dom";

/** กล่องแจ้งเมื่อโหลดภาพของเกมไม่สำเร็จ (เช่น เน็ตมือถือสะดุด) พร้อมปุ่มโหลดใหม่ */
export function showLoadError(): void {
  const reload = el("button", { text: "🔄 โหลดใหม่" });
  reload.addEventListener("click", () => window.location.reload());
  uiRoot().append(
    el(
      "div",
      { className: "panel menu" },
      el("h1", { text: "😕" }),
      el("p", { className: "subtitle", text: "โหลดภาพไม่สำเร็จ — ลองรีเฟรชอีกครั้ง" }),
      reload,
    ),
  );
}
