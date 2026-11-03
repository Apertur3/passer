// F08 Iso-bands (contour tiles in the plotter tradition; stands in for reaction-diffusion and zebra patterns).
// One rule: a smooth warped field drifts through the page and is cut into evenly spaced contour lines, every fifth one drawn heavier.
export const meta = {
  id: 'f08-iso-bands', title: 'Iso-bands', T: 16, still: 0.3, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  label: 'Evenly spaced contour lines of a slowly drifting warped field, splitting and merging like the bands of a topographic map.',
  // bands: contour levels across the field range; warp: strength of the domain warp (S); scale: field frequency;
  // drift: how far the field turns over one loop; orbit: radius of the circle the whole field travels along; cell: marching grid pitch (S)
  params: { bands: 25, warp: 0.22, scale: 1.4, drift: 0.25, orbit: 0.05, cell: 0.0075 },
};

const voice = (g, k) => (g.voice ? g.voice(k) : k * g.theta); // independent phase k: integer harmonic in loop mode, detuned live
const D = 0.02, MEMO = new Map(); // noise grid spacing in S; static data per (seed, size)
const bil = (a, nx, x, y) => { // bilinear lookup, x and y in grid units
  const i = x | 0, j = y | 0, fx = x - i, fy = y - j, k = j * nx + i;
  return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + nx] * (1 - fx) + a[k + nx + 1] * fx) * fy;
};

function prep(g) {
  const P = g.params, key = [g.seed, g.w, g.h, P.scale].join('|');
  if (MEMO.has(key)) return MEMO.get(key);
  const M = 0.4, nx = Math.ceil((2 * g.hw + 2 * M) / D) + 2, ny = Math.ceil((2 * g.hh + 2 * M) / D) + 2, x0 = -g.hw - M, y0 = -g.hh - M;
  const r = g.rng('field'), o = Array.from({ length: 4 }, () => r() * 40), k = P.scale, A = {}, N = nx * ny;
  ['ga', 'gb', 'gc', 'gd', 'xa', 'xb', 'ya', 'yb'].forEach(n => (A[n] = new Float32Array(N)));
  const f = (x, y, z, w) => g.noise4(x * k + o[0], y * k + o[1], z + o[2], w + o[3]) + 0.35 * g.noise4(x * k * 2.3 + o[1], y * k * 2.3 + o[0], z + 9, w + 5);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * D, y = y0 + j * D, q = j * nx + i;
    A.ga[q] = f(x, y, 0, 0); A.gb[q] = f(x, y, 4, 4); A.gc[q] = f(x, y, 10, 1); A.gd[q] = f(x, y, 2, 12);
    A.xa[q] = g.noise4(x * k * 0.7 + o[2], y * k * 0.7 + o[3], 2, 2); A.xb[q] = g.noise4(x * k * 0.7 + o[2], y * k * 0.7 + o[3], 6, 6);
    A.ya[q] = g.noise4(x * k * 0.7 + o[3], y * k * 0.7 + o[2], 8, 8); A.yb[q] = g.noise4(x * k * 0.7 + o[3], y * k * 0.7 + o[2], 3, 7);
  }
  const out = { nx, ny, x0, y0, A, ax: (r() - 0.5) * 0.5, ay: (r() - 0.5) * 0.5 };
  if (MEMO.size > 4) MEMO.delete(MEMO.keys().next().value);
  MEMO.set(key, out); return out;
}

// marching squares: for the case bits (a b c d clockwise from top-left), the edge pairs to join.
// edges: 0 top, 1 right, 2 bottom, 3 left
const CASES = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [3, 1], [0, 1], [3, 0], []];

export function draw(ctx, { g }) {
  const P = g.params, s = prep(g), { nx, ny, x0, y0, A, ax, ay } = s;
  const th = g.theta * P.drift, c = Math.cos(th), si = Math.sin(th), v2 = voice(g, 2), c2 = 0.35 * Math.cos(v2), s2 = 0.35 * Math.sin(v2), warp = P.warp * (1 + 0.35 * Math.sin(voice(g, 3)));
  const ox = P.orbit * Math.cos(g.theta), oy = P.orbit * Math.sin(g.theta), cell = P.cell / Math.sqrt(Math.min(1, g.q ?? 1)), cols = Math.floor((2 * g.bx) / cell), rows = Math.floor((2 * g.by) / cell), px = -(cols * cell) / 2, py = -(rows * cell) / 2;
  const F = new Float32Array((cols + 1) * (rows + 1)), W = cols + 1;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const x = px + i * cell + ox, y = py + j * cell + oy, gx = (x - x0) / D, gy = (y - y0) / D;
    const wx = x + warp * (bil(A.xa, nx, gx, gy) * c + bil(A.xb, nx, gx, gy) * si), wy = y + warp * (bil(A.ya, nx, gx, gy) * c + bil(A.yb, nx, gx, gy) * si);
    const qx = Math.min(nx - 2.01, Math.max(0, (wx - x0) / D)), qy = Math.min(ny - 2.01, Math.max(0, (wy - y0) / D));
    F[j * W + i] = bil(A.ga, nx, qx, qy) * c + bil(A.gb, nx, qx, qy) * si + bil(A.gc, nx, qx, qy) * c2 + bil(A.gd, nx, qx, qy) * s2;
  }
  // contour levels; every fifth is a major line, and one major level carries the accent where it crosses a small disc
  const L = P.bands, lo = -1.3, step = 2.6 / L, minor = new Path2D(), major = new Path2D(), acc = new Path2D();
  const hot = Math.round(L / 10) * 5, cx = ax * g.bx * 2 + 0.5 * g.bx * Math.cos(g.theta), cy = ay * g.by * 2 + 0.5 * g.by * Math.sin(g.theta), hr = 0.16; // the accent patch travels round the page once per loop
  const put = (i, j, e, k0) => { // point on edge e of cell (i, j) at level lv: interpolate the two corner values
    // corners: a (i,j) b (i+1,j) c (i+1,j+1) d (i,j+1)
    const [u, v] = e === 0 ? [[i, j], [i + 1, j]] : e === 1 ? [[i + 1, j], [i + 1, j + 1]] : e === 2 ? [[i, j + 1], [i + 1, j + 1]] : [[i, j], [i, j + 1]];
    const f0 = F[u[1] * W + u[0]], f1 = F[v[1] * W + v[0]], t = (k0 - f0) / (f1 - f0);
    return [px + (u[0] + (v[0] - u[0]) * t) * cell, py + (u[1] + (v[1] - u[1]) * t) * cell];
  };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = F[j * W + i], b = F[j * W + i + 1], cc = F[(j + 1) * W + i + 1], d = F[(j + 1) * W + i];
    const mn = Math.min(a, b, cc, d), mx = Math.max(a, b, cc, d);
    for (let k = Math.ceil((mn - lo) / step); k <= Math.floor((mx - lo) / step); k++) {
      if (k < 0 || k > L) continue;
      const lv = lo + k * step, cs = CASES[(a >= lv ? 1 : 0) | (b >= lv ? 2 : 0) | (cc >= lv ? 4 : 0) | (d >= lv ? 8 : 0)];
      for (let q = 0; q < cs.length; q += 2) {
        const p = put(i, j, cs[q], lv), p2 = put(i, j, cs[q + 1], lv);
        const path = k === hot && Math.hypot(p[0] - cx, p[1] - cy) < hr ? acc : k % 5 === 0 ? major : minor;
        path.moveTo(p[0], p[1]); path.lineTo(p2[0], p2[1]);
      }
    }
  }
  ctx.lineCap = 'butt'; // segments are one cell long; round caps would double the ink at every joint and print the grid
  g.pen(ctx, 'fine', 0.9, g.c.ink); ctx.stroke(minor);
  g.pen(ctx, 'line', 0.95, g.c.ink); ctx.stroke(major);
  g.pen(ctx, 'line', 1, g.c.accent); ctx.stroke(acc);
}
