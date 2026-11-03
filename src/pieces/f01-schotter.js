// F01 Schotter drift (after Georg Nees, c. 1968, with Vera Molnar's nested squares).
// One rule: order and disorder trade places across a lattice of squares, in drifting patches, nested squares and slow rings of order.
export const meta = {
  id: 'f01-schotter', title: 'Schotter drift', T: 16, still: 0.56, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  label: 'A lattice of squares where order and disorder trade places in drifting patches, some squares opening into nested ones, while slow rings of order cross the sheet.',
  // cells: approximate number of squares; maxAngle (rad) and maxShift (pitches) at full disorder; orbit: circulating offset of disordered squares (pitches);
  // swell: amplitude (S) of the slow long-wave ripple that carries the whole lattice; gap: space between neighbours
  params: { cells: 430, maxAngle: 0.18, maxShift: 0.55, orbit: 0.35, swell: 0.018, gap: 0.14 },
};

const TAU = 2 * Math.PI, WEIGHT = ['hair', 'fine', 'line', 'bold', 'hair', 'fine'], ALPHA = [0.95, 0.95, 1, 1, 0.9, 1];

// a smooth field in about [-2, 2]: a few travelling plane waves; the voice numbers set how each one moves over a loop
function field(r, cs) {
  const w = cs.map(c => { const a = r() * TAU, k = 3.5 + 4 * r(); return { kx: k * Math.cos(a), ky: k * Math.sin(a), ph: r() * TAU, c: c * (r() < 0.5 ? -1 : 1) }; });
  return (x, y, v, dr) => { let s = 0; for (const q of w) s += Math.sin(q.kx * x + q.ky * y + q.ph + (q.c > 0 ? v(q.c) : -v(-q.c)) + 0.16 * dr * (Math.abs(q.c) & 3)); return s / Math.sqrt(w.length / 2); };
}

export function draw(ctx, { t, g }) {
  const P = g.params, r = g.rng('cells'), T = meta.T, sm = g.ease.smoother, v = g.voice;
  const area = 4 * g.bx * g.by, pitch = Math.sqrt(area / P.cells), cols = Math.max(4, Math.round((2 * g.bx) / pitch)), rows = Math.max(4, Math.round((2 * g.by) / pitch));
  const px = (2 * g.bx) / cols, py = (2 * g.by) / rows, pt = Math.min(px, py), x0 = -g.bx + px / 2, y0 = -g.by + py / 2;
  const dr = g.drift, fA = field(g.rng('fa'), [1, 1, 1, 2]), fS = field(g.rng('fs'), [2, 3, 1]), fD = field(g.rng('fd'), [1, 2, 1]);
  const sw = g.rng('swell'), swa = [sw() * TAU, sw() * TAU];

  // ---- ripples: slow rings of order, one every half loop; loop mode wraps the slot index so frame(T) = frame(0)
  const Pe = T / 2, DUR = 6, tc = g.live ? dr : g.p * T, n0 = Math.floor(tc / Pe), rings = [];
  for (const n of [n0, n0 - 1]) {
    const q = g.rng('ev' + (g.live ? n : ((n % 2) + 2) % 2)), s0 = q() * 2, cx = (q() * 2 - 1) * g.bx * 0.8, cy = (q() * 2 - 1) * g.by * 0.8, amp = 0.7 + 0.3 * q(), tau = tc - n * Pe - s0;
    if (tau > 0 && tau < DUR) rings.push({ cx, cy, R: 0.04 + 0.07 * tau, a: amp * g.ease.sine(Math.sin(Math.PI * tau / DUR)) });
  }

  // ---- global fields, evaluated per cell below
  const psi = 1.57 + 0.8 * Math.sin(v(1) + 1), bias = [Math.cos(psi), Math.sin(psi)], thr = 0.2 * Math.sin(v(2) + 0.5);
  const swell = P.swell * (0.85 + 0.15 * Math.sin(v(2) + 2)), k1 = 6.5, k2 = 5.2;
  const paths = [0, 1, 2, 3, 4, 5].map(() => new Path2D()), junk = new Path2D();
  const sq = (path, cx, cy, h, a) => { // closed square, corners in a fixed order
    const c = Math.cos(a) * h, s = Math.sin(a) * h;
    path.moveTo(cx - c + s, cy - s - c); path.lineTo(cx + c + s, cy + s - c); path.lineTo(cx + c - s, cy + s + c); path.lineTo(cx - c - s, cy - s + c); path.closePath();
  };
  const side = pt * (1 - P.gap) / 2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const rr = 0.85 * (r() * 2 - 1), rs = r() * 2 - 1, rt = r() * 2 - 1, rk = r(), ph = r() * TAU, kw = 2 + Math.floor(r() * 3), rc = r(), warm = r();
    const cls = rc < 0.58 ? 0 : rc < 0.86 ? 1 : rc < 0.95 ? 4 : rc < 0.99 ? 2 : 3; // weight class, fixed per cell
    const bx = x0 + i * px, by = y0 + j * py;
    // swell: two slow long waves carry the lattice, so even ordered patches keep moving
    const w1 = Math.sin(k1 * (0.8 * bx + 0.6 * by) - v(5) + swa[0] + 0.12 * dr), w2 = Math.sin(k2 * (-0.5 * bx + 0.87 * by) + v(6) + swa[1]);
    let X = bx + swell * (0.9 * w1 + 0.4 * w2), Y = by + swell * (0.4 * w1 - 0.9 * w2);
    // order front: A is 1 where the lattice has dissolved, 0 where it is crystal
    const F = fA(bx, by, v, dr) + bias[0] * bx + bias[1] * by;
    let A = sm((F - thr + 1.2) / 2.4);
    let pulse = 0;
    for (const e of rings) { const d = Math.hypot(bx - e.cx, by - e.cy), b = e.a * (1 - sm(Math.abs(d - e.R) / 0.26)); A *= 1 - 0.85 * b; pulse += b; const m = b * pt * 0.3 / (d + 0.02); X += (bx - e.cx) * m; Y += (by - e.cy) * m; }
    const o = P.orbit * pt * A * (0.6 + 0.4 * rk), vv = v(kw) + ph;
    X += A * P.maxShift * pt * rs + o * Math.cos(vv); Y += A * P.maxShift * pt * rt + o * Math.sin(vv);
    const a = A * (rr * P.maxAngle + 0.035 * Math.sin(vv + 1));
    // size field: drifting density; the smallest squares vanish, leaving paper
    const Fs = fS(bx, by, v, dr), size = side * (0.55 + 0.45 * sm((Fs + 1.2) / 2.1)) * sm((Fs + 1.7) / 0.6) * (1 + 0.3 * Math.min(1, pulse));
    // nested squares: where the depth field is high the square opens into concentric ones (Molnar)
    const dep = sm((fD(bx, by, v, dr) - 0.1) / 1.5), on = size > 0.0025;
    const put = path => { sq(on ? path : junk, X, Y, size, a); for (let n = 1; n <= 2; n++) sq(on && dep > 0.04 ? path : junk, X, Y, size * (1 - 0.3 * n * dep), a); };
    if (warm < 0.03) { const hot = A > 0.85; put(hot ? paths[5] : junk); put(hot ? junk : paths[cls]); } // a few squares warm towards copper where disorder peaks
    else put(paths[cls]);
  }
  paths.forEach((p, c) => { g.pen(ctx, WEIGHT[c], ALPHA[c], c === 4 ? g.c.tint1 : c === 5 ? g.c.accent : g.c.ink); ctx.stroke(p); });
}
