// M01 Harmonograph (the drawing machine of coupled pendulums).
// One rule: a pen follows two damped pendulums per axis, so a near-integer frequency ratio becomes a slowly closing, decaying spiral.
export const meta = {
  id: 'm01-harmonograph', title: 'Harmonograph', T: 16, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'x(t) = Σ A_i sin(f_i t + φ_i) e^(-d_i t), y(t) likewise; f_i near integer ratios, e.g. 3 : 2 + 0.02',
  label: 'A pen traced by damped pendulums: near-integer frequency ratios make a decaying spiral whose ink gathers where the path retraces.',
  // cycles: pendulum cycles of the slowest term the pen draws; segs: pen segments at q = 1; alpha: ink alpha of one stroke
  params: { cycles: 60, segs: 8000, alpha: 0.42 },
};

const TAU = 2 * Math.PI, CH = 40; // CH strokes per figure: overlapping strokes add up, so retraced ink is darker
// frequency sets: x terms, y terms
const SETS = [[2, 1, 2, 3], [3, 1, 3, 2], [3, 2, 3, 1], [2, 3, 2, 1], [2, 1, 2, 1]];
const SCR = { n: 0, p: null };

// One machine: four pendulums (two per axis), written to SCR.p as (x, y) in units of its own radius.
function trace(g, r, k, n) {
  const f = SETS[Math.floor(r() * SETS.length)], A = [0.72, 0.28, 0.72, 0.28], dt = f.map(() => 0.008 + 0.022 * r()), ph = f.map(() => r() * TAU);
  const U = g.params.cycles * TAU / 3, v = g.voice, dr = g.drift * 0.05, out = SCR.p;
  const ff = f.map((b, i) => b + (i % 2 ? -1 : 1) * dt[i] * (1 + 0.45 * Math.sin(dr + i * 1.7))); // detune wanders live (drift is 0 in loop mode)
  const d = A.map((_, i) => (0.9 + 1.0 * r()) / U), s = Math.sign(r() - 0.5) || 1;
  const p0 = ph[0] + v(k) * s, p2 = ph[2] - v(k) * s, p1 = ph[1], p3 = ph[3]; // loop: integer cycles, so the figure family returns
  for (let i = 0; i <= n; i++) {
    const u = U * i / n;
    out[i * 2] = A[0] * Math.sin(ff[0] * u + p0) * Math.exp(-d[0] * u) + A[1] * Math.sin(ff[1] * u + p1) * Math.exp(-d[1] * u);
    out[i * 2 + 1] = A[2] * Math.sin(ff[2] * u + p2) * Math.exp(-d[2] * u) + A[3] * Math.sin(ff[3] * u + p3) * Math.exp(-d[3] * u);
  }
}
function pen(ctx, g, cx, cy, R, n, a, col) { // CH consecutive strokes, the later (inner) ones a little stronger
  const p = SCR.p, K = Math.floor(n / CH);
  g.pen(ctx, 'hair', 1, col); const base = ctx.lineWidth, fl = ctx.globalAlpha;
  for (let c = 0; c < CH; c++) {
    ctx.globalAlpha = Math.min(1, a * fl * (0.55 + 0.6 * c / CH));
    ctx.beginPath(); ctx.moveTo(cx + p[c * K * 2] * R, cy + p[c * K * 2 + 1] * R);
    for (let i = c * K + 1; i <= (c + 1) * K; i++) ctx.lineTo(cx + p[i * 2] * R, cy + p[i * 2 + 1] * R);
    ctx.stroke();
  }
}

export function draw(ctx, { g }) {
  const P = g.params, n = Math.max(CH * 40, Math.round(P.segs * Math.min(1, g.q ?? 1) / CH) * CH);
  if (SCR.n < n + 1) { SCR.n = n + 1; SCR.p = new Float32Array((n + 1) * 2); }
  const wide = g.aspect > 1.3, m = Math.min(g.bx, g.by);
  // the large machine, and a small second one running on its own pendulums at its own tempo
  trace(g, g.rng('big'), 1, n);
  pen(ctx, g, wide ? -g.bx * 0.38 : 0, wide ? 0 : -g.by * 0.14, wide ? g.by * 0.92 : m * 0.95, n, P.alpha, g.c.ink);
  const ns = Math.max(CH * 20, (n / 2 / CH | 0) * CH);
  trace(g, g.rng('small'), 2, ns);
  pen(ctx, g, wide ? g.bx * 0.52 : g.bx * 0.45, wide ? g.by * 0.35 : g.by * 0.6, wide ? g.by * 0.45 : m * 0.28, ns, P.alpha * 1.3, g.c.ink);
}
