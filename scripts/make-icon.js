// JUST WORK · icon generator — zero dependencies (Node built-in zlib only).
// Light rounded card + clear stroked "J" + subtle border + amber "live" dot,
// rasterized at 512x512 with 4x supersampling, then PNG written by hand.
//   run: node scripts/make-icon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const SS = 4;

// palette (light theme)
const LIGHT_TOP = [251, 252, 255];
const LIGHT_BOT = [237, 240, 247];
const BORDER = [214, 220, 233];
const INK = [27, 33, 48];
const AMBER = [245, 184, 65];
const lerp = (a, b, t) => Math.round(a + (b - a) * t);

// clear stroked "J" as a polyline (128 logical space)
const J = [
  [62, 34], [62, 74], [47, 88], [35, 82]
];
const J_W = 13;            // stroke width
const DOT = { cx: 98, cy: 36, r: 7.5 };
// rounded tile SDF params (center 64, half 54, radius 30)
const T = { cx: 64, cy: 64, half: 54, rad: 30 };

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function inJ(lx, ly) {
  const h = J_W / 2 + 0.5; // half stroke + small AA margin
  for (let i = 0; i < J.length - 1; i++) {
    if (segDist(lx, ly, J[i][0], J[i][1], J[i + 1][0], J[i + 1][1]) <= h) return true;
  }
  return false;
}
function tileSDF(lx, ly) {
  const dx = Math.abs(lx - T.cx) - (T.half - T.rad);
  const dy = Math.abs(ly - T.cy) - (T.half - T.rad);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - T.rad;
}
function sample(lx, ly) {
  const d = tileSDF(lx, ly);
  if (inJ(lx, ly)) return { rgb: INK, a: 1 };
  if ((lx - DOT.cx) ** 2 + (ly - DOT.cy) ** 2 <= DOT.r * DOT.r) return { rgb: AMBER, a: 1 };
  if (d <= 0) {
    const t = Math.max(0, Math.min(1, (ly - 10) / 108));
    const base = [lerp(LIGHT_TOP[0], LIGHT_BOT[0], t), lerp(LIGHT_TOP[1], LIGHT_BOT[1], t), lerp(LIGHT_TOP[2], LIGHT_BOT[2], t)];
    const edge = d > -3.2; // inner border ring
    return { rgb: edge ? BORDER : base, a: 1 };
  }
  return null;
}

function buildPixels() {
  const buf = new Uint8Array(SIZE * SIZE * 4);
  const scale = SIZE / 128;
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let gy = 0; gy < SS; gy++) {
        for (let gx = 0; gx < SS; gx++) {
          const fx = (px + (gx + 0.5) / SS) / scale;
          const fy = (py + (gy + 0.5) / SS) / scale;
          const s = sample(fx, fy);
          if (s) { r += s.rgb[0]; g += s.rgb[1]; b += s.rgb[2]; n++; }
        }
      }
      const i = (py * SIZE + px) * 4;
      if (n === 0) { buf[i + 3] = 0; continue; }
      buf[i] = Math.round(r / n); buf[i + 1] = Math.round(g / n); buf[i + 2] = Math.round(b / n);
      buf[i + 3] = Math.round((n / (SS * SS)) * 255);
    }
  }
  return buf;
}

// CRC32 + PNG encoder
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(data) { let c = 0xffffffff; for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, 'ascii'); const body = Buffer.concat([t, data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); }
function encodePng(rgba) {
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) { raw[y * (1 + SIZE * 4)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * SIZE * 4, SIZE * 4).copy(raw, y * (1 + SIZE * 4) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const out = path.join(__dirname, '..', 'assets', 'logo', 'icon.png');
fs.writeFileSync(out, encodePng(buildPixels()));
console.log('  wrote', out, fs.statSync(out).size, 'bytes (light card + clear J)');
