# เซิร์ฟเวอร์เกม Primal Isle — ใช้ได้ทั้ง Render และ Oracle Cloud (หรือเครื่องไหนก็ได้ที่มี Docker)
# สร้าง:  docker build -t primal-isle .
# รัน:    docker run -p 2567:2567 -v primal-data:/data primal-isle
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# ติดตั้งเฉพาะที่เซิร์ฟเวอร์ใช้ (คัด package.json มาก่อน เพื่อให้ Docker จำชั้นนี้ไว้ ไม่ต้องติดตั้งใหม่ทุกครั้งที่แก้โค้ด)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev -w server -w shared && npm cache clean --force

COPY shared shared
COPY server server

# ไฟล์บันทึกโลก — ผูกกับ volume ไว้ จะได้ไม่หายตอนอัปเดต image (Render ฟรีไม่มีดิสก์ถาวร: หายเมื่อรีสตาร์ท)
ENV DATA_DIR=/data/worlds
VOLUME /data

# โฮสต์ส่วนใหญ่บอกพอร์ตผ่านตัวแปร PORT (ไม่ตั้ง = 2567)
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:'+(process.env.PORT||2567)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/server
# node เป็นโปรเซสหลักเอง (ไม่ผ่าน npm/npx) → ได้รับสัญญาณปิดเครื่อง แล้วบันทึกโลกก่อนปิด
CMD ["node", "--import", "tsx", "src/index.ts"]
