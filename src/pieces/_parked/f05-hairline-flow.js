// F05 Hairline flow (flow-field plots in the plotter tradition).
// One rule: thousands of hairlines are combed along a slowly drifting field that bends around an empty disc.
export const meta = {
  id: 'f05-hairline-flow', title: 'Hairline flow', T: 12, dprMax: 1, still: 0.3, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  label: 'Thousands of fine hairlines combed along a slowly drifting flow field that bends around an empty disc.',
  // lines: count at 1400 px (scaled down for smaller canvases); len: half length of a line in S; scale: field frequency;
  // void: disc radius in S; hug: how far the disc bends the field (S); drift: how far the field turns over one loop; wave: angle of the travelling wave that crosses the page once per loop; orbit: radius of the circle the noise travels along
  params: { lines: 2100, len: 0.075, scale: 2.4, void: 0.17, hug: 0.16, drift: 0.55, wave: 1.1, orbit: 0.14 },
};

const voice = (g, k) => (g.voice ? g.voice(k) : k * g.theta); // independent phase k: integer harmonic in loop mode, detuned live
const D = 0.02, PAD = 0.2, MEMO = new Map(); // field grid spacing in S; static data per (seed, size)
const bil = (a, nx, x, y) => { // bilinear lookup, x and y in grid units
  const i = x | 0, j = y | 0, fx = x - i, fy = y - j, k = j * nx + i;
  return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + nx] * (1 - fx) + a[k + nx + 1] * fx) * fy;
};
const sstep = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

function prep(g) {
  const P = g.params, N = Math.round(P.lines * Math.min(1, Math.max(0.45, g.S / 1400)));
  const key = [g.seed, g.w, g.h, N, P.scale, P.void, P.hug].join('|');
  if (MEMO.has(key)) return MEMO.get(key);
  const nx = Math.ceil((2 * g.hw + 2 * PAD) / D) + 2, ny = Math.ceil((2 * g.hh + 2 * PAD) / D) + 2, x0 = -g.hw - PAD, y0 = -g.hh - PAD;
  const r = g.rng('field'), o = Array.from({ length: 6 }, () => r() * 40), k = P.scale;
  const n = (x, y, z, w) => g.noise4(x * k + o[0], y * k + o[1], z + o[2], w + o[3]) + 0.25 * g.noise4(x * k * 2.1 + o[4], y * k * 2.1 + o[5], z + 7, w + 3);
  const cx = (r() - 0.5) * 0.1, cy = (r() - 0.5) * 0.12, R = P.void;
  const PH = new Float32Array(nx * ny), U2 = new Float32Array(nx * ny), V2 = new Float32Array(nx * ny), U = new Float32Array(nx * ny), V = new Float32Array(nx * ny), W = new Float32Array(nx * ny), TA = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * D, y = y0 + j * D, q = j * nx + i, rr = Math.hypot(x - cx, y - cy);
    PH[q] = 2 * Math.PI * (0.9 * x + 0.5 * y); U[q] = n(x, y, 0, 0); V[q] = n(x, y, 5, 5); U2[q] = n(x, y, 11, 2); V2[q] = n(x, y, 3, 13);
    W[q] = Math.exp(-Math.max(0, rr - R) / P.hug); TA[q] = Math.atan2(y - cy, x - cx) + Math.PI / 2;
  }
  // density: strands and empty paper, a halo hugging the disc, fading toward the margin box
  const dn = (x, y) => g.noise4(x * 1.5 + o[1], y * 1.5 + o[0], 3, 9) + 0.5 * g.noise4(x * 3.7 + o[2], y * 3.7 + o[3], 1, 1);
  const pts = []; let tries = 0;
  while (pts.length < N * 4 && tries++ < N * 40) {
    const x = (r() * 2 - 1) * g.bx, y = (r() * 2 - 1) * g.by, rr = Math.hypot(x - cx, y - cy);
    if (rr < R * 1.01) continue;
    const edge = sstep(0, 0.17, Math.min(g.bx - Math.abs(x), g.by - Math.abs(y)));
    const dens = (sstep(-0.15, 0.7, dn(x, y)) * 0.9 + 0.15 * Math.exp(-(rr - R) / 0.05)) * edge;
    if (r() < dens) pts.push(x, y, 0.5 + r() * 0.9, (r() * 4) | 0, r() * 0.07);
  }
  const sorted = []; for (let b = 0; b < 4; b++) for (let i = 0; i < pts.length; i += 5) if (pts[i + 3] === b) sorted.push(pts[i], pts[i + 1], pts[i + 2], b, pts[i + 4]);
  const out = { cx, cy, R, nx, x0, y0, PH, U, V, U2, V2, W, TA, pts: Float32Array.from(sorted), UV: new Float32Array(nx * ny * 2), cos: new Float32Array(nx * ny), sin: new Float32Array(nx * ny) };
  if (MEMO.size > 4) MEMO.delete(MEMO.keys().next().value);
  MEMO.set(key, out); return out;
}

export function draw(ctx, { g }) {
  const P = g.params, s = prep(g), { nx, x0, y0, PH, U, V, U2, V2, W, TA, cos, sin, cx, cy, R, pts, UV } = s, ny = U.length / nx;
  // the angle field for this phase: noise turned by the drifting basis and carried round a circle, a wave crossing the page, bent into a tangent near the disc
  const th = g.theta, c = Math.cos(th), si = Math.sin(th), v2 = voice(g, 2), c2 = 0.5 * Math.cos(v2), s2 = 0.5 * Math.sin(v2), wv = P.wave * (0.75 + 0.35 * Math.sin(voice(g, 3))), amp = P.drift * Math.PI, ox = (P.orbit * Math.cos(th)) / D, oy = (P.orbit * Math.sin(th)) / D;
  for (let q = 0; q < U.length; q++) {
    const gx = Math.min(nx - 2.01, Math.max(0, (q % nx) - ox)), gy = Math.min(ny - 2.01, Math.max(0, ((q / nx) | 0) - oy));
    const a0 = amp * (bil(U, nx, gx, gy) * c + bil(V, nx, gx, gy) * si + bil(U2, nx, gx, gy) * c2 + bil(V2, nx, gx, gy) * s2) + wv * Math.sin(PH[q] - th) + 0.6;
    let d = TA[q] - a0; d -= 6.283185307 * Math.round(d / 6.283185307);
    const a = a0 + W[q] * d; cos[q] = Math.cos(a); sin[q] = Math.sin(a);
  }
  const step = 0.009, bx = g.bx, by = g.by, R2 = R * R * 1.0201, alphas = [0.3, 0.45, 0.65, 0.9], base = P.len / step;
  const total = Math.floor(pts.length / 5 * Math.min(1, g.q ?? 1)); // seeds are sorted by alpha bucket; q thins every bucket evenly via a stride below
  const trace = (x, y, sgn, n, mg) => { // follow the field from (x, y) for n steps, adding to the open path
    ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      const gx = (x - x0) / D, gy = (y - y0) / D, vx = bil(cos, nx, gx, gy), vy = bil(sin, nx, gx, gy), m = sgn * step / (Math.sqrt(vx * vx + vy * vy) || 1);
      x += vx * m; y += vy * m;
      if (x > bx - mg || x < mg - bx || y > by - mg || y < mg - by || (x - cx) * (x - cx) + (y - cy) * (y - cy) < R2) break;
      ctx.lineTo(x, y);
    }
  };
  const stride = Math.max(1, Math.round(1 / Math.min(1, g.q ?? 1)));
  let bkt = -1;
  for (let i = 0, k = 0; k < total * stride && i < pts.length; i += 5, k++) {
    if (k % stride) continue;
    if (pts[i + 3] !== bkt) { if (bkt >= 0) ctx.stroke(); bkt = pts[i + 3]; g.pen(ctx, 'hair', alphas[bkt], g.c.ink); ctx.beginPath(); }
    const n = Math.round(base * pts[i + 2]), ph = 6.283185307 * (0.9 * pts[i] + 0.5 * pts[i + 1]) - th, sx = pts[i] + 0.06 * Math.cos(ph), sy = pts[i + 1] + 0.06 * Math.sin(ph); // seeds ride the wave too
    trace(sx, sy, -1, n, pts[i + 4]); trace(sx, sy, 1, n, pts[i + 4]); // two halves meeting at the seed
  }
  if (bkt >= 0) ctx.stroke();
  g.pen(ctx, 'fine', 0.7, g.c.ink); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  // the one deliberate deviation: a single long strand that rides the edge of the disc
  const ar = g.rng('accent')() * 6.28 + th, // the strand circles the disc once per loop
     rr = R * 1.22, ax = cx + Math.cos(ar) * rr, ay = cy + Math.sin(ar) * rr;
  g.pen(ctx, 'line', 1, g.c.accent); ctx.beginPath(); trace(ax, ay, 1, 47, 0); trace(ax, ay, -1, 47, 0); ctx.stroke();
}
