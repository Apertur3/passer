// F12 Metamorphosis (after M. C. Escher's tessellations; Csuri's line morphs).
// One rule: a sheet of interlocking tiles drifts sideways while their shared edges blend from one motif to another according to where they are on the page; in live mode several fronts, pockets and motif pairs wander through that field.
export const meta = {
  id: 'f12-metamorphosis', title: 'Metamorphosis', T: 12, still: 0.3, start: 0.27, aspects: ['4:5', '16:9', '1:1'],
  label: 'A sheet of hatched and empty tiles that interlock without gaps and drift sideways; their edge curves change from one shape family to another as they cross the page.',
  // cols: tiles across the short edge; periods: morph periods across the width (4:5, 1:1); periodsWide: same for 16:9; hatch: hatch spacing (S); drift: tile columns the sheet slides per loop (even); tilt, swing: hatch angle at motif A and its change toward B (rad)
  params: { cols: 8, periods: 1, periodsWide: 2, hatch: 0.0072, drift: 8, tilt: 0.6, swing: 0.7 },
};
// Edge curves are sums of half-sines k*PI*s (zero at both ends, so edges always meet at the lattice points).
// h: horizontal edges (offset along y), v: vertical edges (offset along x); amplitudes in tile sides.
const MOTIF = { A: { h: [0.04, 0.21, 0.1, -0.05], v: [0.15, -0.17, 0.06, 0.05] }, B: { h: [0.2, 0, 0, 0], v: [0.2, 0, 0, 0] } };
const N = 22, SIN = Array.from({ length: N + 1 }, (_, n) => [1, 2, 3, 4].map(k => Math.sin(k * Math.PI * n / N)));
const disp = (c, n) => c.reduce((a, v, k) => a + v * SIN[n][k], 0);

const voice = (g, k) => (g.voice ? g.voice(k) : g.theta * k); // independent phase k: detuned in live mode, integer harmonic in loop mode (falls back to the plain harmonic when the engine has no voices)
export function draw(ctx, { g }) {
  const P = g.params, wide = g.aspect > 1.5, per = wide ? P.periodsWide : P.periods, L = g.live ? 1 : 0, dr = g.drift || 0; // L: live-only variation; in loop mode dr = 0 and L = 0
  const pitch0 = (wide ? (2 * g.by) / 8 : (2 * g.bx) / P.cols) * 0.92, cols = Math.floor((2 * g.bx) / pitch0 + 1e-6), rows = Math.floor((2 * g.by) / pitch0 + 1e-6);
  const pitch = pitch0, W = cols * pitch0;
  const x0 = -cols * pitch / 2, y0 = -rows * pitch / 2, sh = P.drift * g.p + 0.2 * Math.sin(voice(g, 3)), C0 = -P.drift - 2, C1 = cols + 3, nc = C1 - C0 + 1, hs = P.hatch / g.q, vs = voice(g, 3);
  const Aeff = MOTIF.A, Beff = MOTIF.B;
  // morph field at a given x: one front crossing the width once per loop, exactly periodic in the loop phase so frame(T) = frame(0); live adds only a much slower second front and a slight stall of the main front
  const mf = x => {
    const xn = (x - x0) / (cols * pitch), s = g.ease.smoother;
    const m1 = s(0.5 - 0.5 * Math.cos(2 * Math.PI * (per * xn - g.p + 0.5 * L * Math.sin(0.05 * dr) + 0.08 * Math.sin(voice(g, 2) + 6 * xn))));
    const w = 0.3 * L * (0.5 + 0.5 * Math.sin(0.03 * dr + 2)), m2 = s(0.5 - 0.5 * Math.cos(2 * Math.PI * (1.3 * xn - 0.01 * dr + 0.3)));
    return (1 - w) * m1 + w * m2;
  };
  const mix = (a, m, n) => (1 - m) * disp(Aeff[a], n) + m * disp(Beff[a], n);
  const bx = c => x0 + (c + sh) * pitch; // x of lattice boundary c; the lattice drifts by an even number of columns per loop, so it closes
  // each edge is evaluated at its own position, so the two tiles sharing it use the very same curve
  const Hs = Array.from({ length: nc }, (_, k) => { const m = mf(bx(C0 + k + 0.5)); return Array.from({ length: N + 1 }, (_, n) => mix('h', m, n) * pitch); });
  const Vs = Array.from({ length: nc + 1 }, (_, k) => { const m = mf(bx(C0 + k)); return Array.from({ length: N + 1 }, (_, n) => mix('v', m, n) * pitch); });
  const H = (c, i, j, rev) => { for (let q = 0; q <= N; q++) { const n = rev ? N - q : q; c(bx(i) + n / N * pitch, y0 + j * pitch + Hs[i - C0][n]); } };
  const V = (c, i, j, rev) => { for (let q = 0; q <= N; q++) { const n = rev ? N - q : q; c(bx(i) + Vs[i - C0][n], y0 + (j + n / N) * pitch); } };
  const tile = (i, j) => { ctx.beginPath(); let first = true; const c = (x, y) => { first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; };
    H(c, i, j, false); V(c, i + 1, j, false); H(c, i, j + 1, true); V(c, i, j, true); ctx.closePath(); };
  ctx.save(); ctx.beginPath(); ctx.rect(-W / 2, -rows * pitch0 / 2, W, rows * pitch0); ctx.clip();
  const edges = new Path2D(), seg = (path, fn, ...a) => { let f = true; fn((x, y) => { f ? path.moveTo(x, y) : path.lineTo(x, y); f = false; }, ...a); };
  for (let j = -2; j < rows + 2; j++) for (let i = C0; i < C1; i++) {
    const cx = bx(i + 0.5), cy = y0 + (j + 0.5) * pitch;
    const dark = ((i + j) & 1) === 0, a = P.tilt + P.swing * (0.5 + 0.4 * Math.sin(vs)) * mf(cx) + (dark ? 0 : Math.PI / 2), sp = dark ? hs : hs * 2.6, D = pitch * 0.85, p = new Path2D();
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let d = -D; d <= D; d += sp) { p.moveTo(cx - dy * d - dx * D, cy + dx * d - dy * D); p.lineTo(cx - dy * d + dx * D, cy + dx * d + dy * D); }
    ctx.save(); tile(i, j); ctx.clip();
    g.pen(ctx, 'hair', 0.9, dark ? g.c.ink : g.c.tint1); ctx.stroke(p); ctx.restore();
    seg(edges, H, i, j, false); seg(edges, V, i, j, false);
  }
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.stroke(edges);
  ctx.restore();
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.strokeRect(-W / 2, -rows * pitch0 / 2, W, rows * pitch0);
}
