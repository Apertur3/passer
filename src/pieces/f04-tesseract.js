// F04 Tesseract (after Manfred Mohr's hypercube drawings).
// One rule: the 32 edges of a four-dimensional cube turn in two planes at a 1:2 ratio, and only the edges the seed picks are drawn.
export const meta = {
  id: 'f04-tesseract', title: 'Tesseract', T: 16, still: 0.5, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  label: 'A hypercube turning in four dimensions, projected to a fan of fine lines where only a seeded subset of its edges is drawn.',
  // keep: share of the 32 edges that are drawn; copies: echoes of the cube along the turn; spread: turn between echoes (rad);
  // depth: eye distance in 4D
  params: { keep: 0.72, copies: 12, spread: 0.05, depth: 6 },
};

const V = [], E = []; // 16 vertices (+-1)^4 and the 32 edges between neighbours
for (let i = 0; i < 16; i++) V.push([i & 1, (i >> 1) & 1, (i >> 2) & 1, (i >> 3) & 1].map(b => b * 2 - 1));
for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) if (!(i & (1 << b))) E.push([i, i | (1 << b)]);

// the edge a half-turn in the xw plane carries edge e onto; the subset is chosen per pair so the loop closes exactly
const IMG = E.map(([u, v]) => E.findIndex(([a, b]) => (a === (u ^ 9) && b === (v ^ 9)) || (a === (v ^ 9) && b === (u ^ 9))));
const voice = (g, k) => (g.voice ? g.voice(k) : k * g.theta); // independent phase k: integer harmonic in loop mode, detuned live
// rotate a point in the plane (i, j) by angle a
const rot = (p, i, j, a) => { const c = Math.cos(a), s = Math.sin(a), u = p[i], v = p[j]; p[i] = u * c - v * s; p[j] = u * s + v * c; };

export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('edges'), n = P.copies;
  const draw0 = E.map(() => r() < P.keep), on = E.map((_, i) => draw0[Math.min(i, IMG[i])]); // the seeded subset, shared by every echo
  const pick = on.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
  const view = [r() * 0.6 + 0.3, r() * 0.6 + 0.4]; // fixed tilt of the whole figure
  const a1 = voice(g, 1) / 2, a2 = voice(g, 2) / 2, sp = P.spread * (1 + 0.5 * Math.sin(voice(g, 3))), dp = P.depth * (1 + 0.15 * Math.sin(voice(g, 4))); // planes xw and zw turn at 1:2 (a half and a full turn per loop; the subset is symmetric under the half turn); echo spacing and eye distance breathe on their own voices
  const sc = Math.min(g.bx, g.by) * 0.4, pt = new Float64Array(16 * 2);
  const project = k => { // k = echo offset in steps; returns 2D points for all 16 vertices
    for (let i = 0; i < 16; i++) {
      const p = V[i].slice();
      rot(p, 0, 3, a1 + k * sp); rot(p, 2, 3, a2 + 2 * k * sp); rot(p, 0, 1, view[0]); rot(p, 1, 2, view[1]);
      const s4 = dp / (dp - p[3]), x = p[0] * s4, y = p[1] * s4, z = p[2] * s4, s3 = 8 / (8 - z);
      pt[i * 2] = x * s3 * sc; pt[i * 2 + 1] = y * s3 * sc;
    }
  };
  for (let c = 0; c < n; c++) { // echoes first, the live cube last so it sits on top
    const k = c - (n - 1) / 2, u = Math.abs(k) / (n / 2), path = new Path2D();
    project(k);
    pick.forEach(e => { path.moveTo(pt[E[e][0] * 2], pt[E[e][0] * 2 + 1]); path.lineTo(pt[E[e][1] * 2], pt[E[e][1] * 2 + 1]); });
    g.pen(ctx, 'hair', 0.18 + 0.5 * (1 - u) * (1 - u), g.c.ink); ctx.stroke(path);
  }
  project(0); const live = new Path2D();
  pick.forEach(e => { { live.moveTo(pt[E[e][0] * 2], pt[E[e][0] * 2 + 1]); live.lineTo(pt[E[e][1] * 2], pt[E[e][1] * 2 + 1]); } });
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.stroke(live);
}
