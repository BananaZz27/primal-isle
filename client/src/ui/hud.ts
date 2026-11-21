import { connectionLostText } from "../net/frameSteps";
import { el, uiRoot } from "./dom";

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
