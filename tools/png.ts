// Минимальный PNG-кодировщик (RGBA) без зависимостей — для листа графики и иконок приложения.
import { deflateSync } from 'node:zlib';

const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const td = Buffer.concat([Buffer.from(t), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([l, td, c]);
};

/** rgba — W*H*4 байт. */
export function encodePng(W: number, H: number, rgba: Buffer): Buffer {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let r = 0; r < H; r++) { raw[r * (W * 4 + 1)] = 0; rgba.copy(raw, r * (W * 4 + 1) + 1, r * W * 4, (r + 1) * W * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export const hexRgb = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
