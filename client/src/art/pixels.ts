/**
 * แปลง "ภาพพิกเซลแบบตัวอักษร" เป็นรายการสี
 * แต่ละตัวอักษร = 1 พิกเซล, `.` = โปร่งใส, ตัวอื่นต้องมีใน palette
 * ไฟล์นี้ไม่แตะ Phaser เลย จึงเทสต์ได้ง่าย
 */
export interface PixelArt {
  width: number;
  height: number;
  /** เรียงแถวต่อแถว index = y * width + x; null = โปร่งใส */
  pixels: (string | null)[];
}

export function parsePixelArt(rows: string[], palette: Record<string, string>): PixelArt {
  const width = rows[0]?.length ?? 0;
  const pixels: (string | null)[] = [];

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`row ${y} has width ${row.length}, expected width ${width}`);
    }
    for (const ch of row) {
      if (ch === ".") {
        pixels.push(null);
        continue;
      }
      const colour = palette[ch];
      if (colour === undefined) throw new Error(`unknown pixel character "${ch}" in row ${y}`);
      pixels.push(colour);
    }
  });

  return { width, height: rows.length, pixels };
}
