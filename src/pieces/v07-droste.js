// V07 Droste: tumbling cubes on a lattice of the log plane, spiralling into themselves (Print Gallery).
// One rule: w = log z. A pattern periodic under 2*pi*i (single valued on screen) and under a skew vector G*rho is a Droste picture:
// I(z) = I(e^c z). Lattice basis g1 = G, g2 = G*rho with G = 2*pi*i / (n1 + n2*rho), so n1 g1 + n2 g2 = 2*pi*i for every rho:
// the skew rho may drift without ever opening a seam. Cubes are drawn in lattice coordinates u, w = G (u1 + rho u2), z = exp(w).
export const meta = {
  id: 'v07-droste', title: 'Droste', nl: 'Spiraal in zichzelf', T: 24, still: 0.3, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  math: 'z = exp(w), w = G (u1 + rho u2), G = 2 pi i / (n1 + n2 rho); the cube pattern is periodic in u, shifted by tau (k1,k2), tau = t/T, so tau = 1 is the identity',
  label: 'A field of pencil-hatched cubes in three tones, wound into a logarithmic spiral that contains a smaller twisted copy of itself and zooms endlessly inward, after the Droste effect and Escher\'s Print Gallery.',
  // arms: which (n1, n2) winding, 0 = by seed; drift: size of the slow live drift of the skew; bleed: 1 draws the spiral across the whole canvas (no disc, no rim)
  params: { arms: 0, drift: 1, bleed: 0 },
};

const PAIRS = [[9, 5], [11, 4], [10, 7], [8, 3]], H3 = 0.8660254, TAU = 2 * Math.PI;
const U = (x, y) => { const b = y / H3; return [x - b / 2, b]; }; // canonical hex plane (u1 + e^{i pi/3} u2) -> lattice coordinates
const V = [0, 1, 2, 3, 4, 5].map(k => { const a = (30 + 60 * k) * Math.PI / 180; return U(Math.cos(a) / Math.sqrt(3), Math.sin(a) / Math.sqrt(3)); });
const C0 = [0, 0], FACES = [[C0, V[0], V[2]], [C0, V[2], V[4]], [C0, V[4], V[0]]]; // top, left, right rhombus: centre, two spanning vertices
const EDGES = [[C0, V[0]], [C0, V[2]], [C0, V[4]], [V[0], V[1]], [V[1], V[2]], [V[2], V[3]]]; // 3 spokes + 3 rim edges (the other 3 belong to neighbours)
const NL = [3, 8, 16], sm = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export function draw(ctx, { seed, g }) {
  const P = g.params, r = g.rng('v07'), pair = PAIRS[P.arms ? (P.arms - 1) % PAIRS.length : Math.floor(r() * PAIRS.length)], n1 = pair[0], n2 = pair[1];
  const R = P.bleed ? Math.hypot(g.hw, g.hh) : Math.min(g.bx, g.by), S = g.S, d = g.drift * P.drift;
  // skew rho = |rho| e^{i alpha}: drifts on three slow incommensurate voices (zero at d = 0, so loop mode is the canonical cube lattice)
  const al = Math.PI / 3 + 0.11 * Math.sin(0.019 * d) + 0.05 * Math.sin(0.0113 * d + 1), md = 1 + 0.045 * Math.sin(0.0141 * d) + 0.03 * Math.sin(0.0071 * d + 2);
  const rr = md * Math.cos(al), ri = md * Math.sin(al), dn = (n1 + n2 * rr) ** 2 + (n2 * ri) ** 2;
  const Gr = TAU * (n2 * ri) / dn, Gi = TAU * (n1 + n2 * rr) / dn; // G = 2 pi i / (n1 + n2 rho)
  const Hr = Gr * rr - Gi * ri, Hi = Gr * ri + Gi * rr; // G rho
  // translation vector (k1, k2) in lattice steps: mostly zoom, some twist; searched on the canonical lattice so it is fixed per seed pair
  let k1 = 0, k2 = 0, best = 1e9; { const dn0 = (n1 + n2 / 2) ** 2 + (n2 * H3) ** 2, a = TAU * n2 * H3 / dn0, b = TAU * (n1 + n2 / 2) / dn0;
    for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) { const re = a * i + (a / 2 - b * H3) * j, im = b * i + (b / 2 + a * H3) * j, e = (re - 4.8) ** 2 + (im - 2.2) ** 2; if (e < best) { best = e; k1 = i; k2 = j; } } }
  const tau = g.p, s1 = tau * k1, s2 = tau * k2; // shift in lattice coordinates; tau = 1 is a lattice vector, so frame(T) = frame(0)
  const Gm = Math.hypot(Gr, Gi), reLo = Math.log(5 / S / Gm), reHi = Math.log(R + Gm), det = Gr * Hi - Gi * Hr;
  // bounding box of the lattice cells whose centres have Re w in [reLo, reHi] and Im w in [0, 2 pi): preimage of that rectangle
  let pa = 1e9, pb = -1e9, qa = 1e9, qb = -1e9;
  for (const [x, y] of [[reLo, 0], [reHi, 0], [reLo, TAU], [reHi, TAU]]) { const u = (x * Hi - y * Hr) / det, v = (Gr * y - Gi * x) / det; pa = Math.min(pa, u); pb = Math.max(pb, u); qa = Math.min(qa, v); qb = Math.max(qb, v); }
  const NB = 4, mk = () => Array.from({ length: NB }, () => new Path2D()), PATH = [mk(), mk(), mk(), mk()]; // outline, light, mid, dark
  const R2 = R * R, add = (path, wr, wi, vr, vi, rpx) => { // straight segment in w, subdivided to about 0.6 px of sagitta, cut exactly at the rim circle (no clip(): it costs 5 ms)
    const n = Math.max(1, Math.ceil(Math.hypot(vr - wr, vi - wi) / Math.sqrt(4.8 / rpx)));
    let px = 0, py = 0, pin = false, on = false;
    for (let i = 0; i <= n; i++) {
      const e = Math.exp(wr + (vr - wr) * i / n), y = wi + (vi - wi) * i / n, x = e * Math.cos(y), yy = e * Math.sin(y), In = x * x + yy * yy <= R2;
      if (i) {
        if (pin && In) { if (!on) path.moveTo(px, py); path.lineTo(x, yy); on = true; }
        else if (pin || In) { // crossing: solve |p + t d| = R
          const dx = x - px, dy = yy - py, A = dx * dx + dy * dy, B = px * dx + py * dy, sq = Math.sqrt(Math.max(0, B * B - A * (px * px + py * py - R2))), t = pin ? (-B + sq) / A : (-B - sq) / A, ix = px + t * dx, iy = py + t * dy;
          if (pin) { if (!on) path.moveTo(px, py); path.lineTo(ix, iy); on = false; } else { path.moveTo(ix, iy); path.lineTo(x, yy); on = true; }
        } else on = false;
      }
      px = x; py = yy; pin = In;
    }
  };
  const bucket = a => Math.min(NB - 1, Math.max(0, Math.ceil(a * NB) - 1));
  for (let p = Math.floor(pa - s1) - 1; p <= Math.ceil(pb - s1) + 1; p++) for (let q = Math.floor(qa - s2) - 1; q <= Math.ceil(qb - s2) + 1; q++) {
    const u1 = p + s1, u2 = q + s2, cr = Gr * u1 + Hr * u2, ci = Gi * u1 + Hi * u2;
    if (cr < reLo || cr > reHi || ci < 0 || ci >= TAU) continue;
    const rc = Math.exp(cr), side = Gm / Math.sqrt(3) * rc * S; // rhombus side on screen, px
    if (rc - Gm * rc * 0.8 > R || side < 6) continue;
    const rpx = rc * S * 1.2;
    const wp = (a, b) => [cr + Gr * a + Hr * b, ci + Gi * a + Hi * b];
    const oa = sm((side - 6) / 10);
    if (oa > 0.04) for (const [A, B] of EDGES) { const a = wp(A[0], A[1]), b = wp(B[0], B[1]); add(PATH[0][bucket(oa)], a[0], a[1], b[0], b[1], rpx); }
    for (let f = 0; f < 3; f++) {
      const [C, A, D] = FACES[f], N = NL[f], tn = 1 + f, hp = side * H3 / N;
      for (let j = 1; j < N; j++) {
        const pitch = hp * (j & -j), al2 = sm((pitch - 3) / 3); if (al2 < 0.06) continue;
        const s = j / N, x = C[0] + s * (D[0] - C[0]), y = C[1] + s * (D[1] - C[1]), a = wp(x, y), b = wp(x + A[0] - C[0], y + A[1] - C[1]);
        add(PATH[tn][bucket(al2)], a[0], a[1], b[0], b[1], rpx);
      }
    }
  }
    const sty = [['fine', 0.9, g.c.ink], ['hair', 0.55, g.c.ink], ['hair', 0.8, g.c.ink], ['fine', 0.8, g.c.ink]];
  for (let k = 0; k < 4; k++) for (let b = 0; b < NB; b++) { g.pen(ctx, sty[k][0], sty[k][1] * (b + 1) / NB, sty[k][2]); ctx.stroke(PATH[k][b]); }
  if (!P.bleed) { g.pen(ctx, 'fine', 1, g.c.ink); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); }
}
