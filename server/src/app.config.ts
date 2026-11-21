import { defineServer, defineRoom, monitor, playground } from "colyseus";
import { WorldRoom } from "./rooms/WorldRoom.js";

/**
 * ตั้งค่าเซิร์ฟเวอร์: ประกาศห้องทั้งหมดที่นี่
 * client ใช้ `import type` ไฟล์นี้ เพื่อให้ชื่อห้องถูกตรวจชนิดตอนเขียนโค้ด
 */
const server = defineServer({
  rooms: {
    world: defineRoom(WorldRoom),
  },

  express: (app) => {
    app.get("/health", (_req, res) => {
      res.json({ ok: true });
    });

    // เครื่องมือดีบัก เปิดเฉพาะตอนพัฒนา ห้ามเปิดบนเซิร์ฟเวอร์จริง
    if (process.env.NODE_ENV !== "production") {
      app.use("/monitor", monitor());
      app.use("/", playground());
    }
  },
});

export default server;
