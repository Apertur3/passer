// M01 Harmonograph (the drawing machine of coupled pendulums).
// One rule: a pen follows two damped pendulums per axis, so a near-integer frequency ratio becomes a slowly closing, decaying spiral.
export const meta = {
  id: 'm01-harmonograph', title: 'Harmonograph', T: 16, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'x(t) = Σ A_i sin(f_i t + φ_i) e^(-d_i t), y(t) likewise; f_i = a_i N + e_i integers (e.g. 3 : 2 plus a small detune), one closed period, amplitudes modulated',
  label: 'A pen traced by damped pendulums: near-integer frequency ratios make a decaying spiral whose ink gathers where the path retraces.',
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
  const ps = f.map(() => r() * TAU), m = f.map(() => 1 + ((r() * 2) | 0)), s = Math.sign(r() - 0.5) || 1, dr = g.drift * 0.05, v = g.voice, out = SCR.p;
  const p0 = ph[0] + v(k) * s, p2 = ph[2] - v(k) * s;
  const am = A.map((a, i) => a * (1 + 0.22 * Math.sin(v(1 + (i % 2)) + ps[i] + dr * (1 + i * 0.3)))); // amplitudes breathe; live they drift against each other
  const e0 = ps[0] + v(k) * s * 0.0 + v(1), e1 = ps[1] - v(1), e2 = ps[2] + v(1), e3 = ps[3] - v(1); // the envelope phases travel: the spiral winds in and out
  for (let i = 0; i <= n; i++) {
    const u = TAU * i / n, en = (j, e) => 0.55 + 0.45 * Math.cos(m[j] * u + e);
    out[i * 2] = am[0] * Math.sin(f[0] * u + p0) * en(0, e0) + am[1] * Math.sin(f[1] * u + ph[1]) * en(1, e1);
    out[i * 2 + 1] = am[2] * Math.sin(f[2] * u + p2) * en(2, e2) + am[3] * Math.sin(f[3] * u + ph[3]) * en(3, e3);
  }
  out[n * 2] = out[0]; out[n * 2 + 1] = out[1]; // exact seam
}
function pen(ctx, g, cx, cy, R, n, a, col) { // CH consecutive strokes; alpha varies smoothly and periodically, so the seam is invisible
  const p = SCR.p, K = Math.floor(n / CH);
  g.pen(ctx, 'hair', 1, col); const fl = ctx.globalAlpha;
  for (let c = 0; c < CH; c++) {
    ctx.globalAlpha = Math.min(1, a * fl * (0.85 + 0.15 * Math.sin(TAU * (c + 0.5) / CH * 2)));
    ctx.beginPath(); ctx.moveTo(cx + p[c * K * 2] * R, cy + p[c * K * 2 + 1] * R);
    const e = c === CH - 1 ? n : (c + 1) * K;
    for (let i = c * K + 1; i <= e; i++) ctx.lineTo(cx + p[i * 2] * R, cy + p[i * 2 + 1] * R);
    ctx.stroke();
  }
}

export function draw(ctx, { g }) {
  const P = g.params, n = Math.max(CH * 40, Math.round(P.segs * Math.min(1, g.q ?? 1) / CH) * CH);
  if (SCR.n < n + 1) { SCR.n = n + 1; SCR.p = new Float32Array((n + 1) * 2); }
  const wide = g.aspect > 1.3, m = Math.min(g.bx, g.by);
  // the large machine, and a small second one running on its own pendulums at its own tempo
  trace(g, g.rng('big'), 1, n, 44);
  pen(ctx, g, wide ? -g.bx * 0.38 : 0, wide ? 0 : -g.by * 0.14, wide ? g.by * 0.92 : m * 0.86, n, P.alpha, g.c.ink);
  const ns = Math.max(CH * 20, (n / 2 / CH | 0) * CH);
  trace(g, g.rng('small'), 2, ns, 30);
  pen(ctx, g, wide ? g.bx * 0.52 : g.bx * 0.45, wide ? g.by * 0.35 : g.by * 0.6, wide ? g.by * 0.45 : m * 0.28, ns, P.alpha * 1.3, g.c.ink);
}
