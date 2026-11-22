// ทุกไฟล์เทสต์เก็บไฟล์บันทึกโลกในโฟลเดอร์ชั่วคราว (ไม่เขียนลง server/data จริง)
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATA_DIR ??= mkdtempSync(join(tmpdir(), "primal-test-worlds-"));
