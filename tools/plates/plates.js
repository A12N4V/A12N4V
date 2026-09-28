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
// II. SYSTEMA VIABILE: Stafford Beer's Viable System Model with Homonin as the
// hub. Every system reports in (bone), Homonin integrates, and feedback goes
// back out to every element (orange).
function amoeba(cx, cy, R) {
  return (t) => R * (1 + 0.07 * Math.sin(3 * t + 0.6) + 0.05 * Math.sin(5 * t + 2.1) + 0.035 * Math.sin(8 * t + 0.3));
}
function vnoise(x, y) {
  return 0.5 + 0.25 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2.2) * Math.cos(y * 0.09 - x * 0.03) + 0.25 * Math.sin((x + y) * 0.05 + Math.cos(x * 0.04) * 1.7);
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
    { k: 'S4', name: 'INTELLIGENCE', note: 'the outside and then: twins, in silico trials', x: 60, y: 200, a: [60 + bw, 242] },
    { k: 'S3', name: 'CONTROL', note: 'the inside and now: credibility, V&V', x: 1100, y: 200, a: [1100, 242] },
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
  polyline(base, [[S5.x, S5.y + 42], [280, S5.y + 42], [280, S4.y]], C.MUT);
  polyline(base, [[S5.x + bw, S5.y + 42], [1320, S5.y + 42], [1320, S3.y]], C.MUT);
  line(base, 1320, S3.y + bh, 1320, S2.y, C.MUT);
  const zz = []; for (let y = S2.y + bh, i = 0; y <= S1m.y; y += 12, i++) zz.push([1320 + (i % 2 ? 9 : -9), y]);
  zz[0][0] = 1320; zz[zz.length - 1] = [1320, S1m.y]; polyline(base, zz, C.DIM);
  const top = ept(-Math.PI / 2 - 0.25);
  line(base, 230, S4.y + bh, top[0], top[1] - 6, C.MUT, { dash: 5, gap: 4 });
  arrowhead(base, top[0], top[1] - 6, Math.atan2(top[1] - S4.y - bh, top[0] - 230), 9, C.MUT);
  wavy(base, ept(0.75), [S1r.x, S1r.y + 42], C.MUT);

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
    frames.push(f); delays.push(u >= 0.38 && u < 0.56 ? 80 : 60);
  }
  return { frames, delays, preview: 48 };
};

// I. PANTHEON: the original profile banner (Athena, Hermes, Asclepius),
// re-struck in the plate system. Wisdom, exchange, medicine.
PLATES['a12n4v-pantheon'] = async () => {
  const W = 1600, H = 600, f = new Frame(W, H);
  chrome(f, { no: 'I', title: 'PANTHEON', right: 'SAPIENTIA · COMMERCIVM · MEDICINA' });
  const img = await loadImg('http://plates.local/src/classical-systems-banner.jpg');
  const s = 2, x = 40, y = 80, w = 1520, h = 440, lw = w / s, lh = h / s;
  const L = autocontrast(lumField(img, lw, lh, { fit: 'cover', crop: [0, 20, 1800, 520] }), 0.01);
  ditherInto(f, L, lw, lh, x, y, s, { gamma: 1.15, mod: (cx, cy, v) => v * Math.max(0, Math.min(1, cy / 12, (lh - cy) / 30, cx / 20, (lw - cx) / 20)) });
  ['ATHENA', 'HERMES', 'ASCLEPIVS'].forEach((t, i) => text(f, t, [290, 800, 1310][i], 560, `32px ${MONO}`, C.MUT, { align: 'center', track: 4 }));
  return { frames: [f], delays: [0] };
};
