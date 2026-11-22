import { NAME_MAX } from "@primal/shared";
import { el, storage, uiRoot } from "./dom";

const NAME_KEY = "primal-isle:name";

export interface MenuOptions {
  /** รหัสโลกจากลิงก์เชิญ (ถ้ามี) จะถูกกรอกให้อัตโนมัติ */
  inviteCode: string | null;
  onCreate(name: string): void;
  onJoin(code: string, name: string): void;
}

export interface MenuHandle {
  setError(message: string): void;
  setBusy(busy: boolean): void;
  hide(): void;
}

/** หน้าเมนูแรก: ตั้งชื่อเล่น → สร้างโลกใหม่ หรือ ใส่รหัสเข้าโลกเพื่อน */
export function showMenu(opts: MenuOptions): MenuHandle {
  const nameInput = el("input");
  nameInput.maxLength = NAME_MAX;
  nameInput.placeholder = "ชื่อเล่นของคุณ";
  nameInput.value = storage.get(NAME_KEY) ?? "";

  const codeInput = el("input");
  codeInput.placeholder = "รหัสโลกของเพื่อน";
  codeInput.value = opts.inviteCode ?? "";
  codeInput.autocapitalize = "characters";
  codeInput.maxLength = 6;
  codeInput.spellcheck = false;

  const createBtn = el("button", { text: "🏝️ สร้างโลกใหม่" });
  const joinBtn = el("button", { text: "เข้าโลก", className: "secondary" });
  const error = el("p", { className: "error" });

  const panel = el(
    "div",
    { className: "panel menu" },
    el("h1", { text: "Primal Isle" }),
    el("p", { className: "subtitle", text: "เกาะดึกดำบรรพ์ — เอาชีวิตรอดไปด้วยกัน" }),
    el("label", { text: "ชื่อเล่น" }),
    nameInput,
    createBtn,
    el("div", { className: "divider", text: "หรือเข้าโลกของเพื่อน" }),
    el("div", { className: "row" }, codeInput, joinBtn),
    error,
  );

  const currentName = () => {
    storage.set(NAME_KEY, nameInput.value);
    return nameInput.value;
  };

  createBtn.addEventListener("click", () => opts.onCreate(currentName()));
  joinBtn.addEventListener("click", () => {
    const code = codeInput.value.trim();
    if (!code) {
      error.textContent = "ใส่รหัสโลกก่อนนะ";
      return;
    }
    opts.onJoin(code, currentName());
  });

  // ถ้ามาจากลิงก์เชิญ ให้ปุ่ม "เข้าโลก" เด่นกว่า
  if (opts.inviteCode) {
    joinBtn.className = "";
    createBtn.className = "secondary";
  }

  uiRoot().append(panel);

  return {
    setError(message) {
      error.textContent = message;
    },
    setBusy(busy) {
      createBtn.disabled = busy;
      joinBtn.disabled = busy;
      if (busy) error.textContent = "กำลังเชื่อมต่อ…";
    },
    hide() {
      panel.remove();
    },
  };
}
