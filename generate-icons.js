// Generates 512x512 solid-colour placeholder PNGs for each Ideal.
// Run with: node generate-icons.js
// No npm packages required — uses only Node built-ins (zlib).

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 (required by PNG spec) ────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk builder ────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  const crcBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── Solid-colour PNG ─────────────────────────────────────────────────────────

function makeSolidPNG(size, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // colour type: RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace: none

  // Raw image data: one filter byte (0 = None) per row, then RGB pixels
  const row    = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter: None
  for (let x = 0; x < size; x++) {
    row[1 + x * 3]     = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array(size).fill(row));
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ── Ideal definitions ────────────────────────────────────────────────────────

const IDEALS = [
  { id: 'wisdom',       color: '#1a4a8a' },
  { id: 'courage',      color: '#c0392b' },
  { id: 'justice',      color: '#d4a017' },
  { id: 'temperance',   color: '#7a9a6a' },
  { id: 'compassion',   color: '#d45f8a' },
  { id: 'humility',     color: '#a0845c' },
  { id: 'truth',        color: '#8a9aaa' },
  { id: 'honor',        color: '#5a2a8a' },
  { id: 'perseverance', color: '#c06a20' },
  { id: 'serenity',     color: '#5aaad4' },
  { id: 'gratitude',    color: '#c8b040' },
  { id: 'fortitude',    color: '#6a7a8a' },
];

// ── Generate ─────────────────────────────────────────────────────────────────

const OUT_DIR = path.join(__dirname, 'client', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const ideal of IDEALS) {
  const { r, g, b } = hexToRgb(ideal.color);
  const png  = makeSolidPNG(512, r, g, b);
  const file = path.join(OUT_DIR, `ideal_${ideal.id}.png`);
  fs.writeFileSync(file, png);
  console.log(`  ${ideal.id}.png  (${png.length} bytes)`);
}

console.log(`\nGenerated ${IDEALS.length} icons in ${OUT_DIR}`);
