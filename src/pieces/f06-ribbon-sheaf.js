// F06 Ribbon sheaf (translucent ribbon surfaces drawn as plotter hairlines).
// One rule: one Lissajous curve is copied a few hundred times, each copy turned a little further than the last, until the copies read as a folded translucent ribbon.
export const meta = {
  id: 'f06-ribbon-sheaf', title: 'Ribbon sheaf', T: 12, still: 0.5, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  label: 'One looping curve copied a few hundred times, each copy turned slightly further, so the hairlines build a folded translucent ribbon.',
  // copies: number of offset copies; sweep: total turn from first to last copy (rad); twist: extra in-plane turn along the sheaf (rad);
  // alpha: ink alpha of one copy; seg: segments per copy at 1400 px (fewer on small canvases)
  params: { copies: 240, sweep: 1.3, twist: 1.3, alpha: 0.14, seg: 220 },
};

const voice = (g, k) => (g.voice ? g.voice(k) : k * g.theta); // independent phase k: integer harmonic in loop mode, detuned live
const SEGS = 20000, BUCKETS = 3; // segment budget per frame at q = 1
// Lissajous frequency triples (x, y, z); picked by seed
const SETS = [[1, 2, 1], [2, 3, 1], [1, 3, 2], [2, 1, 3], [3, 2, 1]];

const SCR = { n: 0, bx: null, by: null, bz: null, pts: null, env: null }; // scratch buffers reused across frames (only grown, never read across frames)
export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('curve'), f = SETS[Math.floor(r() * SETS.length)];
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28], amp = [1, 0.8 + 0.2 * r(), 0.45 + 0.2 * r()];
  const N = Math.round(P.copies * Math.min(1, g.q ?? 1)), M = Math.max(40, Math.min(Math.round(P.seg * Math.min(1, Math.max(0.4, g.S / 1400))), Math.floor(SEGS / Math.max(1, N))));
  if (SCR.n < (N + 1) * (M + 1)) { SCR.n = (N + 1) * (M + 1); SCR.pts = new Float32Array(SCR.n * 2); SCR.env = new Float32Array(N + 2); }
  if (!SCR.bx || SCR.bx.length < M + 1) { SCR.bx = new Float32Array(M + 1); SCR.by = new Float32Array(M + 1); SCR.bz = new Float32Array(M + 1); }
  const { bx, by, bz, pts, env } = SCR;
  for (let i = 0; i <= M; i++) { // the base curve, closed
    const s = (i / M) * 2 * Math.PI;
    bx[i] = amp[0] * Math.sin(f[0] * s + ph[0]); by[i] = amp[1] * Math.sin(f[1] * s + ph[1]); bz[i] = amp[2] * Math.sin(f[2] * s + ph[2] + voice(g, 1));
  }
  const b = 0.5 - 0.5 * Math.cos(voice(g, 2)), sweep = P.sweep * (0.65 + 0.7 * b), twist = P.twist * (0.7 + 0.5 * Math.sin(voice(g, 3)));
  const slide = g.p; // the whole sheaf slides one copy-step per loop
  const px = 0.05 * Math.cos(g.theta), py = 0.05 * Math.sin(g.theta), sc = Math.min(g.bx, g.by) * 0.78, tilt = 0.5 + 0.1 * r() + 0.3 * Math.sin(g.drift * 0.2); // drift: slow unbounded time, 0 in loop mode
  const ct = Math.cos(tilt), st = Math.sin(tilt), W = M + 1;
  const place = (u, o) => { // copy at position u in [0, 1] along the sheaf, written at offset o in pts
    const a = (u - 0.5) * sweep, ca = Math.cos(a), sa = Math.sin(a), tw = (u - 0.5) * twist, cw = Math.cos(tw), sw = Math.sin(tw);
    for (let i = 0; i <= M; i++) {
      const x = bx[i] * ca + bz[i] * sa, z = -bx[i] * sa + bz[i] * ca, y = by[i] * ct - z * st, zz = by[i] * st + z * ct, k = 1 / (1 - zz * 0.18);
      pts[o + i * 2] = (x * cw - y * sw) * k * sc + px; pts[o + i * 2 + 1] = (x * sw + y * cw) * k * sc + py;
    }
  };
  for (let c = 0; c <= N; c++) { // all copies are placed once, then stroked one path per alpha bucket
    const u = (c + slide) / N, e = u > 1 ? 0 : Math.pow(Math.sin(Math.PI * u), 1.6);
    env[c] = e; if (e >= 0.02) place(u, c * W * 2);
  }
  for (let q = 0; q < BUCKETS; q++) {
    g.pen(ctx, 'hair', P.alpha * (0.3 + 0.9 * (q + 0.5) / BUCKETS), g.c.ink); ctx.beginPath();
    for (let c = 0; c <= N; c++) {
      if (env[c] < 0.02 || Math.min(BUCKETS - 1, Math.floor(env[c] * BUCKETS)) !== q) continue;
      const o = c * W * 2; ctx.moveTo(pts[o], pts[o + 1]);
      for (let i = 1; i <= M; i++) ctx.lineTo(pts[o + i * 2], pts[o + i * 2 + 1]);
    }
    ctx.stroke();
  }
}
