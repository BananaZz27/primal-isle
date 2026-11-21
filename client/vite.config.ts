import { defineConfig } from "vite";

export default defineConfig({
  // host: true = เปิดให้มือถือใน Wi-Fi เดียวกันเข้าถึงได้ผ่าน IP ของคอม
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  base: "./",
  build: { target: "es2022", chunkSizeWarningLimit: 2000 },
});
