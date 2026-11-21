import { buildInviteLink } from "../net/invite";
import { el, uiRoot } from "./dom";

/** ป้ายมุมจอในเกม: แสดงรหัสโลก + ปุ่มคัดลอกลิงก์เชิญ คืนฟังก์ชันสำหรับเอาออก */
export function showInvitePanel(code: string): () => void {
  const link = buildInviteLink(window.location.href, code);
  const copyBtn = el("button", { text: "📋 คัดลอกลิงก์เชิญ", className: "small" });
  const fallback = el("input", { className: "link" });
  fallback.readOnly = true;
  fallback.value = link;
  fallback.hidden = true;

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = "✅ คัดลอกแล้ว";
      setTimeout(() => (copyBtn.textContent = "📋 คัดลอกลิงก์เชิญ"), 2000);
    } catch {
      // บางเบราว์เซอร์ (เช่นเปิดผ่าน http บนมือถือ) ไม่ให้คัดลอกอัตโนมัติ → โชว์ลิงก์ให้กดค้างคัดลอกเอง
      fallback.hidden = false;
      fallback.select();
    }
  });

  const panel = el(
    "div",
    { className: "panel invite" },
    el("span", { text: "รหัสโลก: " }),
    el("strong", { text: code }),
    copyBtn,
    fallback,
  );
  uiRoot().append(panel);
  return () => panel.remove();
}
