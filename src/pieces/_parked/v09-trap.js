// V09 Trap (the endless staircase, after Penrose and Escher's Ascending and Descending).
// One rule: a closed ring of unit cubes, each one step up-and-forward of the last, drawn back to front along the path; the last cube cannot be both in front of the first and behind it, so the stairs climb for ever, and the tones run round the ring one way for ever.
export const meta = {
  id: 'v09-trap', pencils: true, title: 'Trap', nl: 'Trap', T: 16, still: 0.3, start: 0.2, aspects: ['4:5', '16:9', '1:1'],
  math: 'cell (a,b) = projection of cube (x,y,z) with a = x - z, b = y - z; flights step (0,-1), (-1,0), (0,1), (1,0); the cells close, the depths x+y+z (the paint order) do not',
  label: 'A square ring of isometric cubes drawn as a pencil staircase in three tones: four flights, each rising into the next, so the stairs climb for ever; a repeating light, mid, dark, mid pattern and four small marks run round it one way for ever.',
  // n: steps per flight; pitch: hatch spacing in S
  params: { n: 5, pitch: 0.0078 },
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
      const n = nH[ty], key = (i + ko) * 3 + ty, at = (s, t) => [X + O[0] + s * A[0] + t * B[0], Y + O[1] + s * A[1] + t * B[1]], ends = (k, a) => [0.04 + 0.07 * hash(key, k, a), 0.96 - 0.07 * hash(key, k, a + 2)];
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

export function draw(ctx, { g }) {
  const P = g.params, n = Math.max(2, P.n | 0), N = 4 * n, ph = g.voice(1) / TAU + (g.live ? 0.05 * Math.sin(g.drift * 0.21) : 0); // live: the speed wanders, never reverses
  // the ring of cells (a,b): flights step (0,-1), (-1,0), (0,1), (1,0); screen = a ex + b ey
  const cell = []; let a = 0, b = 0;
  for (const [da, db] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) for (let k = 0; k < n; k++) { cell.push([a, b]); a += da; b += db; }
  const pts = cell.map(([a, b]) => [(a - b) * C30, (a + b) / 2]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const hw = (Math.max(...xs) - Math.min(...xs)) / 2 + C30, hh = (Math.max(...ys) - Math.min(...ys)) / 2 + 1;
  const u = Math.min(g.bx / (hw * 1.1), g.by / (hh * 1.1)) * 0.97, R = Math.hypot(hw, hh) * u * 0.93;
  const nH = [0, 1, 2].map(t => Math.max(2, Math.round(C30 * u / (P.pitch * [1.8, 1.25, 1][t]))));
  // tones in a repeating pattern light, mid, dark, mid that runs round the ring: two periods per loop (live: a slightly different speed)
  const q = g.voice(2) / TAU, L = pts.map((p, i) => ({ x: p[0] - cx, y: p[1] - cy, w: 1.5 * (0.5 + 0.5 * Math.cos(TAU * (i / 4 - q))) }));
  ctx.save(); ctx.rotate(-Math.PI / 3 * ph); construct(g, ctx, R, u); ctx.restore(); // the hexagon turns one sixth per loop, which closes
  cubes(g, ctx, L, u, nH);
  // four marks walk up the flights, one gap per loop, hopping from step to step
  ctx.fillStyle = g.c.ink; ctx.globalAlpha = 0.9; ctx.beginPath();
  for (let j = 0; j < 4; j++) {
    const s = (((ph * n + j * n) % N) + N) % N, k = Math.floor(s), f = s - k, e = g.ease.sine(f), p = L[k], r = L[(k + 1) % N];
    const x = (p.x + (r.x - p.x) * e) * u, y = (p.y + (r.y - p.y) * e - 0.5 - 0.35 * Math.sin(Math.PI * f)) * u;
    ctx.moveTo(x + 0.06 * u, y); ctx.arc(x, y, 0.06 * u, 0, TAU);
  }
  ctx.fill(); ctx.globalAlpha = 1;
}
