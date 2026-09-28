// Plate engine: the homonin DitherCanvas look, rendered offline.
// Everything is drawn into an indexed framebuffer (one byte per pixel,
// values index PALETTE), then written out as PNG or animated GIF.

const PALETTE = [
  [0x00, 0x00, 0x00], // 0 bg0      absolute black ground
  [0xe8, 0xe2, 0xd9], // 1 text     bone ink
  [0xf9, 0x7f, 0x3a], // 2 accent   homonin orange
  [0x7a, 0x72, 0x69], // 3 text-mut secondary type
  [0x33, 0x2d, 0x28], // 4 line-hard hairlines
  [0xb5, 0xac, 0x9f], // 5 text-dim
  [0x1a, 0x0f, 0x07], // 6 accent-ink
  [0x4a, 0x45, 0x41], // 7 text-faint
];
const C = { BG: 0, INK: 1, ACC: 2, MUT: 3, LINE: 4, DIM: 5, AINK: 6, FAINT: 7 };

// 8x8 Bayer ordered-dither matrix, same table as DitherCanvas.tsx / dither.py
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const bayer = (x, y) => (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;

const loadImg = (src) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error('load ' + src));
  im.src = src;
});

class Frame {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8Array(w * h); }
  clone() { const f = new Frame(this.w, this.h); f.px.set(this.px); return f; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  get(x, y) { return this.px[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  // Stamp a 2D canvas: every pixel whose alpha passes `cut` becomes colour c.
  stamp(cv, c, ox = 0, oy = 0, cut = 110) {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > cut) this.set(ox + x, oy + y, c);
    }
  }
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Luminance field of an image fitted into a w x h box (cell units).
// fit: 'contain' | 'cover'; alpha-composited onto black.
function lumField(img, w, h, { fit = 'contain', invert = false, crop = null } = {}) {
  const cv = canvas(w, h), g = cv.getContext('2d');
  g.fillStyle = invert ? '#fff' : '#000'; g.fillRect(0, 0, w, h);
  let [sx, sy, sw, sh] = crop || [0, 0, img.width, img.height];
  const s = fit === 'cover' ? Math.max(w / sw, h / sh) : Math.min(w / sw, h / sh);
  const dw = sw * s, dh = sh * s;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const v = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    L[i] = invert ? 1 - v : v;
  }
  return L;
}

// PIL-style autocontrast: clip `cut` of each tail, stretch the rest.
function autocontrast(L, cut = 0.01) {
  const hist = new Uint32Array(256);
  for (const v of L) hist[Math.max(0, Math.min(255, (v * 255) | 0))]++;
  const n = L.length * cut; let lo = 0, hi = 255, a = 0;
  for (; lo < 255; lo++) { a += hist[lo]; if (a > n) break; }
  a = 0; for (; hi > 0; hi--) { a += hist[hi]; if (a > n) break; }
  const l = lo / 255, h = Math.max(hi / 255, l + 0.01);
  for (let i = 0; i < L.length; i++) L[i] = Math.max(0, Math.min(1, (L[i] - l) / (h - l)));
  return L;
}

// Dither a luminance field (lw x lh cells) into the frame at (ox, oy),
// each cell drawn as scale x scale pixels. mod(x, y, v) may reshape v.
function ditherInto(f, L, lw, lh, ox, oy, scale, { ink = C.INK, gamma = 1, gain = 1, mod = null, bgc = null } = {}) {
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    let v = Math.pow(L[y * lw + x], gamma) * gain;
    if (mod) v = mod(x, y, v);
    const on = v > bayer(x, y);
    if (!on && bgc === null) continue;
    const c = on ? ink : bgc;
    for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) f.set(ox + x * scale + i, oy + y * scale + j, c);
  }
}

// Text on a scratch canvas, stamped crisp. font like "72px FreeSerif".
function text(f, str, x, y, font, c, { align = 'left', track = 0, base = 'alphabetic', cut = 110 } = {}) {
  const probe = canvas(8, 8).getContext('2d'); probe.font = font;
  const chars = [...str];
  const widths = chars.map((ch) => probe.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  const m = probe.measureText('Hg'), asc = Math.ceil(m.actualBoundingBoxAscent) + 4, desc = Math.ceil(m.actualBoundingBoxDescent) + 4;
  const cv = canvas(Math.ceil(total) + 8, asc + desc), g = cv.getContext('2d');
  g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  let cx = 4; chars.forEach((ch, i) => { g.fillText(ch, cx, asc); cx += widths[i] + track; });
  const ox = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  f.stamp(cv, c, Math.round(ox - 4), Math.round(y - asc), cut);
  return total;
}

// Text whose fill is a dithered vertical ramp: solid at the top, dissolving downward.
function ditherText(f, str, x, y, font, c, { track = 0, from = 1.0, to = 0.25, scale = 2, align = 'left' } = {}) {
  const probe = canvas(8, 8).getContext('2d'); probe.font = font;
  const chars = [...str]; const widths = chars.map((ch) => probe.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  const m = probe.measureText('H'), asc = Math.ceil(m.actualBoundingBoxAscent);
  const cv = canvas(Math.ceil(total) + 8, asc + 8), g = cv.getContext('2d');
  g.font = font; g.fillStyle = '#fff';
  let cx = 4; chars.forEach((ch, i) => { g.fillText(ch, cx, asc + 2); cx += widths[i] + track; });
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  const ox = Math.round((align === 'center' ? x - total / 2 : align === 'right' ? x - total : x) - 4), oy = Math.round(y - asc - 2);
  for (let py = 0; py < cv.height; py++) {
    const t = py / (asc + 2), ramp = from + (to - from) * Math.max(0, Math.min(1, t));
    for (let px = 0; px < cv.width; px++) {
      if (d[(py * cv.width + px) * 4 + 3] < 110) continue;
      const X = ox + px, Y = oy + py;
      if (ramp > bayer((X / scale) | 0, (Y / scale) | 0)) f.set(X, Y, c);
    }
  }
  return total;
}

// Hairline primitives (1px, optionally dashed)
function line(f, x0, y0, x1, y1, c, { dash = 0, gap = 0, w = 1 } = {}) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) {
    if (dash && (i % (dash + gap)) >= dash) continue;
    const x = Math.round(x0 + dx * i / n), y = Math.round(y0 + dy * i / n);
    for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) f.set(x + a, y + b, c);
  }
}
function polyline(f, pts, c, o) { for (let i = 1; i < pts.length; i++) line(f, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, o); }
function box(f, x, y, w, h, c, o) { polyline(f, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], c, o); }
function circle(f, cx, cy, r, c, { dash = 0, gap = 0, w = 1 } = {}) {
  const n = Math.ceil(2 * Math.PI * r);
  for (let i = 0; i < n; i++) {
    if (dash && (i % (dash + gap)) >= dash) continue;
    const t = i / n * Math.PI * 2;
    for (let a = 0; a < w; a++) f.set(Math.round(cx + (r - a) * Math.cos(t)), Math.round(cy + (r - a) * Math.sin(t)), c);
  }
}
function disc(f, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) f.set(cx + x, cy + y, c);
}
// Registration cross, the print-shop mark used on every homonin plate.
function regmark(f, x, y, r, c) { line(f, x - r, y, x + r, y, c); line(f, x, y - r, x, y + r, c); circle(f, x, y, Math.round(r * 0.55), c); }
function arrowhead(f, x, y, ang, s, c) {
  for (const d of [-0.5, 0.5]) line(f, x, y, x - s * Math.cos(ang + d), y - s * Math.sin(ang + d), c, { w: 2 });
}

// ---------- glyphs ----------
// The homonin glyph grid: 24x24 one-bit pixel icons (media/dev/glyphs,
// media/ethics/glyphs). Loaded from their <rect> SVGs, or drawn here with
// the same pixel primitives, then stamped at an integer scale.
function makeGlyph(draw) {
  const bits = new Uint8Array(576);
  const G = {
    set(x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 24 && y < 24) bits[y * 24 + x] = 1; },
    line(x0, y0, x1, y1) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) G.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); },
    ring(cx, cy, r) { const n = Math.ceil(2 * Math.PI * r * 2); for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; G.set(cx + r * Math.cos(t), cy + r * Math.sin(t)); } },
    disc(cx, cy, r) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) G.set(cx + x, cy + y); },
    rect(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) G.set(i, j); },
  };
  draw(G);
  return { bits };
}
async function loadGlyph(url) {
  const t = await (await fetch(url)).text();
  return makeGlyph((G) => { for (const m of t.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) G.rect(+m[1], +m[2], +m[3], +m[4]); });
}
// stamp a glyph at scale k; `half` renders it at 50% (the checker of the twin)
function glyph(f, g, x, y, k, c, { half = false } = {}) {
  for (let gy = 0; gy < 24; gy++) for (let gx = 0; gx < 24; gx++) {
    if (!g.bits[gy * 24 + gx] || (half && (gx + gy) % 2)) continue;
    f.rect(Math.round(x + gx * k), Math.round(y + gy * k), k, k, c);
  }
}

// ---------- output ----------
function toPNG(f) {
  const cv = canvas(f.w, f.h), g = cv.getContext('2d'), id = g.createImageData(f.w, f.h);
  for (let i = 0; i < f.px.length; i++) { const p = PALETTE[f.px[i]]; id.data.set([p[0], p[1], p[2], 255], i * 4); }
  g.putImageData(id, 0, 0);
  return cv.toDataURL('image/png');
}

// Minimal GIF89a encoder: 16-slot global table (PALETTE + padding), looping,
// per-frame delay. After the first frame only the changed bounding box is
// written, and pixels that match the previous frame are sent as the
// transparent index, so static artwork costs almost nothing per frame.
const TRANSPARENT = 15;
function encodeGIF(frames, delays) {
  const out = [];
  const b = (...v) => { for (const x of v) out.push(x); }, w16 = (v) => b(v & 255, (v >> 8) & 255);
  const W = frames[0].w, H = frames[0].h;
  b(...[...'GIF89a'].map((c) => c.charCodeAt(0)));
  w16(W); w16(H); b(0xf3, 0, 0); // GCT flag, 16 entries
  for (let i = 0; i < 16; i++) b(...(PALETTE[i] || [0, 0, 0]));
  b(0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  let prev = null;
  frames.forEach((fr, k) => {
    let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    if (prev) {
      x0 = W; y0 = H; x1 = -1; y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (fr.px[i] !== prev.px[i]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
    }
    const d = Math.round((delays[k] ?? delays[0]) / 10);
    // disposal 1 (keep), transparency flag on for every frame after the first
    b(0x21, 0xf9, 4, prev ? 0x05 : 0x04, d & 255, (d >> 8) & 255, TRANSPARENT, 0);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    b(0x2c); w16(x0); w16(y0); w16(w); w16(h); b(0);
    const idx = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y0 + y) * W + x0 + x;
      idx[y * w + x] = prev && fr.px[i] === prev.px[i] ? TRANSPARENT : fr.px[i];
    }
    lzw(idx, 4, out);
    prev = fr;
  });
  b(0x3b);
  return new Uint8Array(out);
}
function lzw(idx, minCode, out) {
  out.push(minCode);
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1, next = eoi + 1, dict = new Map();
  let bits = 0, acc = 0; const bytes = [];
  const emit = (code) => { acc |= code << bits; bits += size; while (bits >= 8) { bytes.push(acc & 255); acc >>>= 8; bits -= 8; } };
  emit(clear);
  let cur = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = cur * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { cur = hit; continue; }
    emit(cur);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; }
    cur = k;
  }
  emit(cur); emit(eoi);
  if (bits > 0) bytes.push(acc & 255);
  for (let i = 0; i < bytes.length; i += 255) { const blk = bytes.slice(i, i + 255); out.push(blk.length); for (const x of blk) out.push(x); }
  out.push(0);
}
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
