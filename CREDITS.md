# เครดิตและที่มาของ Asset

กฎ: ใช้เฉพาะ asset ที่เป็น **CC0** หรือ **CC-BY** เท่านั้น (ห้าม NC) และต้องบันทึกที่มาของทุกไฟล์ที่นี่

## ภาพ (Graphics)

| ไฟล์ | ผู้สร้าง | ที่มา | License |
|---|---|---|---|
| `client/public/assets/ninja-adventure/tileset.png` | [Pixel-boy](https://twitter.com/2pblog1) (Ninja Adventure) | [sparklinlabs/superpowers-asset-packs](https://github.com/sparklinlabs/superpowers-asset-packs) → `ninja-adventure/background-elements/tileset.png` | CC0 1.0 — **แก้ไข:** เติมแถวล่าง 1 แถว ช่องแรกเป็นทรายสีเรียบ |
| `client/public/assets/ninja-adventure/characters/{3,6,9,12,13,14,17,25}.png` | Pixel-boy (Ninja Adventure) | repo เดียวกัน → `ninja-adventure/characters/` | CC0 1.0 (ไม่แก้ไข) |

| `client/public/assets/ninja-adventure/items/{axe,beaf,hammer,heart,tea-leaf,water-pot,yakitori}.png` | Pixel-boy (Ninja Adventure) | repo เดียวกัน → `ninja-adventure/items/` และ `items/food/` | CC0 1.0 (ไม่แก้ไข) |
| `client/public/assets/ninja-adventure/items/lance.png` (ไอคอนหอก) | Pixel-boy (Ninja Adventure) | repo เดียวกัน → `ninja-adventure/weapons/lance.png` | CC0 1.0 (ไม่แก้ไข) |

**ภาพที่ Claude วาดเองด้วยตัวอักษรในโค้ด** (ไม่มีไฟล์ภาพ, อยู่ภายใต้ license ของโค้ด): กองไฟ (`client/src/art/campfire.ts`), กำแพง/ประตู/ที่นอน/ถุงของ (`client/src/art/structures.ts`), ไดโนเสาร์ 4 ชนิดและเนื้อดิบ (`client/src/art/dinos.ts`)

## เสียง (Audio)

ยังไม่มี

## ไลบรารี

- [Phaser](https://github.com/phaserjs/phaser) — MIT
- [Colyseus](https://github.com/colyseus/colyseus) — MIT
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — MIT
