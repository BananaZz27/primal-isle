import type { Icon } from "../art/textures";
import { hdIcon } from "../art/hd/icons";

/** สร้าง element ไอคอน: ภาพ HD 32 texel = 32 CSS px → จอความละเอียดสูงเห็นรายละเอียดครบ */
export function iconElement(icon: Icon): HTMLElement {
  const art = hdIcon(icon.id);
  const canvas = document.createElement("canvas");
  canvas.width = art.width;
  canvas.height = art.height;
  canvas.className = "icon";
  canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(art.data), art.width, art.height), 0, 0);
  return canvas;
}
