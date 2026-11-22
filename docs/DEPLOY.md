# คู่มือขึ้นเกมออนไลน์ (ให้เพื่อนต่างบ้านเล่นได้)

> สำหรับโบ๊ท · ทำครั้งเดียว ใช้เวลาราว 20–60 นาที · ไม่ต้องเขียนโค้ดเพิ่ม
> ทุกอย่างฟรี · ไม่มีรหัสลับอะไรต้องเก็บใน repo (ค่าที่ตั้งเป็นแค่ "ที่อยู่เซิร์ฟเวอร์" ซึ่งเปิดเผยได้)

## ภาพรวม: เกมมี 2 ส่วน

```
เพื่อนเปิดลิงก์ ──▶ [หน้าเว็บเกม]  GitHub Pages (ฟรี เปิดตลอด)
                        │  ต่อผ่าน wss:// (websocket แบบเข้ารหัส)
                        ▼
                  [เซิร์ฟเวอร์เกม]  Render หรือ Oracle Cloud
                  ตัดสินผลทุกอย่าง + เก็บไฟล์บันทึกโลก
```

- **หน้าเว็บเกม (client)** = ไฟล์ภาพ/โค้ดที่เบราว์เซอร์โหลด → วางบน **GitHub Pages** (บริการโฮสต์หน้าเว็บฟรีของ GitHub)
- **เซิร์ฟเวอร์เกม (server)** = โปรแกรมที่ต้องรันตลอด → ต้องมีเครื่องให้รัน เลือก 1 ใน 2 ทางด้านล่าง
- **wss://** = websocket (ท่อส่งข้อมูลสองทางแบบเรียลไทม์) ที่เข้ารหัสแบบเดียวกับ https — หน้าเว็บที่เป็น https ต่อได้แต่ wss เท่านั้น

## ขั้นที่ 1: เลือกที่ตั้งเซิร์ฟเวอร์

| | **ทาง A: Render** (ง่าย) | **ทาง B: Oracle Cloud** (ถาวร) |
|---|---|---|
| สมัคร | ด้วยบัญชี GitHub ไม่ต้องใช้บัตร | ต้องกรอกบัตรเครดิต/เดบิต (ยืนยันตัวตน ไม่ตัดเงินถ้าใช้แต่ของฟรี) |
| เปิดตลอดไหม | **หลับ**เมื่อไม่มีคนเล่น 15 นาที · เข้าครั้งแรกหลังหลับรอ ~1 นาที | เปิดตลอด |
| เซฟโลก | **หายทุกครั้งที่หลับ/รีสตาร์ท/อัปเดต** (Render ฟรีไม่มีดิสก์ถาวร) → เล่นจบรอบแล้วเริ่มเกาะใหม่ | **เก็บถาวร** กลับมาเล่นเกาะเดิมได้ |
| ความยาก | กดไม่กี่ปุ่ม (~10 นาที) | ต้องพิมพ์คำสั่ง Linux ตามคู่มือ (~45 นาที) |

**แนะนำ:** ลองทาง A ก่อนเพื่อเล่นกับเพื่อนวันนี้เลย ถ้าติดใจอยากเก็บเกาะไว้ ค่อยทำทาง B (ทำทีหลังได้ ไม่ต้องแก้โค้ด แค่เปลี่ยนค่า `SERVER_URL` ในขั้นที่ 3)

---

## ขั้นที่ 2A: เซิร์ฟเวอร์บน Render

1. ไปที่ https://render.com → **Get Started** → เลือก **GitHub** เพื่อสมัครด้วยบัญชี GitHub
2. ในหน้า Dashboard กด **New +** → **Blueprint**
   (Blueprint = ให้ Render อ่านไฟล์ `render.yaml` ใน repo แล้วสร้างทุกอย่างเอง)
3. เลือก repo **primal-isle** (ถ้าไม่เห็น กด *Configure account* แล้วอนุญาตให้ Render เห็น repo นี้)
4. Render จะแสดงบริการชื่อ `primal-isle` แบบ **Free** → กด **Apply** (หรือ *Deploy Blueprint*)
5. รอ build ราว 3–8 นาที จนสถานะเป็น **Live** (สีเขียว)
6. คัดลอกที่อยู่ด้านบน เช่น `https://primal-isle-abcd.onrender.com`
7. ทดสอบ: เปิด `https://primal-isle-abcd.onrender.com/health` ในเบราว์เซอร์ ต้องเห็น `{"ok":true}`
8. ค่าที่จะใช้ในขั้นที่ 3 คือเปลี่ยน `https://` เป็น `wss://` → **`wss://primal-isle-abcd.onrender.com`**

ข้ามไปขั้นที่ 3 ได้เลย

---

## ขั้นที่ 2B: เซิร์ฟเวอร์บน Oracle Cloud (Always Free)

### 2B.1 สมัครและสร้างเครื่อง
1. สมัครที่ https://www.oracle.com/cloud/free/ → เลือก **Home Region** ที่ใกล้ เช่น *Singapore* (เปลี่ยนทีหลังไม่ได้)
2. เข้า Console → เมนู ☰ → **Compute → Instances → Create instance**
3. ตั้งค่า:
   - **Image:** Canonical **Ubuntu 24.04**
   - **Shape:** *Ampere* → **VM.Standard.A1.Flex** → 1 OCPU, 6 GB (อยู่ในโควตาฟรี 2 OCPU / 12 GB)
     (ถ้าขึ้นว่าเต็ม/Out of capacity ให้ลองใหม่ภายหลัง หรือใช้ *VM.Standard.E2.1.Micro* ก็พอสำหรับเกมนี้)
   - **SSH keys:** เลือก *Generate a key pair* แล้วกด **Save private key** (ไฟล์ `.key` — เก็บให้ดี ห้ามส่งให้ใคร)
4. กด **Create** รอจนเป็น *Running* แล้วจดเลข **Public IP address** เช่น `140.238.1.23`

### 2B.2 เปิดประตูเครือข่าย (พอร์ต 80 และ 443)
1. ในหน้าเครื่อง → แท็บ **Networking** → คลิก **Subnet** → **Security Lists** → *Default Security List*
2. **Add Ingress Rules** สองแถว: Source CIDR `0.0.0.0/0`, TCP, Destination port `80` และอีกแถว `443`

### 2B.3 ติดตั้งเกมบนเครื่อง
เชื่อมต่อเครื่องจากคอม (Windows ใช้ PowerShell ได้เลย):
```bash
ssh -i path\to\ssh-key.key ubuntu@140.238.1.23
```
แล้ววางคำสั่งเหล่านี้ทีละบล็อก (เปลี่ยน `140-238-1-23` เป็น IP ของโบ๊ท โดยใช้ `-` แทน `.`):
```bash
# 1) ติดตั้ง Docker (โปรแกรมรันกล่องแอป) และ Caddy (ตัวทำ https/wss ให้อัตโนมัติ)
sudo apt update && sudo apt install -y docker.io git caddy

# 2) เปิดพอร์ตในไฟร์วอลล์ของ Ubuntu บน Oracle (ค่าเริ่มต้นบล็อกไว้)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt install -y iptables-persistent && sudo netfilter-persistent save

# 3) ดึงเกมแล้วสร้าง image
git clone https://github.com/BananaZz27/primal-isle.git && cd primal-isle
sudo docker build -t primal-isle .

# 4) รันเซิร์ฟเวอร์ (เปิดเองหลังเครื่องรีบูต · เซฟอยู่ใน volume ชื่อ primal-data ไม่หายตอนอัปเดต)
sudo docker run -d --name primal-isle --restart unless-stopped \
  -p 127.0.0.1:2567:2567 -v primal-data:/data primal-isle

# 5) ให้ Caddy ทำ https ให้ — ใช้ชื่อฟรีจาก sslip.io (แปลงชื่อเป็น IP ให้เอง ไม่ต้องซื้อโดเมน)
echo '140-238-1-23.sslip.io {
  reverse_proxy localhost:2567
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```
ทดสอบ: เปิด `https://140-238-1-23.sslip.io/health` ต้องเห็น `{"ok":true}` (ครั้งแรกอาจรอ ~1 นาทีให้ Caddy ขอใบรับรอง)

ค่าที่จะใช้ในขั้นที่ 3 → **`wss://140-238-1-23.sslip.io`**

---

## ขั้นที่ 3: ขึ้นหน้าเว็บเกมบน GitHub Pages

1. ใน repo บน GitHub → **Settings → Pages** → ช่อง *Source* เลือก **GitHub Actions**
2. **Settings → Secrets and variables → Actions → แท็บ Variables → New repository variable**
   - Name: `SERVER_URL`
   - Value: ค่าจากขั้นที่ 2 เช่น `wss://primal-isle-abcd.onrender.com`
   (ใช้ *Variables* ไม่ใช่ *Secrets* เพราะที่อยู่นี้ไม่ใช่ความลับ — เบราว์เซอร์ทุกคนต้องรู้อยู่แล้ว)
3. แท็บ **Actions** → เลือก **Deploy client (GitHub Pages)** → **Run workflow** → รอติ๊กเขียว (~2 นาที)
4. เกมอยู่ที่ **https://bananazz27.github.io/primal-isle/** 🎉
   ต่อจากนี้ทุกครั้งที่ push เข้า main หน้าเว็บจะอัปเดตเอง

## ขั้นที่ 4: ทดสอบกับเพื่อน + เพิ่มลงหน้าจอโฮม
1. เปิดลิงก์เกม → ใส่ชื่อ → **สร้างโลกใหม่** (ถ้าใช้ Render แล้วเซิร์ฟเวอร์หลับอยู่ จะขึ้น "กำลังเชื่อมต่อ…" ราว 1 นาที)
2. กด **📋 คัดลอกลิงก์เชิญ** ส่งให้เพื่อนทาง LINE — เพื่อนกดแล้วเข้าโลกเดียวกันได้เลย
3. เพิ่มไอคอนบนมือถือ (เปิดจากไอคอนแล้วเต็มจอเหมือนแอป):
   - **Android (Chrome):** เมนู ⋮ → **ติดตั้งแอป / เพิ่มลงในหน้าจอหลัก**
   - **iPhone (Safari):** ปุ่มแชร์ ⬆️ → **เพิ่มไปยังหน้าจอโฮม**

## อัปเดตเกมในอนาคต
- **หน้าเว็บ:** อัตโนมัติเมื่อ push เข้า main · มือถือที่ติดตั้งไว้จะได้เวอร์ชันใหม่ตอนเปิดครั้งถัดไป
- **Render:** อัปเดตเองเมื่อ push เข้า main (`autoDeploy`) — ⚠️ โลกที่เปิดค้างอยู่จะหาย
- **Oracle:** ssh เข้าเครื่องแล้ว
  ```bash
  cd primal-isle && git pull && sudo docker build -t primal-isle . \
    && sudo docker rm -f primal-isle \
    && sudo docker run -d --name primal-isle --restart unless-stopped -p 127.0.0.1:2567:2567 -v primal-data:/data primal-isle
  ```
  (`docker rm -f` ส่งสัญญาณปิด → เกมบันทึกโลกก่อนปิดเสมอ · เซฟอยู่ใน volume ไม่หาย)

## แก้ปัญหาที่พบบ่อย
| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| Actions ขึ้นแดง "ยังไม่ได้ตั้งตัวแปร SERVER_URL" | ทำขั้นที่ 3 ข้อ 2 แล้วกด Run workflow ใหม่ |
| "SERVER_URL ต้องขึ้นต้นด้วย wss://" | ใส่ `wss://...` ไม่ใช่ `https://` หรือ `ws://` |
| เข้าเกมแล้วขึ้น "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" | เปิด `https://<ที่อยู่เซิร์ฟเวอร์>/health` ดู — ไม่ขึ้น `{"ok":true}` = เซิร์ฟเวอร์ยังไม่พร้อม (Render: ดู Logs · Oracle: `sudo docker logs primal-isle`) |
| Render: เปิดครั้งแรกรอนาน | ปกติ — เซิร์ฟเวอร์ฟรีหลับอยู่ ต้องปลุก ~1 นาที |
| Oracle: `/health` เปิดไม่ได้ | เช็กขั้น 2B.2 (Security List) และคำสั่ง iptables ในขั้น 2B.3 ข้อ 2 |
| หน้าเว็บยังเป็นเวอร์ชันเก่า | ปิดแอป/แท็บแล้วเปิดใหม่ 1 ครั้ง (service worker โหลดเวอร์ชันใหม่ไว้แล้ว) |

## ความปลอดภัย
- ห้ามใส่รหัสผ่าน/คีย์ใดๆ ลงใน repo — ไฟล์ SSH key ของ Oracle เก็บในคอมเท่านั้น
- เซิร์ฟเวอร์จริงตั้ง `NODE_ENV=production` แล้ว (ใน Dockerfile) → หน้าดีบัก `/monitor` ถูกปิด
