/**
 * ข้อมูลแอป (Web App Manifest) — ทำให้ "เพิ่มไปยังหน้าจอโฮม" ได้ และเปิดจากไอคอนแล้วเต็มจอแนวนอนเหมือนแอป
 * path ทั้งหมดเป็นแบบสัมพัทธ์ ("./") เพราะเกมอาจอยู่ในโฟลเดอร์ย่อย เช่น GitHub Pages /primal-isle/
 */
export const PWA_MANIFEST = {
  name: "Primal Isle — เกาะดึกดำบรรพ์",
  short_name: "Primal Isle",
  description: "เกมเอาชีวิตรอดบนเกาะไดโนเสาร์ เล่นกับเพื่อนผ่านเว็บ",
  lang: "th",
  start_url: "./",
  scope: "./",
  display: "fullscreen",
  orientation: "landscape",
  background_color: "#1d3b26",
  theme_color: "#1d3b26",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
} as const;
