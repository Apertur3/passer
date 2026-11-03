// M01 Harmonograph (the drawing machine of coupled pendulums).
// One rule: a pen follows two damped pendulums per axis, so a near-integer frequency ratio becomes a slowly closing, decaying spiral.
export const meta = {
  id: 'm01-harmonograph', title: 'Harmonograph', T: 16, speed: 0.6, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'x(u) = Σ A_i sin(f_i u + φ_i) m_i(u), y(u) likewise; f_i = a_i N + e_i integers, m_i(u) = 0.55 + 0.45 cos(k_i u + ψ_i), u in [0, 2π]',
  label: 'One closed pen path from four pendulums with near-integer frequency ratios; a periodic amplitude envelope winds the spiral in and out and the ink gathers where the path retraces.',
  // segs: pen segments at q = 1; alpha: ink alpha of one stroke
  params: { segs: 9000, alpha: 0.42 },
};

const TAU = 2 * Math.PI, CH = 40; // CH strokes per figure: overlapping strokes add up, so retraced ink is darker
// frequency sets: x terms, y terms
const SETS = [[1, 1, 1, 2], [1, 1, 1, 1], [2, 2, 2, 3], [1, 2, 1, 1], [2, 3, 2, 2]];
const SCR = { n: 0, p: null };

// One machine: four pendulums (two per axis) with integer frequencies f = a*N + e, so the pen path closes after u = 2 pi exactly.
// The slow spiral in and out is an amplitude envelope that is itself periodic over 2 pi; no frequency ever changes, so closure always holds.
function trace(g, r, k, n, N) {
  const f = SETS[Math.floor(r() * SETS.length)].map(a => a * N + (r() < 0.5 ? -1 : 1) * (1 + ((r() * 2) | 0))), A = [0.8, 0.2, 0.8, 0.2], ph = f.map(() => r() * TAU);
  const ps = f.map(() => r() * TAU), m = f.map(() => 1 + ((r() * 2) | 0)), s = Math.sign(r() - 0.5) || 1, dr = g.drift * 0.15, v = g.voice, out = SCR.p;
  const p0 = ph[0] + v(k) * s, p2 = ph[2] - v(k) * s;
  const am = A.map((a, i) => a * (1 + 0.22 * Math.sin(v(1 + (i % 2)) + ps[i] + dr * (1 + i * 0.3)))); // amplitudes breathe; live they drift against each other
  const e0 = ps[0] + dr * 0.6 + v(1), e1 = ps[1] - dr * 0.5 - v(1), e2 = ps[2] + v(1), e3 = ps[3] - v(1); // the envelope phases travel: the spiral winds in and out
  for (let i = 0; i <= n; i++) {
    const u = TAU * i / n, en = (j, e) => 0.55 + 0.45 * Math.cos(m[j] * u + e);
    out[i * 2] = am[0] * Math.sin(f[0] * u + p0) * en(0, e0) + am[1] * Math.sin(f[1] * u + ph[1]) * en(1, e1);
    out[i * 2 + 1] = am[2] * Math.sin(f[2] * u + p2) * en(2, e2) + am[3] * Math.sin(f[3] * u + ph[3]) * en(3, e3);
  }
  out[n * 2] = out[0]; out[n * 2 + 1] = out[1]; // exact seam
}
// Ink pooling: the pen lingers near the turning points of its pendulums, so short segments are drawn darker and thicker, fast ones lighter.
const NB = 5;
function pen(ctx, g, cx, cy, R, n, a, col) {
  const p = SCR.p, K = Math.floor(n / CH), L = SCR.l || (SCR.l = new Float32Array(0));
  if (L.length < n) SCR.l = new Float32Array(n);
  const l = SCR.l; let mean = 0;
  for (let i = 0; i < n; i++) { l[i] = Math.hypot(p[i * 2 + 2] - p[i * 2], p[i * 2 + 3] - p[i * 2 + 1]); mean += l[i]; }
  mean /= n;
  const paths = [], last = new Int32Array(NB * 2).fill(-2);
  for (let k = 0; k < NB * 2; k++) paths.push(new Path2D());
  for (let i = 0; i < n; i++) {
    const d = Math.min(1, Math.max(0, 1 - l[i] / (1.7 * mean))), b = Math.min(NB - 1, (d * NB) | 0), k = b * 2 + ((i / K | 0) & 1), P = paths[k];
    if (last[k] !== i - 1) P.moveTo(cx + p[i * 2] * R, cy + p[i * 2 + 1] * R);
    P.lineTo(cx + p[i * 2 + 2] * R, cy + p[i * 2 + 3] * R); last[k] = i;
  }
  for (let k = 0; k < NB * 2; k++) {
    const d = ((k >> 1) + 0.5) / NB; g.pen(ctx, 'hair', 1, col);
    ctx.lineWidth *= 1 + 1.1 * d * d; ctx.globalAlpha = Math.min(1, a * ctx.globalAlpha * (0.5 + 1.3 * d)); ctx.stroke(paths[k]);
  }
}

export function draw(ctx, { g }) {
  const P = g.params, n = Math.max(CH * 40, Math.round(P.segs * Math.min(1, g.q ?? 1) / CH) * CH);
  if (SCR.n < n + 1) { SCR.n = n + 1; SCR.p = new Float32Array((n + 1) * 2); }
  trace(g, g.rng('big'), 1, n, 44);
  let ext = 1e-6; for (let i = 0; i <= n; i++) ext = Math.max(ext, Math.abs(SCR.p[i * 2]), Math.abs(SCR.p[i * 2 + 1])); // normalise: the figure spans the margin box of the short edge
  pen(ctx, g, 0, 0, Math.min(g.bx, g.by) / ext, n, P.alpha, g.c.ink);
}
