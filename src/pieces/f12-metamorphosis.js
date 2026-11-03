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
const tab = c => Float64Array.from({ length: N + 1 }, (_, n) => c.reduce((a, v, k) => a + v * SIN[n][k], 0)); // edge displacement of one motif at the N+1 sample points
const DH = [tab(MOTIF.A.h), tab(MOTIF.B.h)], DV = [tab(MOTIF.A.v), tab(MOTIF.B.v)];

const voice = (g, k) => (g.voice ? g.voice(k) : g.theta * k); // independent phase k: detuned in live mode, integer harmonic in loop mode (falls back to the plain harmonic when the engine has no voices)
export function draw(ctx, { g }) {
  const P = g.params, wide = g.aspect > 1.5, per = wide ? P.periodsWide : P.periods, L = g.live ? 1 : 0, dr = g.drift || 0; // L: live-only variation; in loop mode dr = 0 and L = 0
  const pitch0 = (wide ? (2 * g.by) / 8 : (2 * g.bx) / P.cols) * 0.92, cols = Math.floor((2 * g.bx) / pitch0 + 1e-6), rows = Math.floor((2 * g.by) / pitch0 + 1e-6);
  const pitch = pitch0, W = cols * pitch0;
  const x0 = -cols * pitch / 2, y0 = -rows * pitch / 2, sh = P.drift * g.p + 0.2 * Math.sin(voice(g, 3)), C0 = -P.drift - 2, C1 = cols + 3, nc = C1 - C0 + 1, hs = P.hatch / g.q, vs = voice(g, 3);
  // morph field at a given x: one front crossing the width once per loop, exactly periodic in the loop phase so frame(T) = frame(0); live adds only a much slower second front and a slight stall of the main front
  const mf = x => {
    const xn = (x - x0) / (cols * pitch), s = g.ease.smoother;
    const m1 = s(0.5 - 0.5 * Math.cos(2 * Math.PI * (per * xn - g.p + 0.5 * L * Math.sin(0.05 * dr) + 0.08 * Math.sin(voice(g, 2) + 6 * xn))));
    const w = 0.3 * L * (0.5 + 0.5 * Math.sin(0.03 * dr + 2)), m2 = s(0.5 - 0.5 * Math.cos(2 * Math.PI * (1.3 * xn - 0.01 * dr + 0.3)));
    return (1 - w) * m1 + w * m2;
  };
  const bx = c => x0 + (c + sh) * pitch; // x of lattice boundary c; the lattice drifts by an even number of columns per loop, so it closes
  // per column: one morph value, evaluated at the column's own position; the horizontal edge of the column and the hatch angle use it, the vertical edge on its left boundary uses its own.
  // Each edge is evaluated at its own position, so the two tiles sharing it use the very same curve.
  const lo = Math.max(C0, Math.floor(-W / 2 / pitch - x0 / pitch - sh) - 1), hi = Math.min(C1, Math.ceil(W / 2 / pitch - x0 / pitch - sh) + 2); // only the columns that reach the window
  const Hs = [], Vs = [], Ma = [];
  for (let i = lo; i <= hi; i++) {
    const m = mf(bx(i + 0.5)), mv = mf(bx(i)), h = new Float64Array(N + 1), v = new Float64Array(N + 1);
    for (let n = 0; n <= N; n++) { h[n] = ((1 - m) * DH[0][n] + m * DH[1][n]) * pitch; v[n] = ((1 - mv) * DV[0][n] + mv * DV[1][n]) * pitch; }
    Hs[i - lo] = h; Vs[i - lo] = v; Ma[i - lo] = m;
  }
  const Vr = (() => { const m = mf(bx(hi + 1)), v = new Float64Array(N + 1); for (let n = 0; n <= N; n++) v[n] = ((1 - m) * DV[0][n] + m * DV[1][n]) * pitch; return v; })();
  const PX = new Float64Array(4 * N), PY = new Float64Array(4 * N), TS = [];
  const outline = (i, j) => { // one closed outline in PX/PY: bottom edge, right edge, top edge back, left edge back
    const k = i - lo, h = Hs[k], v = Vs[k], v2 = Vs[k + 1], xl = bx(i), xr = bx(i + 1), yb = y0 + j * pitch, yt = yb + pitch; let m = 0;
    for (let n = 0; n < N; n++, m++) { PX[m] = xl + n / N * pitch; PY[m] = yb + h[n]; }
    for (let n = 0; n < N; n++, m++) { PX[m] = xr + v2[n]; PY[m] = yb + n / N * pitch; }
    for (let n = N; n > 0; n--, m++) { PX[m] = xl + n / N * pitch; PY[m] = yt + h[n]; }
    for (let n = N; n > 0; n--, m++) { PX[m] = xl + v[n]; PY[m] = yb + n / N * pitch; }
  };
  ctx.save(); ctx.beginPath(); ctx.rect(-W / 2, -rows * pitch0 / 2, W, rows * pitch0); ctx.clip(); ctx.lineCap = 'butt'; ctx.lineJoin = 'bevel';
  const edges = new Path2D();
  for (let dk = 0; dk < 2; dk++) { // two tones, one path and one stroke each; dark tiles hatch finely in ink, light tiles coarsely in the tint, at right angles
    g.pen(ctx, 'hair', 0.9, dk ? g.c.tint1 : g.c.ink); ctx.beginPath();
    for (let i = lo; i < hi; i++) {
      const cx = bx(i + 0.5), a = P.tilt + P.swing * (0.5 + 0.4 * Math.sin(vs)) * Ma[i - lo] + (dk ? Math.PI / 2 : 0), sp = dk ? hs * 2.6 : hs, D = pitch * 0.85, dx = Math.cos(a), dy = Math.sin(a);
      for (let j = -1; j <= rows; j++) {
        if ((((i + j) & 1) === 0) === !!dk) continue;
        const cy = y0 + (j + 0.5) * pitch; outline(i, j);
        for (let d = -D; d <= D; d += sp) { // hatch line at offset d, cut to the tile outline (and to +-D along the line)
          TS.length = 0;
          for (let q = 0, r = 4 * N - 1; q < 4 * N; r = q++) {
            const u0 = -dy * (PX[r] - cx) + dx * (PY[r] - cy) - d, u1 = -dy * (PX[q] - cx) + dx * (PY[q] - cy) - d;
            if ((u0 < 0) !== (u1 < 0)) { const f = u0 / (u0 - u1); TS.push(dx * (PX[r] - cx + f * (PX[q] - PX[r])) + dy * (PY[r] - cy + f * (PY[q] - PY[r]))); }
          }
          TS.sort((x, y) => x - y);
          for (let q = 0; q + 1 < TS.length; q += 2) {
            const t0 = Math.max(TS[q], -D), t1 = Math.min(TS[q + 1], D); if (t1 <= t0) continue;
            ctx.moveTo(cx - dy * d + dx * t0, cy + dx * d + dy * t0); ctx.lineTo(cx - dy * d + dx * t1, cy + dx * d + dy * t1);
          }
        }
      }
    }
    ctx.stroke();
  }
  for (let i = lo; i < hi; i++) for (let j = -1; j <= rows; j++) { // outlines: each tile's bottom and left edge, so every shared edge is drawn once
    const k = i - lo, h = Hs[k], v = Vs[k], xl = bx(i), yb = y0 + j * pitch;
    edges.moveTo(xl, yb + h[0]); for (let n = 1; n <= N; n++) edges.lineTo(xl + n / N * pitch, yb + h[n]);
    edges.moveTo(xl + v[0], yb); for (let n = 1; n <= N; n++) edges.lineTo(xl + v[n], yb + n / N * pitch);
  }
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.stroke(edges);
  ctx.restore();
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.strokeRect(-W / 2, -rows * pitch0 / 2, W, rows * pitch0);
}
