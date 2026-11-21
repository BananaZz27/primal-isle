import { connectionLostText, reconnectingText } from "../net/frameSteps";
import { el, uiRoot } from "./dom";

/** กล่อง "กำลังเชื่อมต่อใหม่…" ระหว่างเน็ตสะดุด พร้อมปุ่มยอมแพ้กลับเมนู คืนฟังก์ชันสำหรับเอาออก */
export function showReconnecting(onBack: () => void): () => void {
  const back = el("button", { text: "กลับเมนู", className: "secondary" });
  const panel = el(
    "div",
    { className: "panel menu" },
    el("h1", { text: "📶" }),
    el("p", { className: "subtitle", text: reconnectingText() }),
    back,
  );
  back.addEventListener("click", onBack);
  uiRoot().append(panel);
  return () => panel.remove();
}

/** กล่องแจ้ง "หลุดการเชื่อมต่อ" กลางจอ พร้อมปุ่มกลับเมนู คืนฟังก์ชันสำหรับเอาออก */
export function showConnectionLost(onBack: () => void): () => void {
  const back = el("button", { text: "กลับเมนู" });
  const panel = el(
    "div",
    { className: "panel menu" },
    el("h1", { text: "😵" }),
    el("p", { className: "subtitle", text: connectionLostText() }),
    back,
  );
  back.addEventListener("click", onBack);
  uiRoot().append(panel);
  return () => panel.remove();
}
