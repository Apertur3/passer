// M02 Clifford attractor (a plane map iterated, drawn as a swarm).
// One rule: the map x' = sin(a y) + c cos(a x), y' = sin(b x) + d cos(b y) folds a lattice of points onto a thin filigree, and a swarm of particles hops along it, so density gives the tone.
export const meta = {
  id: 'm02-clifford', title: 'Clifford attractor', T: 12, still: 0.1, start: 0.25, dprMax: 1, aspects: ['4:5', '16:9', '1:1'],
  math: "x' = sin(a y) + c cos(a x),  y' = sin(b x) + d cos(b y);  (a, b) walk a small circle",
  label: 'A swarm of particles hopping along a Clifford attractor, each leaving a short comet trail, while the map parameters walk a small circle so the filigree unfolds and refolds; a second, smaller attractor streams beside it.',
  // seeds: lattice points per big attractor; eps: radius of the parameter circle; dwell: seconds before the live piece moves on to another attractor
  params: { seeds: 6500, eps: 0.07, dwell: 50 },
};

// attractors known to stay rich in a neighbourhood of (a, b): a, b, c, d
const FAM = [[-1.4, 1.6, 1.0, 0.7], [1.7, 1.7, 0.6, 1.2], [1.5, -1.8, 1.6, 0.9], [-1.7, 1.8, -1.9, -0.4], [-1.8, -2.0, -0.5, -0.9], [1.7, 1.3, -0.1, -1.21]];
const TAU = Math.PI * 2, K = 8, NC = 8; // K: iterations used to measure the attractor's extent; NC: hops per particle per loop
const SC = { sx: null, sy: null, box: {} };
const TB = new Float64Array(4097), INV = 4096 / TAU; for (let i = 0; i <= 4096; i++) TB[i] = Math.sin(i / INV);
const sn = v => { const u = (v + 25.2) * INV, i = u | 0, f = u - i; return TB[i & 4095] * (1 - f) + TB[(i & 4095) + 1] * f; }; // sine from a table, |v| < 25, error 3e-7

function lattice(N) { // R2 low-discrepancy sequence on [-1, 1]^2, built once
  if (SC.sx && SC.sx.length >= N) return;
  SC.sx = new Float32Array(N); SC.sy = new Float32Array(N);
  for (let i = 0; i < N; i++) { SC.sx[i] = ((i + 0.5) * 0.7548776662466927 % 1) * 2 - 1; SC.sy[i] = ((i + 0.5) * 0.5698402909980532 % 1) * 2 - 1; }
}
// where the iterates of an attractor fall: centre and half-size, measured once per family member and kept fixed so the picture never pulses
function box(k) {
  if (SC.box[k]) return SC.box[k];
  const [a, b, c, d] = FAM[k], B = 1 + Math.max(Math.abs(c), Math.abs(d)); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; const xs = [], ys = [];
  for (let i = 0; i < 4000; i++) {
    let x = SC.sx[i] * B, y = SC.sy[i] * B;
    for (let j = 0; j < K; j++) { const nx = Math.sin(a * y) + c * Math.cos(a * x); y = Math.sin(b * x) + d * Math.cos(b * y); x = nx; }
    xs.push(x); ys.push(y);
  }
  xs.sort((p, q) => p - q); ys.sort((p, q) => p - q);
  x0 = xs[40]; x1 = xs[3959]; y0 = ys[40]; y1 = ys[3959];
  return (SC.box[k] = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hx: (x1 - x0) / 2 * 1.04, hy: (y1 - y0) / 2 * 1.04 });
}

export function draw(ctx, { g, t }) {
  const P = g.params, q = Math.min(1, g.q ?? 1), N = Math.round(P.seeds * q), live = g.live, NL = SC.sx ? 0 : 0;
  lattice(P.seeds);
  const sm = g.ease.smoother;
  const pick = (k) => Math.floor(g.rng('pick' + k)() * FAM.length);
  const layers = [], aw = g.bx, ah = g.by * 0.85, small = 0.46;
  const addLayer = (kind, member, amount) => { if (amount > 0.004) layers.push({ kind, member, amount }); };
  if (live) {
    for (const kind of [0, 1]) {
      const s = g.drift / P.dwell + kind * 0.43, k = Math.floor(s), f = s - k, wgt = sm((f - 0.75) / 0.25);
      const m0 = pick(kind * 100 + k); let m1 = pick(kind * 100 + k + 1); if (m1 === m0) m1 = (m1 + 1) % FAM.length;
      addLayer(kind, m0, 1 - wgt); addLayer(kind, m1, wgt);
    }
  } else { addLayer(0, pick(0), 1); addLayer(1, (pick(0) + 2 + (pick(1) % 3)) % FAM.length, 1); }
  const Tc = g.T / NC, r0 = Math.max(0.0019, 1.3 / g.S), NS = P.seeds;
  g.pen(ctx, 'hair', 1); ctx.fillStyle = g.c.ink; ctx.strokeStyle = g.c.ink; 
  for (const L of layers) {
    const [a0, b0, c, d] = FAM[L.member], bx = box(L.member), kind = L.kind;
    const ph = kind ? g.voice(2) + 1.7 : g.voice(1), pb = kind ? g.voice(1) + 4 : g.voice(2) + 0.6, e = P.eps * (kind ? 0.8 : 1);
    const a = a0 + e * Math.cos(ph), b = b0 + e * Math.sin(ph) + 0.4 * e * Math.sin(pb);
    const Bm = 1 + Math.max(Math.abs(c), Math.abs(d)), s0 = Math.min(aw / bx.hx, ah / bx.hy), s1 = Math.min(aw / bx.hy, ah / bx.hx), rot = s1 > s0, sc = Math.max(s0, s1) * (kind ? small : 1);
    const ox = kind ? 0.35 * g.bx : 0, oy = kind ? 0.42 * g.by : -0.08 * g.by, rk = r0 * (kind ? 0.85 : 1);
    const n = Math.round(N * L.amount * (kind ? 0.45 : 1));
    const buf = [[], [], []]; // particles in three size classes, each class stroked once: a capsule is the dot plus its comet trail
    for (let i = 0; i < n; i++) {
      const tau = t / Tc + NC * ((i * 0.6180339887) % 1), cy = Math.floor(tau), s = tau - cy, j = 7 + (cy % 4);
      const si = (i + (live ? 7919 * Math.floor(cy / NC) : 0)) % NS;
      let x = SC.sx[si] * Bm, y = SC.sy[si] * Bm, x1 = x, y1 = y;
      for (let m = 0; m <= j; m++) { x1 = x; y1 = y; const nx = sn(a * y) + c * sn(a * x + 1.5707963); y = sn(b * x) + d * sn(b * y + 1.5707963); x = nx; }
      // a particle lives at iterate j (x1, y1) and slides a little toward iterate j + 1 (x, y), trailing a short streak; its size grows and fades with sin(pi s) so it is born and dies unseen
      const en = Math.sin(Math.PI * s); if (en < 0.2) continue;
      const u = x1 - bx.cx, v = y1 - bx.cy, du = x - x1, dv = y - y1, L = Math.hypot(du, dv) || 1, ux = (rot ? -dv : du) / L, uy = (rot ? du : dv) / L;
      const X = (rot ? -v : u) * sc + ox + ux * 0.012 * s, Y = (rot ? u : v) * sc + oy + uy * 0.012 * s, tl = 0.003 + 0.004 * en;
      buf[en < 0.5 ? 0 : en < 0.8 ? 1 : 2].push(X - ux * tl, Y - uy * tl, X, Y);
    }
    for (let k = 0; k < 3; k++) { // the streak is a butt-capped stroke (cheap), the head a filled circle of the class radius
      const B = buf[k], rr = rk * (0.55 + 0.3 * k);
      ctx.globalAlpha = 0.45; ctx.lineWidth = 2 * rr * 0.8; ctx.lineCap = 'butt'; ctx.beginPath();
      for (let i = 0; i < B.length; i += 4) { ctx.moveTo(B[i], B[i + 1]); ctx.lineTo(B[i + 2], B[i + 3]); }
      ctx.stroke(); ctx.globalAlpha = 0.75; ctx.beginPath();
      for (let i = 0; i < B.length; i += 4) { ctx.moveTo(B[i + 2] + rr, B[i + 3]); ctx.arc(B[i + 2], B[i + 3], rr, 0, TAU); }
      ctx.fill();
    }
  }
}
