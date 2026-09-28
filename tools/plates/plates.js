// Plate definitions for the a12n4v profile.
// Language: 1-bit Bayer dither (homonin DitherCanvas), neoclassical engraving
// plates, semiotic captions, cybernetic loops. Each plate returns
// { frames: Frame[], delays: ms[] }.

const SERIF = 'FreeSerif';
const MONO = 'Unifont';
const M = (p) => 'http://plates.local/media/' + p;

// Plate chrome shared by every image: double rule and corner registration
// marks. The plate number and title in the engraver's margin are off by
// default (the profile shows the plates unlabelled); set LABELS to bring them back.
const LABELS = false;
function chrome(f, { no, title, right = '' }) {
  box(f, 16, 16, f.w - 33, f.h - 33, C.LINE);
  box(f, 22, 22, f.w - 45, f.h - 45, C.FAINT);
  for (const [x, y] of [[22, 22], [f.w - 23, 22], [22, f.h - 23], [f.w - 23, f.h - 23]]) regmark(f, x, y, 9, C.ACC);
  if (!LABELS) return;
  if (no) text(f, no, 48, 58, `32px ${MONO}`, C.ACC);
  if (title) text(f, title, 48 + (no ? [...no].length * 16 + 24 : 0), 58, `32px ${MONO}`, C.MUT, { track: 2 });
  if (right) text(f, right, f.w - 48, 58, `32px ${MONO}`, C.FAINT, { align: 'right', track: 2 });
}

// A dithered plate from source art: fit into (x, y, w, h), cell scale s,
// dissolving toward the edges of an ellipse (the homonin 'radial-bloom').
async function plate(f, src, x, y, w, h, { s = 2, invert = false, ac = true, gamma = 1, gain = 1, bloom = 0.62, fit = 'contain', crop = null, mod = null, ink = C.INK } = {}) {
  const img = await loadImg(M(src));
  const lw = Math.round(w / s), lh = Math.round(h / s);
  const L = lumField(img, lw, lh, { fit, invert, crop });
  if (ac) autocontrast(L, 0.01);
  ditherInto(f, L, lw, lh, x, y, s, {
    gamma, gain, ink,
    mod: (cx, cy, v) => {
      if (bloom) {
        const dx = (cx / lw - 0.5) * 2, dy = (cy / lh - 0.5) * 2, r = Math.sqrt(dx * dx + dy * dy);
        v *= Math.max(0, Math.min(1, (1 - r) / (1 - bloom) + 0.0));
      }
      return mod ? mod(cx, cy, v) : v;
    },
  });
  return { L, lw, lh };
}

const PLATES = {};
// ---------------------------------------------------------------------------
// II. SYSTEMA VIABILE: Stafford Beer's Viable System Model with Homonin as the
// hub. Every system reports in (bone), Homonin integrates, and feedback goes
// back out to every element (orange).
function amoeba(cx, cy, R) {
  return (t) => R * (1 + 0.07 * Math.sin(3 * t + 0.6) + 0.05 * Math.sin(5 * t + 2.1) + 0.035 * Math.sin(8 * t + 0.3));
}
function vnoise(x, y) {
  return 0.5 + 0.25 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2.2) * Math.cos(y * 0.09 - x * 0.03) + 0.25 * Math.sin((x + y) * 0.05 + Math.cos(x * 0.04) * 1.7);
}
// point at fraction u (0..1) along a polyline, by arc length
function pathAt(path) {
  const segs = []; let total = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(l); total += l; }
  return (u) => {
    let d = (((u % 1) + 1) % 1) * total;
    for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const t = segs[i] ? d / segs[i] : 0; return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]; } d -= segs[i]; }
    return path[path.length - 1];
  };
}
// point at fraction u (0..1) along a straight segment
const seg = (a, b) => (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
// a signal dot with a fading trail; trail points outside 0..1 are dropped
function trail(f, at, u, c, n = 6, step = 0.035) {
  for (let t = n - 1; t >= 0; t--) {
    const v = u - t * step; if (v < 0 || v > 1) continue;
    const [x, y] = at(v); disc(f, Math.round(x), Math.round(y), t === 0 ? 5 : Math.max(1, 4 - t), c);
  }
}
// a line with a sine wobble across it: the coupling to the environment
function wavy(f, a, b, c, amp = 5, per = 9) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, pts = [];
  for (let d = 0; d <= L; d++) { const w = amp * Math.sin(d / per); pts.push([a[0] + ux * d - uy * w, a[1] + uy * d + ux * w]); }
  polyline(f, pts, c);
  return pts;
}

PLATES['a12n4v-systema'] = async () => {
  const W = 1600, H = 1000, base = new Frame(W, H);
  chrome(base, { no: 'II', title: 'SYSTEMA VIABILE · AFTER STAFFORD BEER', right: 'BRAIN OF THE FIRM, 1972' });

  // environment: an amoeba holding the astrolabe (the world, as the ancients drew it)
  const ecx = 290, ecy = 680, ER = 158, r = amoeba(ecx, ecy, ER);
  const inside = (x, y) => { const dx = x - ecx, dy = y - ecy; return Math.hypot(dx, dy) < r(Math.atan2(dy, dx)); };
  const img = await loadImg(M('threshold/astrolabe.png'));
  const s = 2, ew = 300, lw = ew / s, ox = ecx - ew / 2, oy = ecy - ew / 2;
  const L = autocontrast(lumField(img, lw, lw, {}), 0.01);
  ditherInto(base, L, lw, lw, ox, oy, s, {
    ink: C.DIM,
    mod: (cx, cy, v) => {
      const X = ox + cx * s, Y = oy + cy * s; if (!inside(X, Y)) return 0;
      const dx = X - ecx, dy = Y - ecy, e = Math.hypot(dx, dy) / r(Math.atan2(dy, dx));
      return v * 0.75 * Math.min(1, (1 - e) / 0.25);
    },
  });
  for (let Y = ecy - 220; Y < ecy + 220; Y += s) for (let X = ecx - 220; X < ecx + 220; X += s) {
    if (!inside(X, Y) || base.get(X, Y) !== C.BG) continue;
    if (0.12 * vnoise(X, Y) > bayer(X / s | 0, Y / s | 0)) base.rect(X, Y, s, s, C.FAINT);
  }
  const outline = [];
  for (let i = 0; i <= 720; i++) { const t = i / 720 * Math.PI * 2; outline.push([ecx + r(t) * Math.cos(t), ecy + r(t) * Math.sin(t)]); }
  polyline(base, outline, C.INK);
  const ept = (t) => [ecx + r(t) * Math.cos(t), ecy + r(t) * Math.sin(t)];
  text(base, 'ENVIRONMENT', ecx, 902, `32px ${MONO}`, C.INK, { align: 'center', track: 3 });
  text(base, 'patients · clinics · the literature', ecx, 940, `italic 28px ${SERIF}`, C.MUT, { align: 'center' });

  // the hub: Homonin, drawn as the mirror-twin medallion
  const hx = 800, hy = 540, HR = 120, RIM = 150;
  const hub = await loadImg(M('sigils/SEC-S04.png'));
  const hw = 240 / s, HL = autocontrast(lumField(hub, hw, hw, {}), 0.01);
  ditherInto(base, HL, hw, hw, hx - 120, hy - 120, s, {
    gamma: 1.2,
    mod: (cx, cy, v) => { const q = Math.hypot(cx - hw / 2, cy - hw / 2) / (hw / 2); return q > 0.94 ? 0 : v * Math.min(1, (0.94 - q) / 0.2); },
  });
  circle(base, hx, hy, HR, C.INK); circle(base, hx, hy, HR + 7, C.LINE);
  circle(base, hx, hy, RIM - 12, C.FAINT, { dash: 2, gap: 5 });
  ditherText(base, 'HOMONIN', 772, 764, `54px ${SERIF}`, C.INK, { track: 6, from: 1, to: 0.5, align: 'right' });
  text(base, 'a cyber-medical', 770, 802, `italic 28px ${SERIF}`, C.DIM, { align: 'right' });
  text(base, 'research workspace', 770, 834, `italic 28px ${SERIF}`, C.DIM, { align: 'right' });

  // the systems around it
  const bw = 440, bh = 84;
  const nodes = [
    { k: 'S5', name: 'POLICY', note: 'identity: medicine is a control problem', x: 580, y: 96, a: [800, 96 + bh] },
    { k: 'S4', name: 'INTELLIGENCE', note: 'the outside and then: twins, in silico trials', x: 60, y: 200, a: [430, 284] },
    { k: 'S3', name: 'CONTROL', note: 'the inside and now: credibility, V&V', x: 1100, y: 200, a: [1170, 284] },
    { k: 'S2', name: 'COORDINATION', note: 'DICOM · FHIR · SBML', x: 1100, y: 498, a: [1100, 540] },
    { k: 'S1', name: 'MODELS', note: 'neural systems, adaptive AI', x: 1100, y: 796, a: [1100, 838] },
    { k: 'S1', name: 'RESEARCH', note: 'mapping the biodigital twin field', x: 580, y: 860, a: [800, 860] },
  ];
  nodes.forEach((n, i) => {
    box(base, n.x, n.y, bw, bh, C.INK);
    if (i === 0) box(base, n.x + 5, n.y + 5, bw - 10, bh - 10, C.LINE);
    text(base, n.k, n.x + 20, n.y + 38, `32px ${MONO}`, C.ACC);
    text(base, n.name, n.x + 72, n.y + 38, `32px ${MONO}`, C.INK, { track: 2 });
    text(base, n.note, n.x + 20, n.y + 70, `italic 26px ${SERIF}`, C.DIM);
  });
  const et = Math.atan2(hy - ecy, hx - ecx);
  const elements = [...nodes.map((n) => n.a), ept(et)];

  // Beer's own wiring, kept faint around the edge
  const [S5, S4, S3, S2, S1m, S1r] = nodes;
  // (each path is kept so signals can run along it)
  const wires = [];
  const wire = (pts, c = C.MUT, o) => { polyline(base, pts, c, o); wires.push(pathAt(pts)); return pts; };
  wire([[S5.x, S5.y + 42], [280, S5.y + 42], [280, S4.y]]);
  wire([[S5.x + bw, S5.y + 42], [1320, S5.y + 42], [1320, S3.y]]);
  wire([[1320, S3.y + bh], [1320, S2.y]]);
  const zz = []; for (let y = S2.y + bh, i = 0; y <= S1m.y; y += 12, i++) zz.push([1320 + (i % 2 ? 9 : -9), y]);
  zz[0][0] = 1320; zz[zz.length - 1] = [1320, S1m.y]; wire(zz, C.DIM);
  const top = ept(-Math.PI / 2 - 0.25);
  wire([[230, S4.y + bh], [top[0], top[1] - 6]], C.MUT, { dash: 5, gap: 4 });
  arrowhead(base, top[0], top[1] - 6, Math.atan2(top[1] - S4.y - bh, top[0] - 230), 9, C.MUT);
  wires.push(pathAt(wavy(base, ept(0.75), [S1r.x, S1r.y + 42], C.MUT)));
  // S3-S4 homeostat: the inside-and-now balanced against the outside-and-then
  wire([[S4.x + bw, 236], [S3.x, 236]]); arrowhead(base, S3.x, 236, 0, 9, C.MUT);
  wire([[S3.x, 250], [S4.x + bw, 250]]); arrowhead(base, S4.x + bw, 250, Math.PI, 9, C.MUT);
  text(base, 'HOMEOSTAT', 650, 226, `32px ${MONO}`, C.MUT, { align: 'center', track: 2 });
  // the two operations coordinate directly as well
  wire([[S1r.x + bw, 912], [1210, 912], [1210, S1m.y + bh]]); arrowhead(base, 1210, S1m.y + bh, -Math.PI / 2, 9, C.MUT);

  // every element <-> Homonin: signal in (bone, solid), feedback out (orange, dashed)
  const ins = [], outs = [];
  for (const A of elements) {
    const L = Math.hypot(A[0] - hx, A[1] - hy), ux = (A[0] - hx) / L, uy = (A[1] - hy) / L, nx = -uy * 7, ny = ux * 7;
    const rim = [hx + ux * RIM, hy + uy * RIM], tip = [A[0] - ux * 4, A[1] - uy * 4];
    const inA = [tip[0] + nx, tip[1] + ny], inB = [rim[0] + nx, rim[1] + ny];
    const outA = [rim[0] - nx, rim[1] - ny], outB = [tip[0] - nx, tip[1] - ny];
    line(base, ...inA, ...inB, C.DIM);
    arrowhead(base, inB[0], inB[1], Math.atan2(-uy, -ux), 9, C.DIM);
    line(base, ...outA, ...outB, C.ACC, { dash: 6, gap: 4 });
    arrowhead(base, outB[0], outB[1], Math.atan2(uy, ux), 10, C.ACC);
    ins.push(seg(inA, inB)); outs.push(seg(outA, outB));
  }
  text(base, 'ALGEDONIC', 824, 300, `32px ${MONO}`, C.ACC, { track: 2 });

  // legend
  line(base, 1100, 938, 1150, 938, C.DIM); text(base, 'SIGNAL', 1164, 948, `32px ${MONO}`, C.MUT, { track: 2 });
  line(base, 1330, 938, 1380, 938, C.ACC, { dash: 6, gap: 4 }); text(base, 'FEEDBACK', 1394, 948, `32px ${MONO}`, C.MUT, { track: 2 });

  // animation: gather -> integrate -> feed back
  const frames = [], delays = [], N = 60;
  for (let k = 0; k < N; k++) {
    const f = base.clone(), u = k / N;
    if (u < 0.4) ins.forEach((at) => trail(f, at, u / 0.4, C.INK));
    if (u >= 0.38 && u < 0.56) { circle(f, hx, hy, HR, C.ACC, { w: 2 }); circle(f, hx, hy, HR + 7, C.ACC); circle(f, hx, hy, RIM - 12, C.ACC, { dash: 2, gap: 5 }); }
    if (u >= 0.54 && u < 0.94) outs.forEach((at) => trail(f, at, (u - 0.54) / 0.4, C.ACC));
    if (u >= 0.92) nodes.forEach((n) => box(f, n.x + 3, n.y + 3, bw - 6, bh - 6, C.ACC));
    // Beer's wiring carries its own traffic the whole time
    wires.forEach((at, i) => { const v = (u * 2 + i * 0.29) % 1; const [x, y] = at(v); disc(f, Math.round(x), Math.round(y), 3, C.DIM); });
    frames.push(f); delays.push(u >= 0.38 && u < 0.56 ? 80 : 60);
  }
  return { frames, delays, preview: 48 };
};

// I. PANTHEON: the original profile banner (Athena, Hermes, Asclepius),
// re-struck in the plate system. Wisdom, exchange, medicine.
PLATES['a12n4v-pantheon'] = async () => {
  const W = 1600, H = 520, f = new Frame(W, H);
  chrome(f, { no: 'I', title: 'PANTHEON', right: 'SAPIENTIA · COMMERCIVM · MEDICINA' });
  const img = await loadImg('http://plates.local/src/classical-systems-banner.jpg');
  const s = 2, x = 40, y = 40, w = 1520, h = 440, lw = w / s, lh = h / s;
  const L = autocontrast(lumField(img, lw, lh, { fit: 'cover', crop: [0, 20, 1800, 520] }), 0.01);
  ditherInto(f, L, lw, lh, x, y, s, { gamma: 1.15, mod: (cx, cy, v) => v * Math.max(0, Math.min(1, cy / 12, (lh - cy) / 30, cx / 20, (lw - cx) / 20)) });
  return { frames: [f], delays: [0] };
};

// ---------------------------------------------------------------------------
// Iconography. Homonin's own 24x24 glyphs (src/glyphs, from media/dev and
// media/ethics) plus a few drawn here on the same grid.
const GLYPH = (n) => loadGlyph(`http://plates.local/src/glyphs/${n}.svg`);
function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// outline of a closed shape: inside the outer polygon, outside the inner one
const outlineGlyph = (outer, inner, extra) => makeGlyph((G) => {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (inPoly(outer, x + 0.5, y + 0.5) && !(inner && inPoly(inner, x + 0.5, y + 0.5))) G.set(x, y);
  if (extra) extra(G);
});
const star = (R, r, cx = 12, cy = 12.5) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r : R; return [cx + q * Math.cos(a), cy + q * Math.sin(a)]; });
const flame = (s, cx = 12, cy = 21) => Array.from({ length: 48 }, (_, k) => {
  const t = (k / 48) * Math.PI * 2, x = Math.sin(t), y = -Math.cos(t);
  return [cx + x * 7.5 * s * (y > 0 ? 1 : 1 - 0.75 * y), cy - 7 * s - y * 8.5 * s - (y > 0.3 ? (y - 0.3) * 6 * s : 0)];
});
const ICON = {
  // a body, the mirror, and its twin (the twin is stamped at half density)
  twinA: makeGlyph((G) => {
    G.disc(5, 4, 2); G.rect(4, 7, 3, 8);
    G.line(3, 8, 1, 13); G.line(7, 8, 9, 13); G.line(4, 15, 3, 21); G.line(6, 15, 7, 21);
    for (let y = 0; y < 24; y++) if (y % 3 !== 2) { G.set(11, y); G.set(12, y); }
  }),
  twinB: makeGlyph((G) => {
    G.disc(18, 4, 2); G.rect(17, 7, 3, 8); G.rect(16, 8, 1, 1); G.rect(20, 8, 1, 1);
    G.line(16, 8, 14, 13); G.line(20, 8, 22, 13); G.line(17, 15, 16, 21); G.line(19, 15, 20, 21);
    G.line(15, 8, 13, 13); G.line(21, 8, 23, 13); G.line(18, 15, 17, 21); G.line(18, 15, 19, 21);
  }),
  // the helm: kybernetes, the steersman, root of 'cybernetics'
  helm: makeGlyph((G) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const dx = x - 12, dy = y - 12, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const k = Math.round(a / (Math.PI / 4)), off = r * Math.abs(Math.sin(a - (k * Math.PI) / 4));
      const rim = r >= 6.3 && r <= 7.8, hub = r <= 2.2, spoke = off < 0.5 && r <= 10.5, knob = off < 1.2 && r >= 9.6 && r <= 11.3;
      if (rim || hub || spoke || knob) G.set(x, y);
    }
  }),
  star: outlineGlyph(star(11, 4.6), star(8, 2.6)),
  flame: outlineGlyph(flame(1), flame(0.62, 12, 20.5), (G) => { G.rect(11, 16, 2, 4); G.rect(10, 18, 4, 2); }),
  people: makeGlyph((G) => {
    G.ring(8, 7, 3.2); G.ring(16, 9, 2.8);
    for (let t = Math.PI; t <= 2 * Math.PI + 0.001; t += 0.05) { G.set(8 + 7 * Math.cos(t), 21 + 7.5 * Math.sin(t)); G.set(17 + 5.5 * Math.cos(t), 21 + 6 * Math.sin(t)); }
    G.line(1, 21, 15, 21); G.line(16, 21, 22.5, 21);
  }),
};

// a cubic bezier as a polyline
function bez(p0, p1, p2, p3, n = 80) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  });
}
// an icon tile: double rule, glyph at scale 3
function tile(f, x, y, g, { c = C.INK, half = null } = {}) {
  box(f, x, y, 88, 88, C.MUT); box(f, x + 4, y + 4, 80, 80, C.LINE);
  glyph(f, g, x + 8, y + 8, 3, c);
  if (half) glyph(f, half, x + 8, y + 8, 3, c, { half: true });
}

// ---------------------------------------------------------------------------
// III. FLVXVS: what the body emits, the formats it arrives in, and where it
// goes once Homonin has it. Every outcome feeds back as new signal.
PLATES['a12n4v-flvxvs'] = async () => {
  const W = 1600, H = 960, base = new Frame(W, H);
  chrome(base, { no: 'III', title: 'FLVXVS · FROM SIGNAL TO TWIN', right: 'DATA · FORMATS · FLOWS' });
  const src = [
    ['DEV-D03', 'CARDIAC', 'WFDB · EDF · HL7 aECG'],
    ['DEV-D04', 'NEURAL', 'EDF · BIDS · NWB'],
    ['DEV-D05', 'IMAGING', 'DICOM · NIfTI'],
    ['DEV-D02', 'GENOME', 'FASTQ · BAM · VCF'],
    ['DEV-D01', 'LABS', 'FHIR · LOINC'],
    ['DEV-D08', 'RECORDS', 'FHIR · OMOP · HL7 v2'],
    ['DEV-D06', 'PATHWAYS', 'SBML · CellML · FMU'],
  ];
  const hx = 800, hy = 470, HR = 112;
  const sx = 70, sy = (i) => 100 + i * 110, lanesIn = [];
  for (let i = 0; i < src.length; i++) {
    const [g, name, fmt] = src[i], y = sy(i);
    tile(base, sx, y, await GLYPH(g));
    text(base, name, sx + 112, y + 38, `32px ${MONO}`, C.INK, { track: 2 });
    text(base, fmt, sx + 112, y + 72, `italic 26px ${SERIF}`, C.DIM);
    const a = Math.PI - ((i - 3) / 3) * 0.62, end = [hx + (HR + 26) * Math.cos(a), hy + (HR + 26) * Math.sin(a)];
    const p = bez([470, y + 44], [590, y + 44], [end[0] - 110, end[1]], end);
    polyline(base, p, C.MUT); arrowhead(base, end[0], end[1], Math.atan2(end[1] - p[76][1], end[0] - p[76][0]), 8, C.MUT);
    lanesIn.push(pathAt(p));
  }

  // the hub: the helm, because cybernetics is steering
  circle(base, hx, hy, HR, C.INK); circle(base, hx, hy, HR + 7, C.LINE); circle(base, hx, hy, HR - 8, C.FAINT, { dash: 2, gap: 4 });
  glyph(base, ICON.helm, hx - 75, hy - 75, 6, C.INK);
  ditherText(base, 'HOMONIN', hx, hy + HR + 78, `54px ${SERIF}`, C.INK, { track: 6, from: 1, to: 0.5, align: 'center' });
  text(base, 'ingest · harmonize · model', hx, hy + HR + 116, `italic 28px ${SERIF}`, C.DIM, { align: 'center' });

  const out = [
    [[ICON.twinA, ICON.twinB], 'DIGITAL TWIN', 'a model of one patient'],
    ['DEV-D07', 'THERAPY', 'dosing · in silico trials'],
    ['ETH-G03', 'CARE', 'decisions at the bedside'],
    ['ETH-G04', 'EVIDENCE', 'back into the literature'],
  ];
  const ox = 1110, oy = (j) => 170 + j * 170, lanesOut = [];
  for (let j = 0; j < out.length; j++) {
    const [g, name, note] = out[j], y = oy(j);
    if (Array.isArray(g)) tile(base, ox, y, g[0], { half: g[1] }); else tile(base, ox, y, await GLYPH(g));
    text(base, name, ox + 112, y + 38, `32px ${MONO}`, C.INK, { track: 2 });
    text(base, note, ox + 112, y + 72, `italic 26px ${SERIF}`, C.DIM);
    const a = ((j - 1.5) / 1.5) * 0.5, st = [hx + (HR + 26) * Math.cos(a), hy + (HR + 26) * Math.sin(a)];
    const p = bez(st, [st[0] + 110, st[1]], [ox - 110, y + 44], [ox - 12, y + 44]);
    polyline(base, p, C.DIM); arrowhead(base, ox - 12, y + 44, 0, 9, C.DIM);
    lanesOut.push(pathAt(p));
  }

  // feedback: out of every outcome, down, and back into every source
  const fy = 900, rx = ox + 44, lx = 40;
  const fb = [[rx, oy(3) + 88], [rx, fy], [lx, fy], [lx, sy(0) + 44]];
  for (let j = 0; j < 3; j++) line(base, rx, oy(j) + 92, rx, oy(j + 1) - 4, C.ACC, { dash: 6, gap: 4 });
  polyline(base, fb, C.ACC, { dash: 6, gap: 4 });
  for (let i = 0; i < src.length; i++) { line(base, lx, sy(i) + 44, sx - 12, sy(i) + 44, C.ACC); arrowhead(base, sx - 4, sy(i) + 44, 0, 9, C.ACC); }
  text(base, 'FEEDBACK', 800, fy - 52, `32px ${MONO}`, C.ACC, { align: 'center', track: 3 });
  text(base, 'every outcome becomes a new signal', 800, fy - 16, `italic 26px ${SERIF}`, C.MUT, { align: 'center' });
  const fbAt = pathAt(fb);

  const frames = [], delays = [], N = 60;
  for (let k = 0; k < N; k++) {
    const f = base.clone(), u = k / N;
    lanesIn.forEach((at, i) => { for (const o of [0, 0.5]) { const v = (u + o + i * 0.137) % 1; const [x, y] = at(Math.min(v, 0.999)); disc(f, Math.round(x), Math.round(y), 3, C.INK); } });
    lanesOut.forEach((at, j) => { const v = (u + j * 0.21) % 1; const [x, y] = at(Math.min(v, 0.999)); disc(f, Math.round(x), Math.round(y), 4, C.INK); });
    for (const o of [0, 1 / 3, 2 / 3]) { const [x, y] = fbAt(Math.min((u + o) % 1, 0.999)); disc(f, Math.round(x), Math.round(y), 5, C.ACC); }
    frames.push(f); delays.push(70);
  }
  return { frames, delays, preview: 10 };
};

// ---------------------------------------------------------------------------
// IV. PVLSVS: a live plate. A GitHub Action (.github/workflows/plugins.yml)
// runs fetch-pulse.js and re-renders this daily onto the `output` branch.
// Weekly contributions are drawn as an ECG, the year as a dithered calendar.
PLATES['a12n4v-pvlsvs'] = async () => {
  const d = await (await fetch('http://plates.local/pulse.json')).json();
  const W = 1600, H = 960, base = new Frame(W, H);
  chrome(base, { no: 'IV', title: 'PVLSVS · LIVE FROM GITHUB', right: `@${d.login} · ${d.generated}` });

  // monitor strip: ECG paper, one beat per week
  const x0 = 80, x1 = 1300, top = 100, bot = 340, y0 = 292;
  for (let y = top; y <= bot; y += 16) for (let x = x0 - 16; x <= 1540; x += 16) base.set(x, y, (x - x0) % 80 === 0 && (y - top) % 80 === 0 ? C.MUT : C.LINE);
  const weeks = [];
  for (let i = 0; i < d.days.length; i += 7) weeks.push(d.days.slice(i, i + 7).reduce((a, b) => a + b.c, 0));
  const wk = weeks.slice(-53), max = Math.max(1, ...wk), step = (x1 - x0) / wk.length, tr = [[x0, y0]];
  wk.forEach((c, i) => {
    const X = x0 + i * step, h = c ? 26 + 150 * Math.sqrt(c / max) : 0;
    if (!h) { tr.push([X + step, y0]); return; }
    tr.push([X + step * 0.22, y0], [X + step * 0.3, y0 - 6], [X + step * 0.38, y0], [X + step * 0.46, y0 + 8], [X + step * 0.54, y0 - h], [X + step * 0.62, y0 + 16], [X + step * 0.7, y0], [X + step * 0.82, y0 - 9], [X + step * 0.92, y0], [X + step, y0]);
  });
  // readout
  text(base, 'CONTRIBUTIONS', 1540, 142, `32px ${MONO}`, C.MUT, { align: 'right', track: 1 });
  ditherText(base, String(d.total), 1540, 250, `104px ${SERIF}`, C.INK, { from: 1, to: 0.45, align: 'right' });
  text(base, `past ${wk.length} weeks`, 1540, 296, `italic 28px ${SERIF}`, C.DIM, { align: 'right' });

  // calendar: 7 x 53, dither density by quartile, the busiest days in orange
  const cal = d.days.slice(-7 * 53), nz = cal.map((x) => x.c).filter(Boolean).sort((a, b) => a - b);
  const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] || 1;
  const lev = (c) => (!c ? 0 : c <= q(0.25) ? 1 : c <= q(0.5) ? 2 : c <= q(0.8) ? 3 : 4);
  const pitch = 23, cs = 19, cy0 = 400, first = new Date(cal[0].d + 'T00:00:00Z').getUTCDay();
  const cell = (f, x, y, l) => {
    if (!l) { f.rect(x + 8, y + 8, 3, 3, C.LINE); return; }
    const dens = [0, 0.3, 0.55, 0.8, 1][l];
    for (let j = 0; j < cs; j += 2) for (let i = 0; i < cs; i += 2) if (dens > bayer((x + i) >> 1, (y + j) >> 1)) f.rect(x + i, y + j, 2, 2, l === 4 ? C.ACC : C.INK);
  };
  let lastMonth = -1, lastCol = -9;
  cal.forEach((day, n) => {
    const idx = n + first, col = Math.floor(idx / 7), row = idx % 7, X = x0 + col * pitch, Y = cy0 + row * pitch;
    cell(base, X, Y, lev(day.c));
    const m = +day.d.slice(5, 7);
    if (row === 0 && m !== lastMonth && col - lastCol >= 3 && col < 51) { lastCol = col; text(base, ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1], X, cy0 - 12, `32px ${MONO}`, C.FAINT); lastMonth = m; }
  });
  text(base, 'LESS', 1352, cy0 + 60, `32px ${MONO}`, C.FAINT);
  for (let l = 0; l <= 4; l++) cell(base, 1352 + l * 36, cy0 + 80, l);
  text(base, 'MORE', 1352, cy0 + 150, `32px ${MONO}`, C.FAINT);

  // readings, each with its glyph
  const readings = [
    [await GLYPH('DEV-D03'), d.total, 'CONTRIBUTIONS'],
    [ICON.flame, d.streak, 'DAY STREAK'],
    [ICON.flame, d.longest, 'BEST STREAK'],
    [await GLYPH('DEV-D08'), d.repos, 'REPOSITORIES'],
    [ICON.star, d.stars, 'STARS'],
    [ICON.people, d.followers, 'FOLLOWERS'],
  ];
  line(base, 60, 608, 1540, 608, C.LINE, { dash: 2, gap: 4 });
  readings.forEach(([g, v, label], i) => {
    const X = 70 + i * 247;
    glyph(base, g, X, 636, 2, i === 1 ? C.ACC : C.DIM);
    ditherText(base, String(v), X + 64, 686, `64px ${SERIF}`, C.INK, { from: 1, to: 0.5 });
    text(base, label, X, 740, `32px ${MONO}`, C.MUT, { track: 1 });
  });

  // languages: one bar, dithered per language
  line(base, 60, 776, 1540, 776, C.LINE, { dash: 2, gap: 4 });
  text(base, 'LINGVAE', 70, 830, `32px ${MONO}`, C.MUT, { track: 2 });
  const dens = [1, 0.7, 0.45, 0.28, 0.14], bx = 250, bw = 1290, sum = d.langs.reduce((a, l) => a + l[1], 0) || 1;
  const fill = (x, y, w, h, k) => { for (let j = 0; j < h; j += 2) for (let i = 0; i < w; i += 2) if (dens[k] > bayer((x + i) >> 1, (y + j) >> 1)) base.rect(x + i, y + j, 2, 2, k === 0 ? C.ACC : C.INK); };
  let bxx = bx, lx = 70;
  d.langs.forEach(([name, pct], k) => {
    const w = Math.round((pct / sum) * bw);
    fill(bxx, 806, Math.max(2, w - 4), 28, k); bxx += w;
    fill(lx, 880, 20, 20, k);
    lx += 34 + text(base, `${name} ${pct}%`, lx + 34, 900, `32px ${MONO}`, C.DIM) + 56;
  });

  // animation: the monitor sweep. Behind the sweep the trace is fresh (orange),
  // ahead of it the previous pass (faint); a gap erases between them.
  const TR = pathAt(tr), NN = 400, pts = Array.from({ length: NN + 1 }, (_, i) => TR(Math.min(i / NN, 0.9999)));
  const frames = [], delays = [], N = 48;
  for (let k = 0; k < N; k++) {
    const f = base.clone(), sx = x0 + (k / N) * (x1 - x0);
    for (let i = 1; i <= NN; i++) {
      const [ax, ay] = pts[i - 1], [bx2, by] = pts[i];
      if (bx2 <= sx) line(f, ax, ay, bx2, by, C.ACC, { w: 2 });
      else if (ax > sx + 40) line(f, ax, ay, bx2, by, C.FAINT, { w: 2 });
    }
    const hit = pts.reduce((best, p) => (Math.abs(p[0] - sx) < Math.abs(best[0] - sx) ? p : best), pts[0]);
    disc(f, Math.round(hit[0]), Math.round(hit[1]), 5, C.INK);
    frames.push(f); delays.push(60);
  }
  return { frames, delays, preview: 40 };
};

// ---------------------------------------------------------------------------
// Link buttons: one small plate per link, each with its glyph.
ICON.x = makeGlyph((G) => {
  for (let t = 0; t <= 1; t += 0.01) { const x = 4 + 16 * t, y = 3 + 18 * t; G.rect(Math.round(x) - 1, Math.round(y), 3, 1); }
  G.line(20, 3, 4, 21);
  G.rect(2, 3, 5, 1); G.rect(17, 21, 5, 1);
});
ICON.mail = makeGlyph((G) => {
  G.line(2, 5, 21, 5); G.line(2, 18, 21, 18); G.line(2, 5, 2, 18); G.line(21, 5, 21, 18);
  G.line(2, 5, 11.5, 13); G.line(21, 5, 12.5, 13);
});
const LINKS = [
  ['homonin', () => ICON.helm, 'HOMONIN.COM'],
  ['x', () => ICON.x, '@NEURARNAV'],
  ['site', () => GLYPH('DEV-D08'), 'A12N4V.GITHUB.IO'],
  ['mail', () => ICON.mail, 'EMAIL'],
];
for (const [key, icon, label] of LINKS) {
  PLATES[`a12n4v-link-${key}`] = async () => {
    const W = 400, H = 88, f = new Frame(W, H);
    box(f, 2, 2, W - 5, H - 5, C.MUT); box(f, 6, 6, W - 13, H - 13, C.LINE);
    for (const [x, y] of [[6, 6], [W - 7, 6], [6, H - 7], [W - 7, H - 7]]) regmark(f, x, y, 4, C.ACC);
    glyph(f, await icon(), 22, 20, 2, C.ACC);
    text(f, label, 86, 56, `32px ${MONO}`, C.INK, { track: 1 });
    return { frames: [f], delays: [0] };
  };
}
