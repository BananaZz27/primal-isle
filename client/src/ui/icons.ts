import { ASSET_ROOT, TILESET_COLS, TILESET_ROWS, type Icon } from "../art/ninjaAtlas";

/** ขนาดไอคอนบนจอ (px) — ภาพต้นฉบับ 16px ขยาย 2 เท่าแบบคมชัด */
const ICON_PX = 32;

/** สร้าง element ไอคอนจากช่องใน tileset (ใช้ CSS ตัดภาพ) หรือจากไฟล์ภาพแยก */
export function iconElement(icon: Icon): HTMLElement {
  if (icon.kind === "file") {
    const img = document.createElement("img");
    img.src = `${ASSET_ROOT}/${icon.path}`;
    img.className = "icon";
    img.alt = "";
    return img;
  }
  const div = document.createElement("div");
  div.className = "icon";
  const col = icon.frame % TILESET_COLS;
  const row = Math.floor(icon.frame / TILESET_COLS);
  const scale = ICON_PX / 16;
  div.style.backgroundImage = `url(${ASSET_ROOT}/tileset.png)`;
  div.style.backgroundSize = `${TILESET_COLS * 16 * scale}px ${TILESET_ROWS * 16 * scale}px`;
  div.style.backgroundPosition = `-${col * ICON_PX}px -${row * ICON_PX}px`;
  return div;
}
