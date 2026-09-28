// Plate definitions for the a12n4v profile.
// Language: 1-bit Bayer dither (homonin DitherCanvas), neoclassical engraving
// plates, semiotic captions, cybernetic loops. Each plate returns
// { frames: Frame[], delays: ms[] }.

const SERIF = 'FreeSerif';
const MONO = 'Unifont';
const M = (p) => 'http://plates.local/media/' + p;

// Plate chrome shared by every image: double rule, corner registration marks,
// plate number and title set in the engraver's margin.
function chrome(f, { no, title, right = '' }) {
  box(f, 16, 16, f.w - 33, f.h - 33, C.LINE);
  box(f, 22, 22, f.w - 45, f.h - 45, C.FAINT);
  for (const [x, y] of [[22, 22], [f.w - 23, 22], [22, f.h - 23], [f.w - 23, f.h - 23]]) regmark(f, x, y, 9, C.ACC);
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
// HERO: the twin in the mirror. Scan line sweeps the reflection; a signal
// dot runs the SIGNAL -> MODEL -> CARE loop.
PLATES['a12n4v-hero'] = async () => {
  const W = 1600, H = 640;
  const base = new Frame(W, H);
  chrome(base, { no: 'I', title: 'CORPVS ET SPECVLVM', right: 'A12N4V · MMXXVI' });

  const px = 40, py = 70, ps = 560, s = 2;
  const img = await loadImg(M('sigils/SEC-S04.png'));
  const lw = ps / s, lh = ps / s;
  const L = autocontrast(lumField(img, lw, lh, {}), 0.01).map((v) => Math.pow(v, 1.25));
  const bloomMod = (cx, cy, v) => {
    const dx = (cx / lw - 0.5) * 2, dy = (cy / lh - 0.5) * 2, r = Math.sqrt(dx * dx + dy * dy);
    return v * Math.max(0, Math.min(1, (1 - r) / 0.3));
  };
  ditherInto(base, L, lw, lh, px, py, s, { mod: bloomMod });

  // right column: the inscription
  const rx = 700;
  line(base, 660, 96, 660, H - 60, C.LINE, { dash: 2, gap: 4 });
  ditherText(base, 'ARNAV', rx, 212, `128px ${SERIF}`, C.INK, { track: 22, from: 1, to: 0.45 });
  ditherText(base, 'SHARMA', rx, 352, `128px ${SERIF}`, C.INK, { track: 22, from: 1, to: 0.45 });
  line(base, rx, 384, 1540, 384, C.ACC, { w: 2 });
  regmark(base, 1540, 385, 8, C.ACC);
  text(base, 'The body, computed.', rx, 448, `italic 52px ${SERIF}`, C.INK);
  text(base, 'BIODIGITAL TWINS · MEDICAL AI · CYBERNETICS', rx, 500, `32px ${MONO}`, C.DIM, { track: 1 });

  // the loop diagram: SIGNAL -> MODEL -> CARE, and back
  const ly = 556, ay = ly - 11, ry = ly + 26, nodes = [['SIGNAL', rx], ['MODEL', rx + 260], ['CARE', rx + 490]];
  nodes.forEach(([t, x]) => text(base, t, x, ly, `32px ${MONO}`, C.INK, { track: 2 }));
  [[rx + 116, rx + 240], [rx + 356, rx + 472]].forEach(([a, b]) => { line(base, a, ay, b, ay, C.MUT); arrowhead(base, b, ay, 0, 9, C.MUT); });
  const ex = rx + 570, sx = rx - 22;
  const path = [[rx + 562, ay], [ex, ay], [ex, ry], [sx, ry], [sx, ay], [rx - 6, ay]];
  polyline(base, [[rx + 562, ay], [ex, ay], [ex, ry], [rx + 330, ry]], C.FAINT, { dash: 3, gap: 3 });
  polyline(base, [[rx + 150, ry], [sx, ry], [sx, ay], [rx - 6, ay]], C.FAINT, { dash: 3, gap: 3 });
  arrowhead(base, rx - 6, ay, 0, 8, C.FAINT);
  text(base, 'FEEDBACK', rx + 176, ry + 11, `32px ${MONO}`, C.FAINT, { track: 2 });
  text(base, 'CORPVS · SIGNVM · MACHINA', px + ps / 2, 604, `32px ${MONO}`, C.ACC, { align: 'center', track: 1 });

  // animation
  const frames = [], delays = [], N = 48;
  // mirror region in plate cells (the reflection, where the twin lives)
  const mx0 = Math.round(lw * 0.50), mx1 = Math.round(lw * 0.78), my0 = Math.round(lh * 0.14), my1 = Math.round(lh * 0.86);
  const segs = []; let total = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(l); total += l; }
  const at = (u) => { let d = u * total; for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const t = d / segs[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]; } d -= segs[i]; } return path[0]; };

  for (let k = 0; k < N; k++) {
    const f = base.clone();
    const u = k / N;
    // scan band through the reflection
    const sy = my0 + (my1 - my0) * u;
    for (let cy = my0; cy <= my1; cy++) for (let cx = mx0; cx <= mx1; cx++) {
      const d = sy - cy; // cells above the scan line, trailing glow
      let v = bloomMod(cx, cy, L[cy * lw + cx]);
      const lit = d >= 0 && d < 26 ? 1 + 1.6 * (1 - d / 26) : 1;
      const on = v * lit > bayer(cx, cy);
      const col = on ? (d >= 0 && d < 3 ? C.ACC : C.INK) : C.BG;
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) f.set(px + cx * s + i, py + cy * s + j, col);
    }
    const yy = py + Math.round(sy) * s;
    line(f, px + mx0 * s - 10, yy, px + mx0 * s - 2, yy, C.ACC);
    line(f, px + mx1 * s + 2, yy, px + mx1 * s + 10, yy, C.ACC);
    // signal dot on the loop, with a short trail
    for (let t = 0; t < 6; t++) {
      const [x, y] = at(((u - t * 0.006) + 1) % 1);
      disc(f, Math.round(x), Math.round(y), t === 0 ? 5 : Math.max(1, 4 - t), t === 0 ? C.ACC : C.ACC);
    }
    frames.push(f); delays.push(70);
  }
  return { frames, delays, preview: 20 };
};

// ---------------------------------------------------------------------------
// II. SIGNVM: Peirce's three kinds of sign, read as the three stages of
// building a twin: the image (icon), the measurement (index), the code (symbol).
PLATES['a12n4v-signum'] = async () => {
  const W = 1600, H = 720, f = new Frame(W, H);
  chrome(f, { no: 'II', title: 'SIGNVM · AFTER C. S. PEIRCE', right: 'ICON · INDEX · SYMBOL' });
  const cy = 322, R = 170, cols = [290, 800, 1310];
  const panels = [
    { src: 'sigils/PLT-S01.png', name: 'ICON', line: 'the twin resembles the body', mono: 'IMAGING · ANATOMY' },
    { src: 'sigils/SEC-C08.png', name: 'INDEX', line: 'the signal is caused by it', mono: 'ECG · LABS · WEARABLES' },
    { src: 'sigils/SEC-S01.png', name: 'SYMBOL', line: 'the model stands for it', mono: 'EQUATIONS · CODE' },
  ];
  for (let i = 0; i < 3; i++) {
    const cx = cols[i], p = panels[i];
    await plate(f, p.src, cx - R, cy - R, 2 * R, 2 * R, { s: 2, bloom: 0.72, gamma: 1.25 });
    circle(f, cx, cy, R + 14, C.LINE);
    circle(f, cx, cy, R + 22, C.FAINT, { dash: 2, gap: 5 });
    for (let a = 0; a < 4; a++) { const t = a * Math.PI / 2; line(f, cx + (R + 14) * Math.cos(t), cy + (R + 14) * Math.sin(t), cx + (R + 30) * Math.cos(t), cy + (R + 30) * Math.sin(t), C.MUT); }
    text(f, String(i + 1).padStart(2, '0'), cx, cy - R - 44, `32px ${MONO}`, C.ACC, { align: 'center' });
    ditherText(f, p.name, cx, cy + R + 96, `56px ${SERIF}`, C.INK, { track: 16, align: 'center', from: 1, to: 0.55 });
    text(f, p.line, cx, cy + R + 144, `italic 32px ${SERIF}`, C.DIM, { align: 'center' });
    text(f, p.mono, cx, cy + R + 190, `32px ${MONO}`, C.FAINT, { align: 'center', track: 1 });
  }
  // the index is a trace: an ECG written across the measuring reel
  const ex0 = cols[1] - R - 6, ex1 = cols[1] + R + 6, ey = cy + 92, ecg = [];
  for (let x = ex0; x <= ex1; x++) {
    const u = ((x - ex0) / 170) % 1;
    const bump = (c, w, a) => a * Math.exp(-(((u - c) / w) ** 2));
    ecg.push([x, ey - bump(0.18, 0.04, 10) + bump(0.36, 0.012, 14) - bump(0.4, 0.014, 74) + bump(0.44, 0.012, 22) - bump(0.68, 0.06, 18)]);
  }
  polyline(f, ecg, C.ACC, { w: 2 });
  // construction order between the medallions
  for (const [a, b, lbl] of [[cols[0], cols[1], 'MEASURE'], [cols[1], cols[2], 'ENCODE']]) {
    const x0 = a + R + 40, x1 = b - R - 40;
    line(f, x0, cy, x1, cy, C.MUT, { dash: 4, gap: 4 }); arrowhead(f, x1, cy, 0, 9, C.MUT);
    text(f, lbl, (x0 + x1) / 2, cy - 16, `32px ${MONO}`, C.FAINT, { align: 'center' });
  }
  return { frames: [f], delays: [0] };
};

// ---------------------------------------------------------------------------
// III. SYSTEMA VIABILE: Stafford Beer's Viable System Model, with this
// practice mapped onto it. Signals run the loop; the algedonic line fires.
function amoeba(cx, cy, R) {
  return (t) => R * (1 + 0.07 * Math.sin(3 * t + 0.6) + 0.05 * Math.sin(5 * t + 2.1) + 0.035 * Math.sin(8 * t + 0.3));
}
function vnoise(x, y) {
  return 0.5 + 0.25 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2.2) * Math.cos(y * 0.09 - x * 0.03) + 0.25 * Math.sin((x + y) * 0.05 + Math.cos(x * 0.04) * 1.7);
}
function pathAt(path) {
  const segs = []; let total = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(l); total += l; }
  return (u) => {
    let d = (((u % 1) + 1) % 1) * total;
    for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const t = d / segs[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]; } d -= segs[i]; }
    return path[0];
  };
}
function pulse(f, at, u, n = 6, step = 0.005) {
  for (let t = n - 1; t >= 0; t--) { const [x, y] = at(u - t * step); disc(f, Math.round(x), Math.round(y), t === 0 ? 5 : Math.max(1, 4 - t), C.ACC); }
}

PLATES['a12n4v-systema'] = async () => {
  const W = 1600, H = 920, base = new Frame(W, H);
  chrome(base, { no: 'III', title: 'SYSTEMA VIABILE · AFTER STAFFORD BEER', right: 'BRAIN OF THE FIRM, 1972' });

  // environment: an amoeba holding the astrolabe (the world, as the ancients drew it)
  const ecx = 330, ecy = 520, ER = 236, r = amoeba(ecx, ecy, ER);
  const inside = (x, y) => { const dx = x - ecx, dy = y - ecy; return Math.hypot(dx, dy) < r(Math.atan2(dy, dx)); };
  const img = await loadImg(M('threshold/astrolabe.png'));
  const s = 2, lw = 440 / s, lh = 440 / s, ox = ecx - 220, oy = ecy - 220;
  const L = autocontrast(lumField(img, lw, lh, {}), 0.01);
  ditherInto(base, L, lw, lh, ox, oy, s, {
    ink: C.DIM,
    mod: (cx, cy, v) => {
      const X = ox + cx * s, Y = oy + cy * s; if (!inside(X, Y)) return 0;
      const dx = X - ecx, dy = Y - ecy, e = Math.hypot(dx, dy) / r(Math.atan2(dy, dx));
      return v * 0.75 * Math.min(1, (1 - e) / 0.25);
    },
  });
  // stipple haze in the rest of the amoeba
  for (let Y = ecy - 300; Y < ecy + 300; Y += s) for (let X = ecx - 300; X < ecx + 300; X += s) {
    if (!inside(X, Y) || base.get(X, Y) !== C.BG) continue;
    const v = 0.12 * vnoise(X, Y);
    if (v > bayer(X / s | 0, Y / s | 0)) base.rect(X, Y, s, s, C.FAINT);
  }
  const outline = [];
  for (let i = 0; i <= 720; i++) { const t = i / 720 * Math.PI * 2; outline.push([ecx + r(t) * Math.cos(t), ecy + r(t) * Math.sin(t)]); }
  polyline(base, outline, C.INK);
  text(base, 'ENVIRONMENT', ecx, ecy + ER + 60, `32px ${MONO}`, C.INK, { align: 'center', track: 3 });
  text(base, 'patients · clinics · the literature', ecx, ecy + ER + 100, `italic 30px ${SERIF}`, C.MUT, { align: 'center' });

  // metasystem + operations column
  const bx = 1000, bw = 440, bh = 78;
  const rows = [
    ['S5', 'POLICY', 'identity: medicine is a control problem', 110],
    ['S4', 'INTELLIGENCE', 'the outside and then: twins, in silico trials', 212],
    ['S3', 'CONTROL', 'the inside and now: credibility, V&V', 314],
    ['S1', 'HOMONIN', 'a cyber-medical research workspace', 470],
    ['S1', 'MODELS', 'neural systems, adaptive AI', 610],
    ['S1', 'RESEARCH', 'mapping the biodigital twin field', 750],
  ];
  rows.forEach(([k, name, note, y], i) => {
    box(base, bx, y, bw, bh, i < 3 ? C.INK : C.DIM);
    if (i === 0) box(base, bx + 5, y + 5, bw - 10, bh - 10, C.LINE);
    text(base, k, bx + 20, y + 36, `32px ${MONO}`, C.ACC);
    text(base, name, bx + 72, y + 36, `32px ${MONO}`, C.INK, { track: 2 });
    text(base, note, bx + 20, y + 66, `italic 26px ${SERIF}`, C.DIM);
  });
  // vertical metasystem links (double rule)
  for (const [a, b] of [[110 + bh, 212], [212 + bh, 314]]) { line(base, bx + 200, a, bx + 200, b, C.MUT); line(base, bx + 240, a, bx + 240, b, C.MUT); }
  // S3 command channel down the left of the S1 boxes
  const cx3 = bx - 30;
  line(base, bx, 314 + bh / 2, cx3, 314 + bh / 2, C.MUT);
  line(base, cx3, 314 + bh / 2, cx3, 750 + bh / 2, C.MUT);
  for (const y of [470, 610, 750]) { line(base, cx3, y + 20, bx, y + 20, C.MUT); arrowhead(base, bx, y + 20, 0, 8, C.MUT); }
  // operations: circles between environment and management
  const ocx = 760, ops = [509, 649, 789];
  ops.forEach((y, i) => {
    circle(base, ocx, y, 44, C.INK); circle(base, ocx, y, 38, C.LINE);
    text(base, ['I', 'II', 'III'][i], ocx, y + 13, `36px ${SERIF}`, C.INK, { align: 'center' });
    line(base, ocx + 44, y, cx3 - 1, y, C.DIM); line(base, ocx + 44, y + 6, cx3 - 1, y + 6, C.DIM);
    // wavy coupling into the environment
    const wav = []; const x0 = ecx + r(0) * 0.92, x1 = ocx - 44;
    for (let x = x0; x <= x1; x++) wav.push([x, y + 3 + 5 * Math.sin((x - x0) / 9)]);
    polyline(base, wav, C.MUT);
  });
  text(base, 'OPERATIONS', ocx, 868, `32px ${MONO}`, C.MUT, { align: 'center', track: 2 });
  // S2 coordination: zigzag on the right, anti-oscillation
  const zx = 1480, zz = [];
  for (let y = 470, i = 0; y <= 828; y += 12, i++) zz.push([zx + (i % 2 ? 9 : -9), y]);
  polyline(base, zz, C.DIM);
  for (const y of [509, 649, 789]) { line(base, bx + bw, y, zx - 10, y, C.DIM); }
  text(base, 'S2', zx, 452, `32px ${MONO}`, C.ACC, { align: 'center' });
  text(base, 'DICOM · FHIR · SBML', bx + bw, 876, `32px ${MONO}`, C.FAINT, { align: 'right', track: 1 });
  // S4 reaches into the environment's future
  const s4y = 212 + bh / 2, s4path = [[bx, s4y], [520, s4y], [520, ecy - ER + 30]];
  polyline(base, s4path, C.MUT, { dash: 5, gap: 4 });
  arrowhead(base, 520, ecy - ER + 30, Math.PI / 2, 9, C.MUT);
  text(base, 'the outside and then', 540, s4y - 14, `italic 26px ${SERIF}`, C.MUT);
  // algedonic channel: operations straight to S5, in orange
  const ax = 880, alg = [[ocx + 44, 789], [ax, 789], [ax, 110 + bh / 2], [bx, 110 + bh / 2]];
  polyline(base, alg, C.ACC, { dash: 6, gap: 4 });
  arrowhead(base, bx, 110 + bh / 2, 0, 10, C.ACC);
  text(base, 'ALGEDONIC', ax - 16, 142, `32px ${MONO}`, C.ACC, { align: 'right', track: 2 });
  text(base, 'pain and pleasure, straight to the top', ax - 16, 178, `italic 26px ${SERIF}`, C.MUT, { align: 'right' });

  // the regulatory loop the pulses run: environment -> operation -> management -> S3 -> S4 -> environment
  const loop = pathAt([
    [ecx + r(0) * 0.92, 652], [ocx - 44, 652], [ocx + 44, 649], [cx3, 649], [cx3, 314 + bh / 2], [bx, 314 + bh / 2],
    [bx + 220, 314], [bx + 220, 212 + bh], [bx + 220, 212 + bh / 2], [bx, s4y], [520, s4y], [520, ecy - ER + 30], [ecx + 60, ecy - 60], [ecx + r(0) * 0.92, 652],
  ]);
  const algAt = pathAt(alg);
  const frames = [], delays = [], N = 60;
  for (let k = 0; k < N; k++) {
    const f = base.clone(), u = k / N;
    pulse(f, loop, u); pulse(f, loop, u + 0.5);
    const au = (u * 2) % 1; if (au < 0.6) pulse(f, algAt, au / 0.6, 8, 0.012);
    // S5 flashes when the algedonic signal lands
    if (au >= 0.6 && au < 0.72) box(f, bx + 5, 115, bw - 10, bh - 10, C.ACC);
    frames.push(f); delays.push(60);
  }
  return { frames, delays, preview: 15 };
};

// ---------------------------------------------------------------------------
// IV. ATLAS: which organs are computable, per the 2026 field survey.
PLATES['a12n4v-atlas'] = async () => {
  const W = 1600, H = 760, f = new Frame(W, H);
  chrome(f, { no: 'IV', title: 'ATLAS CORPORIS COMPVTABILIS', right: 'STATUS · MMXXVI' });
  const panels = [
    { src: 'dither/heart.png', name: 'COR', status: 'SOLVED', note: 'flow twins, reimbursed', inv: true },
    { src: 'dither/vesalius_muscle2.jpg', name: 'OSSA', status: 'SOLVED', note: 'bone and implant mechanics', inv: true },
    { src: 'dither/brain.jpg', name: 'CEREBRVM', status: 'CONVERGING', note: 'epilepsy twins in trial', inv: true },
    { src: 'dither/cajal_purkinje.jpg', name: 'NEVRON', status: 'OPEN', note: 'the virtual cell', inv: true },
  ];
  const pw = 330, ph = 430, gap = (W - 96 - 4 * pw) / 3, y0 = 96;
  for (let i = 0; i < 4; i++) {
    const p = panels[i], x = 48 + i * (pw + gap);
    await plate(f, p.src, x, y0, pw, ph, { s: 2, invert: p.inv, bloom: 0, gamma: 1.1, mod: (cx, cy, v) => {
      const ex = Math.min(cx, pw / 2 - cx) / 14, ey = Math.min(cy, ph / 2 - cy) / 14; return v * Math.max(0, Math.min(1, ex, ey));
    } });
    box(f, x - 6, y0 - 6, pw + 12, ph + 12, C.LINE);
    text(f, `FIG. ${i + 1}`, x, y0 + ph + 50, `32px ${MONO}`, C.FAINT);
    ditherText(f, p.name, x, y0 + ph + 104, `44px ${SERIF}`, C.INK, { track: 8, from: 1, to: 0.6 });
    const acc = p.status !== 'OPEN';
    const sw = [...p.status].length * 18 + 30;
    box(f, x, y0 + ph + 124, sw, 44, acc ? C.ACC : C.MUT);
    text(f, p.status, x + 15, y0 + ph + 157, `32px ${MONO}`, acc ? C.ACC : C.MUT, { track: 2 });
    text(f, p.note, x, y0 + ph + 206, `italic 28px ${SERIF}`, C.DIM);
  }
  return { frames: [f], delays: [0] };
};

// ---------------------------------------------------------------------------
// V. PANTHEON: the original profile banner (Athena, Hermes, Asclepius),
// re-struck in the plate system. Wisdom, exchange, medicine.
PLATES['a12n4v-pantheon'] = async () => {
  const W = 1600, H = 600, f = new Frame(W, H);
  chrome(f, { no: 'V', title: 'PANTHEON', right: 'SAPIENTIA · COMMERCIVM · MEDICINA' });
  const img = await loadImg('http://plates.local/src/classical-systems-banner.jpg');
  const s = 2, x = 40, y = 80, w = 1520, h = 440, lw = w / s, lh = h / s;
  const L = autocontrast(lumField(img, lw, lh, { fit: 'cover', crop: [0, 20, 1800, 520] }), 0.01);
  ditherInto(f, L, lw, lh, x, y, s, { gamma: 1.15, mod: (cx, cy, v) => v * Math.max(0, Math.min(1, cy / 12, (lh - cy) / 30, cx / 20, (lw - cx) / 20)) });
  ['ATHENA', 'HERMES', 'ASCLEPIVS'].forEach((t, i) => text(f, t, [290, 800, 1310][i], 560, `32px ${MONO}`, C.MUT, { align: 'center', track: 4 }));
  return { frames: [f], delays: [0] };
};
