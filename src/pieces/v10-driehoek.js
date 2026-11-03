// V10 Driehoek (the impossible triangle of Reutersvard and Penrose, built from unit cubes).
// One rule: three rows of n cubes, one along each axis, drawn back to front along the path; the last cube cannot be both in front of the first and behind it, so the triangle closes where it cannot. Its hole holds a smaller copy, turned and scaled, and so on without end; the picture zooms in for ever.
export const meta = {
  id: 'v10-driehoek', pencils: true, title: 'Onmogelijke driehoek', nl: 'Onmogelijke driehoek', T: 16, still: 0.2, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'cells (0,0) -> (n,0) -> (n,n) -> (0,0) with (a,b) = (x - z, y - z): rows along x, y and z close in the picture, not in space; the paint order x + y + z has to break once',
  label: 'The impossible triangle drawn as a pencil tiling of cubes in three tones; its hole holds a smaller turned copy of itself, and so on without end, while the picture zooms in for ever and a light sweep circles each level.',
  // n: cubes per side; s: scale of each nested copy; a: its turn in degrees
  params: { n: 7, s: 0.45, a: 0 },
};

const TAU = 2 * Math.PI, C30 = Math.sqrt(3) / 2, HEX = [[0, -1], [C30, -0.5], [C30, 0.5], [0, 1], [-C30, 0.5], [-C30, -0.5]];
const hash = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };
const hexPath = (c, x, y, u) => { HEX.forEach((v, k) => k ? c.lineTo(x + v[0] * u, y + v[1] * u) : c.moveTo(x + v[0] * u, y + v[1] * u)); c.closePath(); };

// cube = {x, y (screen, in units of u), w (0..1 light sweep)}; L is in paint order, later cubes cover earlier ones
function cubes(g, c, L, u, nH, fa = 1, fe = 1, ko = 0) {
  const ex = [C30 * u, 0.5 * u], ey = [-C30 * u, 0.5 * u], ez = [0, -u], ink = g.c.ink;
  const F = [[[0, -u], ex, ey], [[C30 * u, 0.5 * u], ey, ez], [[-C30 * u, 0.5 * u], ex, ez]]; // top, right, left: O, A, B
  L.forEach((q, i) => {
    const X = q.x * u, Y = q.y * u, seg = [[], [], []], fade = (1 - 0.6 * q.w) * fa;
    F.forEach(([O, A, B], ty) => {
      const n = nH[ty], key = ((q.k ?? i) + ko) * 3 + ty, at = (s, t) => [X + O[0] + s * A[0] + t * B[0], Y + O[1] + s * A[1] + t * B[1]], ends = (k, a) => [0.04 + 0.07 * hash(key, k, a), 0.96 - 0.07 * hash(key, k, a + 2)];
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n;
        if (ty !== 1) { const [a, b] = ends(k, 1); seg[ty].push(...at(a, f), ...at(b, f)); }
        if (ty) { const [a, b] = ends(k, 0); seg[ty].push(...at(f, a), ...at(f, b)); }
        if (ty === 2) { const cc = -1 + 2 * f, lo = Math.max(0, -cc), hi = Math.min(1, 1 - cc), [a, b] = ends(k, 3), s0 = lo + (hi - lo) * a, s1 = lo + (hi - lo) * b; seg[2].push(...at(s0, s0 + cc), ...at(s1, s1 + cc)); }
      }
    });
    c.save();
    for (let j = i + 1; j < L.length; j++) if (Math.hypot(L[j].x - q.x, L[j].y - q.y) < 1.9) { c.beginPath(); c.rect(X - 1.1 * u, Y - 1.1 * u, 2.2 * u, 2.2 * u); hexPath(c, L[j].x * u, L[j].y * u, u); c.clip('evenodd'); }
    seg.forEach((a, ty) => { g.pen(c, 'hair', [0.7, 0.8, 0.9][ty] * fade, ink); c.beginPath(); for (let k = 0; k < a.length; k += 4) { c.moveTo(a[k], a[k + 1]); c.lineTo(a[k + 2], a[k + 3]); } c.stroke(); });
    g.pen(c, 'fine', 0.9 * fe, ink); c.beginPath(); hexPath(c, X, Y, u);
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
  const P = g.params, n = Math.max(3, P.n | 0), N = 3 * n, S0 = P.s, AL = P.a * Math.PI / 180, pu = g.voice(1) / TAU, fl = Math.floor(pu), zp = pu - fl, sm = g.ease.smoother;
  const pts = []; for (let i = 0; i < N; i++) { const p = path(n, i); pts.push([(p[0] - p[1]) * C30, (p[0] + p[1]) / 2]); }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), gx = n * C30 / 3, gy = n / 2; // the centroid: every nested copy turns and shrinks about it
  const hw = Math.max(...xs.map(x => Math.abs(x - gx))) + C30, hh = Math.max(...ys.map(y => Math.abs(y - gy))) + 1;
  const u0 = Math.min(g.bx / (hw * 1.0), g.by / (hh * 1.0)) * 0.96, R = Math.hypot(hw, hh) * u0 * 0.93;
  const nH = [4, 6, 8];
  ctx.save(); ctx.rotate(-Math.PI / 3 * pu); construct(g, ctx, R, u0); ctx.restore(); // the hexagon turns one sixth of a turn per loop, which closes
  for (let j = 5; j >= -1; j--) { // outermost level first; level j sits at scale s^(j - zp), so a loop carries each level onto the place of the next one out
    const w = j - zp, sg = Math.pow(S0, w), uu = u0 * sg;
    const fo = 1 - sm((sg - 1.1) / 0.9), fi = sm((uu * C30 * g.S / nH[2] - 2.2) / 2), fe = sm((uu * g.S - 2) / 5); // fade out as it leaves the frame, and as the hatch pitch drops under about 3 px
    if (fo < 0.01 || fi * fe < 0.01) continue;
    const L = pts.map((p, i) => {
      const bump = o => { const d = (((i / N - o) % 1) + 1.5) % 1 - 0.5; return Math.exp(-d * d * 40); };
      return { x: p[0] - gx, y: p[1] - gy, w: Math.max(bump(pu + w * 0.25), 0.7 * bump(g.voice(2) / TAU / 2 + 0.5 + w * 0.25)) };
    });
    ctx.save(); ctx.rotate(AL * w); cubes(g, ctx, L, uu, nH, fo * fi, fo * fe, g.live ? 64 * (j + fl) : 0); ctx.restore();
  }
}
