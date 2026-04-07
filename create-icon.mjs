// Generate a simple 24x24 pixel book icon as a BMP for Even Hub
// White pixels on black background

const WIDTH = 24;
const HEIGHT = 24;

// 0 = black, 1 = white
const icon = [
  "000000000000000000000000",
  "000000000000000000000000",
  "000111111101111111100000",
  "000111111101111111100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000111111101111111100000",
  "000111111101111111100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000111111101111111100000",
  "000111111101111111100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000110000101000011100000",
  "000111111101111111100000",
  "000111111101111111100000",
  "000111111111111111100000",
  "000111111111111111100000",
  "000000000000000000000000",
  "000000000000000000000000",
];

// Create BMP file (24-bit, bottom-up)
const rowSize = Math.ceil((WIDTH * 3) / 4) * 4; // Row size must be multiple of 4
const pixelDataSize = rowSize * HEIGHT;
const fileSize = 54 + pixelDataSize;
const buf = Buffer.alloc(fileSize);

// BMP Header
buf.write('BM', 0);
buf.writeUInt32LE(fileSize, 2);
buf.writeUInt32LE(0, 6);
buf.writeUInt32LE(54, 10);

// DIB Header
buf.writeUInt32LE(40, 14);
buf.writeInt32LE(WIDTH, 18);
buf.writeInt32LE(HEIGHT, 22);
buf.writeUInt16LE(1, 26);
buf.writeUInt16LE(24, 28);
buf.writeUInt32LE(0, 30);
buf.writeUInt32LE(pixelDataSize, 34);
buf.writeInt32LE(2835, 38);
buf.writeInt32LE(2835, 42);
buf.writeUInt32LE(0, 46);
buf.writeUInt32LE(0, 50);

// Pixel data (bottom-up)
for (let y = HEIGHT - 1; y >= 0; y--) {
  const row = icon[y];
  const rowOffset = 54 + (HEIGHT - 1 - y) * rowSize;
  for (let x = 0; x < WIDTH; x++) {
    const val = row[x] === '1' ? 255 : 0;
    const offset = rowOffset + x * 3;
    buf[offset] = val;     // B
    buf[offset + 1] = val; // G
    buf[offset + 2] = val; // R
  }
}

import { writeFileSync } from 'fs';
writeFileSync('icon.bmp', buf);
console.log('Created icon.bmp (24x24 open book icon)');
