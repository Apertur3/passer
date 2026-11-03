// F10 Pegs and string (after Dmitri Cherniak's wrapped strings).
// One rule: a single string visits a lattice of pegs in a seeded order, wrapped tangent around each, and lets its hooks circle their pegs in a travelling wave.
export const meta = {
  id: 'f10-pegs-string', title: 'Pegs and string', T: 12, start: 0.3, still: 0.5, aspects: ['4:5', '16:9', '1:1'],
  label: 'A single thin string wound around a lattice of pegs, drawn as straight tangents and small wraps, that keeps circling loose around its pegs in a wave from left to right.',
  // across: pegs along the short side of the box (the long side gets as many as fit); cover: share of pegs the string visits;
  // reach: longest hop in pitches; wrap: peg wrap radius (S); hooks: pegs that get re-hooked each loop (out and back)
  params: { across: 13, cover: 0.9, reach: 7, wrap: 0.0038, hooks: 0 },
};

const TAU = Math.PI * 2, mod = (a, n) => ((a % n) + n) % n, wrapPi = a => mod(a + Math.PI, TAU) - Math.PI;

// peg lattice fitted to the margin box, route of peg indices (random walk with long hops, no repeats until stuck)
function plan(g) {
  const P = g.params, r = g.rng('route'), pitch = (2 * Math.min(g.bx, g.by)) / (P.across - 1);
  const nx = Math.floor((2 * g.bx) / pitch + 1e-6) + 1, ny = Math.floor((2 * g.by) / pitch + 1e-6) + 1;
  const x0 = -((nx - 1) * pitch) / 2, y0 = -((ny - 1) * pitch) / 2, peg = (i, j) => [x0 + i * pitch, y0 + j * pitch];
  // the string stays inside an ellipse of pegs; the pegs outside stay bare, so the corners are empty paper
  const inside = (i, j) => { const q = peg(i, j); return (q[0] / g.bx) ** 2 + (q[1] / g.by) ** 2 <= 0.9; };
  const seen = new Set(), route = [];
  let ci = Math.floor(nx / 2), cj = Math.floor(ny / 2), want = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) want += inside(i, j);
  want = Math.round(P.cover * want);
  while (route.length < want) {
    seen.add(ci + ',' + cj); route.push([ci, cj]);
    const c = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const d = Math.hypot(i - ci, j - cj);
      if (d >= 1.9 && d <= P.reach && inside(i, j) && !seen.has(i + ',' + j)) c.push([i, j]);
    }
    if (!c.length) break;
    [ci, cj] = c[Math.floor(r() * c.length)];
  }
  return { peg, route, nx, ny, r };
}

// tangent geometry: heading psi of the straight run from circle a (side sa) to circle b (side sb); side +1 turns with increasing angle
const heading = (a, b, sa, sb, rw) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], phi = Math.atan2(dy, dx);
  return sa === sb ? phi : phi + Math.asin(Math.min(1, (2 * sa * rw) / Math.hypot(dx, dy)));
};

export function draw(ctx, { g }) {
  const P = g.params, { peg, route, nx, ny, r } = plan(g), rw = P.wrap, p = g.p, n = route.length;
  const base = route.map(([i, j]) => peg(i, j)), side = base.map((c, k) => {
    // wrap each peg on the side the string turns to, so the wrap stays short
    const a = base[Math.max(0, k - 1)], b = base[Math.min(n - 1, k + 1)];
    return Math.sign((c[0] - a[0]) * (b[1] - c[1]) - (c[1] - a[1]) * (b[0] - c[0])) || 1;
  });
  // the accent segment and the re-hooked pegs (spread along the route, away from the accent segment)
  const hd0 = p * n, hooks = [], tail = 5, trail = k => { const d = (((hd0 - k - 0.5) % n) + n) % n; return d < tail ? 1 - d / tail : 0; }; // the accent: a comet that runs along the string once per loop
  for (let k = 0; k < n; k++) hooks.push({ k }); // every vertex swings, wider where the comet passes
  // a travelling wave: each hooked vertex circles its peg twice per loop, its phase set by its position across the board
  const c = base.map(v => v.slice()), pitch = 2 * Math.min(g.bx, g.by) / (P.across - 1);
  const vo = g.voice || (k => k * g.theta); // the orbit keeps period T; which hooks are active and how wide they swing ride other voices
  hooks.forEach(({ k }) => {
    const a = vo(3) - vo(2) + TAU * ((base[k][0] / g.bx) * 0.25 + (base[k][1] / g.by) * 0.1) + 0.4 * Math.sin(vo(4) + 3 * (base[k][0] / g.bx)), x = base[k][0] / g.bx, y = base[k][1] / g.by;
    const on = 0.7 + 0.3 * (0.5 + 0.5 * Math.cos(vo(3) + 5 * x + 3 * y)), rad = (1.0 + 0.4 * (0.5 + 0.5 * Math.cos(vo(4) + 2 * y))) * pitch * on * (1 + 0.6 * trail(k));
    c[k] = [base[k][0] + rad * Math.cos(a), base[k][1] + rad * Math.sin(a)];
  });

  // pegs: small solid dots, quiet
  g.pen(ctx, 'fine', 0.9, g.c.ink); ctx.fillStyle = g.c.tint1; ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const q = peg(i, j);
    ctx.moveTo(q[0] + 0.0022, q[1]); ctx.arc(q[0], q[1], 0.0022, 0, 7);
  }
  ctx.fill();

  // string: each hop is a straight tangent plus the wrap on the peg it arrives at; three alpha groups, one stroke each
  const hd = [];
  for (let k = 0; k < n - 1; k++) hd.push(heading(c[k], c[k + 1], side[k], side[k + 1], rw));
  const seg = k => { // append hop k to the current path
    const a = c[k], s = side[k], th0 = hd[k] - s * Math.PI / 2, b = c[k + 1], s1 = side[k + 1], th1 = hd[k] - s1 * Math.PI / 2;
    ctx.moveTo(a[0] + rw * Math.cos(th0), a[1] + rw * Math.sin(th0)); ctx.lineTo(b[0] + rw * Math.cos(th1), b[1] + rw * Math.sin(th1));
    if (k + 1 < n - 1) { // wrap on peg k+1 from arrival to departure angle, in the direction of its side
      const turn = wrapPi(hd[k + 1] - hd[k]); let sw = s1 * turn >= -0.6 * Math.PI ? turn : turn + s1 * TAU;
      if (s1 * sw < 0 && s1 * sw > -0.6 * Math.PI) sw = turn;
      ctx.arc(b[0], b[1], rw, th1, th1 + sw, sw < 0);
    }
  };
  for (let b = 0; b < 3; b++) {
    ctx.beginPath();
    for (let k = b; k < n - 1; k += 3) seg(k);
    g.pen(ctx, 'hair', [0.75, 0.88, 1][b], g.c.ink); ctx.stroke();
  }
  // the one deviation: the comet, drawn last
  for (let k = 0; k < n - 1; k++) { ctx.beginPath(); seg(k); const w = trail(k); if (w > 0) { g.pen(ctx, 'fine', w, g.c.accent); ctx.lineWidth *= 1.6; ctx.stroke(); } }
}
