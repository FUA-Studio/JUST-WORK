const fs = require('fs'), zlib = require('zlib');
const b = fs.readFileSync('assets/logo/icon.png');
let i = 8; const idats = [];
while (i < b.length) { const len = b.readUInt32BE(i); const type = b.slice(i + 4, i + 8).toString(); if (type === 'IDAT') idats.push(b.slice(i + 8, i + 8 + len)); i += 12 + len; }
const raw = zlib.inflateSync(Buffer.concat(idats));
const W = 512, H = 512;
let opaque = 0, ink = 0, white = 0, amber = 0, other = 0;
for (let y = 0; y < H; y++) {
  const row = y * (1 + W * 4) + 1;
  for (let x = 0; x < W; x++) {
    const o = row + x * 4;
    const px = raw[o + 3];
    if (px > 200) {
      opaque++;
      const r = raw[o], g = raw[o + 1], bl = raw[o + 2];
      if (r > 240 && g > 240 && bl > 240) white++;
      else if (r > 220 && g > 150 && bl < 110) amber++;
      else ink++;
    }
  }
}
console.log('opaque:', opaque, 'of', W * H);
console.log('  white(J):', white, ' ink(tile):', ink, ' amber(dot):', amber);
console.log(opaque > 40000 ? 'PASS: icon has content' : 'WARN: icon looks sparse');
