import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { PWA_MANIFEST } from "./src/pwa/manifest";

export default defineConfig({
  // host: true = เปิดให้มือถือใน Wi-Fi เดียวกันเข้าถึงได้ผ่าน IP ของคอม
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  base: "./",
  build: { target: "es2022", chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      // มีเวอร์ชันใหม่ → service worker โหลดมาเองเงียบๆ แล้วใช้ตั้งแต่การเปิดครั้งถัดไป (ไม่มีหน้าเก่าค้าง)
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: { ...PWA_MANIFEST, icons: [...PWA_MANIFEST.icons] },
      workbox: {
        // เก็บไฟล์เกม (โค้ด ภาพ) ไว้ในเครื่อง → เปิดครั้งต่อไปเร็ว · การต่อเซิร์ฟเวอร์เกม (websocket) ไม่ผ่านตรงนี้
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // Phaser ~1.5 MB
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
