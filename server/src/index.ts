// จุดเริ่มเซิร์ฟเวอร์: ฟังที่พอร์ต 2567 (หรือค่า PORT ใน environment)
import { listen } from "@colyseus/tools";
import app from "./app.config.js";

listen(app);
