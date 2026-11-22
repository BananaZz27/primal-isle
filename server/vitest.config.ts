import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ไฟล์เทสต์แต่ละไฟล์เปิดเซิร์ฟเวอร์ทดสอบที่พอร์ตเดียวกัน (2568)
    // ถ้ารันพร้อมกันจะชนพอร์ต (EADDRINUSE) — เจอบน GitHub Actions จึงบังคับให้รันทีละไฟล์
    fileParallelism: false,
    hookTimeout: 20000,
    setupFiles: ["./test/setup.ts"],
  },
});
