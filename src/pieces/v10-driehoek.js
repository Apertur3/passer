// V10 Driehoek (the impossible triangle of Reutersvard and Penrose, built from unit cubes).
// One rule: three rows of n cubes, one along each axis, drawn back to front along the path; the last cube cannot be both in front of the first and behind it, so the triangle closes where it cannot.
export const meta = {
  id: 'v10-driehoek', pencils: true, title: 'Onmogelijke driehoek', nl: 'Onmogelijke driehoek', T: 64, still: 0.2, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'cells (0,0) -> (n,0) -> (n,n) -> (0,0) with (a,b) = (x - z, y - z): rows along x, y and z close in the picture, not in space; the paint order x + y + z has to break once',
  label: 'The impossible triangle drawn as a pencil tiling of cubes in three tones; a wave of hatch density runs round the loop one way for ever, from bare to crosshatched, while the whole drawing turns slowly.',
  // n: cubes per side
  params: { n: 7, construction: 0 },
};

const TAU = 2 * Math.PI, C30 = Math.sqrt(3) / 2, HEX = [[0, -1], [C30, -0.5], [C30, 0.5], [0, 1], [-C30, 0.5], [-C30, -0.5]];
const hash = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };
const hexPath = (c, x, y, u) => { HEX.forEach((v, k) => k ? c.lineTo(x + v[0] * u, y + v[1] * u) : c.moveTo(x + v[0] * u, y + v[1] * u)); c.closePath(); };

// cube = {x, y (screen, in units of u), w (hatch density 0..1.15)}; L is in paint order, later cubes cover earlier ones.
// Every hairline has a threshold: it fades in once the density passes it (main family first, then the cross family), so the density runs bare, sparse, medium, crosshatched with no pop.
function cubes(g, c, L, u, nH) {
  const ex = [C30 * u, 0.5 * u], ey = [-C30 * u, 0.5 * u], ez = [0, -u], ink = g.c.ink, cl = v => Math.min(1, Math.max(0, v));
  const F = [[[0, -u], ex, ey], [[C30 * u, 0.5 * u], ey, ez], [[-C30 * u, 0.5 * u], ex, ez]]; // top, right, left: O, A, B
  L.forEach((q, i) => {
    const X = q.x * u, Y = q.y * u, seg = Array.from({ length: 24 }, () => []);
    F.forEach(([O, A, B], ty) => {
      const n = nH[ty], key = i * 3 + ty, d = q.w * [0.88, 0.96, 1.04][ty], at = (s, t) => [X + O[0] + s * A[0] + t * B[0], Y + O[1] + s * A[1] + t * B[1]], ends = (k, a) => [0.04 + 0.07 * hash(key, k, a), 0.96 - 0.07 * hash(key, k, a + 2)];
      const put = (a, p1, p2) => { const l = Math.round(7 * cl(a)); if (l) seg[ty * 8 + l].push(...p1, ...p2); };
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n, a1 = (d - (f * 0.7 + 0.1 * hash(key, k, 7))) / 0.2, a2 = (d - (0.78 + 0.1 * hash(key, k, 8) + 0.1 * f)) / 0.2, [s0, s1] = ends(k, 1);
        if (ty === 0) { put(a1, at(s0, f), at(s1, f)); put(a2, at(f, s0), at(f, s1)); }
        else if (ty === 1) { put(a1, at(f, s0), at(f, s1)); put(a2, at(s0, f), at(s1, f)); }
        else { put(a1, at(f, s0), at(f, s1)); const cc = -1 + 2 * f, lo = Math.max(0, -cc), hi = Math.min(1, 1 - cc), t0 = lo + (hi - lo) * s0, t1 = lo + (hi - lo) * s1; put(a2, at(t0, t0 + cc), at(t1, t1 + cc)); }
      }
    });
    c.save();
    for (let j = i + 1; j < L.length; j++) if (Math.hypot(L[j].x - q.x, L[j].y - q.y) < 1.9) { c.beginPath(); c.rect(X - 1.1 * u, Y - 1.1 * u, 2.2 * u, 2.2 * u); hexPath(c, L[j].x * u, L[j].y * u, u); c.clip('evenodd'); }
    seg.forEach((a, k) => { if (!a.length) return; g.pen(c, 'fine', [0.8, 0.9, 1][k >> 3] * (k & 7) / 7, ink); c.beginPath(); for (let m = 0; m < a.length; m += 4) { c.moveTo(a[m], a[m + 1]); c.lineTo(a[m + 2], a[m + 3]); } c.stroke(); });
    g.pen(c, 'fine', 0.95, ink); c.beginPath(); hexPath(c, X, Y, u);
    [HEX[1], HEX[5], HEX[3]].forEach(v => { c.moveTo(X, Y); c.lineTo(X + v[0] * u, Y + v[1] * u); }); c.stroke();
    c.restore();
  });
}
// construction: circle through the corners, the three axes with unit ticks, a hexagon, its sides run on past the corners
function construct(g, c, R, u) {
  const br = 0, pa = 1, ext = 0.2 * R, hv = HEX.map(v => [v[0] * R, v[1] * R]);
  g.pen(c, 'hair', 0.6 * pa, g.c.tint1); c.beginPath();
  c.moveTo(R * (1 + 0.012 * br), 0); c.arc(0, 0, R * (1 + 0.012 * br), 0, TAU); c.moveTo(R * C30, 0); c.arc(0, 0, R * C30 * (1 - 0.01 * br), 0, TAU);
  for (const d of [[C30, 0.5], [-C30, 0.5], [0, -1]]) {
    c.moveTo(-d[0] * R * 1.2, -d[1] * R * 1.2); c.lineTo(d[0] * R * 1.2, d[1] * R * 1.2);
    for (let k = -Math.floor(R / u * 1.2); k <= R / u * 1.2; k++) if (k) c.moveTo(d[0] * k * u - d[1] * 0.1 * u, d[1] * k * u + d[0] * 0.1 * u), c.lineTo(d[0] * k * u + d[1] * 0.1 * u, d[1] * k * u - d[0] * 0.1 * u);
  }
  for (let i = 0; i < 6; i++) { const a = hv[i], b = hv[(i + 1) % 6], dx = (b[0] - a[0]) / R, dy = (b[1] - a[1]) / R; c.moveTo(a[0] - dx * ext, a[1] - dy * ext); c.lineTo(b[0] + dx * ext, b[1] + dy * ext); }
  c.stroke();
}


const path = (n, i) => i < n ? [i, 0] : i < 2 * n ? [n, i - n] : [n - (i - 2 * n), n - (i - 2 * n)];

export function draw(ctx, { g }) {
  const n = Math.max(3, g.params.n | 0), N = 3 * n, ph = g.voice(1) / TAU, live = g.live, P = N / 3;
  const pts = []; for (let i = 0; i < N; i++) { const p = path(n, i); pts.push([(p[0] - p[1]) * C30, (p[0] + p[1]) / 2]); }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = Math.max(...pts.map(p => Math.hypot(p[0] - cx, p[1] - cy))) + 1, u = Math.min(g.bx, g.by) / r * 1.06, R = r * u * 0.93;
  const nH = [0, 1, 2].map(t => Math.max(2, Math.round(C30 * u / (0.0062 * [1.6, 1.2, 1][t]))));
  // the wave: one cell about every 0.7 s, one way. Loop: 13 periods of 7 cells per T. Live: its speed and its length wander (the speed stays positive)
  const phi = live ? 13 * ph + 1.2 * Math.sin(g.drift * 0.13) : 13 * ph, eps = live ? 0.12 * Math.sin(g.drift * 0.07) : 0;
  const L = pts.map((p, i) => ({ x: p[0] - cx, y: p[1] - cy, w: 1.15 * (0.5 + 0.5 * Math.cos(TAU * (i / P * (1 + eps) - phi))) }));
  if (g.params.construction) { ctx.save(); ctx.rotate(ph); construct(g, ctx, R, u); ctx.restore(); }
  ctx.save(); ctx.rotate(ph); cubes(g, ctx, L, u, nH); ctx.restore(); // one full turn per loop, 5.6 degrees per second, one way for ever
}
