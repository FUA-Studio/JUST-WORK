// JUST WORK · icon generator — zero dependencies (Node built-in zlib only).
// Rasterizes the brand mark (ink tile + white J + amber "live" dot) at 512x512
// with 4x supersampling anti-aliasing, then writes a PNG by hand.
//   run: node scripts/make-icon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const SS = 4; // supersample factor

// ---- color helpers ----
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
function inkAt(ly) {
  const t = Math.max(0, Math.min(1, (ly - 10) / 108));
  return [lerp(38, 20, t), lerp(44, 24, t), lerp(61, 36, t)]; // #262c3d -> #141824
}
const WHITE = [255, 255, 255];
const AMBER = [245, 184, 65];

// ---- geometry (128 logical space) ----
const JRECTS = [
  [28, 34, 64, 16], // top bar
  [56, 34, 24, 66], // stem
  [40, 84, 40, 16], // hook bottom-right
  [32, 66, 24, 34]  // hook bottom-left
];
const DOT = { cx: 100, cy: 36, r: 7 };

function sample(lx, ly) {
  // rounded tile SDF (center 64, half 54, radius 30)
  const dx = Math.abs(lx - 64) - 24;
  const dy = Math.abs(ly - 64) - 24;
  const dist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - 30;
  const inJ = JRECTS.some(([x0, y0, w, h]) => lx >= x0 && lx <= x0 + w && ly >= y0 && ly <= y0 + h);
  const inDot = (lx - DOT.cx) ** 2 + (ly - DOT.cy) ** 2 <= DOT.r * DOT.r;
  if (dist > 0 && !inJ && !inDot) return null; // fully outside
  if (inJ) return { rgb: WHITE, a: 1 };
  if (inDot) return { rgb: AMBER, a: 1 };
  return { rgb: inkAt(ly), a: dist <= 0 ? 1 : 0.5 }; // tile ink (edge AA handled by SS)
}

// ---- rasterize ----
function buildPixels() {
  const buf = new Uint8Array(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let gy = 0; gy < SS; gy++) {
        for (let gx = 0; gx < SS; gx++) {
          const fx = px + (gx + 0.5) / SS;
          const fy = py + (gy + 0.5) / SS;
          const s = sample(fx / (SIZE / 128), fy / (SIZE / 128));
          if (s) { r += s.rgb[0]; g += s.rgb[1]; b += s.rgb[2]; n++; }
        }
      }
      const i = (py * SIZE + px) * 4;
      if (n === 0) { buf[i + 3] = 0; continue; }
      buf[i] = Math.round(r / n);
      buf[i + 1] = Math.round(g / n);
      buf[i + 2] = Math.round(b / n);
      buf[i + 3] = Math.round((n / (SS * SS)) * 255);
    }
  }
  return buf;
}

// ---- CRC32 ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba) {
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (1 + SIZE * 4)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * SIZE * 4, SIZE * 4).copy(raw, y * (1 + SIZE * 4) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const out = path.join(__dirname, '..', 'assets', 'logo', 'icon.png');
const png = encodePng(buildPixels());
fs.writeFileSync(out, png);
console.log('  wrote', out, png.length, 'bytes');
