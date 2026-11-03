// M06 Hyperbolic tiling: the regular tiling {p,q} of the Poincare disc, swimming under a Mobius shift.
// One rule: reflect a regular p-gon across its own edges until the disc is full; every edge is a circle arc meeting the rim at a right angle,
// and the whole tiling is moved by the disc automorphism z -> (z + a) / (1 + conj(a) z) while it turns one 2pi/p step per loop.
export const meta = {
  id: 'm06-hyperbolic', title: 'Hyperbolic tiling', T: 16, still: 0.3, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  math: '{p,q} tiling of the Poincare disc; geodesics are circle arcs orthogonal to |z|=1; z -> (z + a)/(1 + conj(a) z), a(theta) a closed orbit',
  label: 'A regular tiling of the hyperbolic plane drawn in the Poincare disc: triangles or squares shrink toward the rim while a moving Mobius shift makes the whole tiling swim like a fisheye.',
  // p, q: Schlafli symbol (0 = chosen by seed among {3,8} {4,6}; q even keeps the checkerboard); shift: size of the Mobius orbit
  params: { p: 0, q: 0, shift: 0.16 },
};

const SETS = [[3, 8], [4, 6], [3, 8]], DMAX = 6.1, NB = 4, MIN = 0.009; // MIN: smallest visible edge, in S (6 px at 700 px)
const memo = {};
// ---- the group: build once per {p,q}. Tiles are images of the base p-gon under isometries (Mobius matrix, or Mobius of conj z)
function build(p, q) {
  const k = p + ',' + q; if (memo[k]) return memo[k];
  const cc = Math.cos(Math.PI / p) / Math.sin(Math.PI / p) * Math.cos(Math.PI / q) / Math.sin(Math.PI / q), Rh = Math.acosh(cc), r0 = Math.tanh(Rh / 2);
  const d = (r0 * r0 + 1) / (2 * r0 * Math.cos(Math.PI / p)); // the base edge lies on the circle with centre d e^{i(2k+1)pi/p}, radius sqrt(d^2 - 1)
  const mm = (A, B) => [A[0] * B[0] - A[1] * B[1] + A[2] * B[4] - A[3] * B[5], A[0] * B[1] + A[1] * B[0] + A[2] * B[5] + A[3] * B[4],
    A[0] * B[2] - A[1] * B[3] + A[2] * B[6] - A[3] * B[7], A[0] * B[3] + A[1] * B[2] + A[2] * B[7] + A[3] * B[6],
    A[4] * B[0] - A[5] * B[1] + A[6] * B[4] - A[7] * B[5], A[4] * B[1] + A[5] * B[0] + A[6] * B[5] + A[7] * B[4],
    A[4] * B[2] - A[5] * B[3] + A[6] * B[6] - A[7] * B[7], A[4] * B[3] + A[5] * B[2] + A[6] * B[7] + A[7] * B[6]]; // 2x2 complex product, [ar ai br bi cr ci dr di]
  const ap = (M, x, y) => { const nr = M[0] * x - M[1] * y + M[2], ni = M[0] * y + M[1] * x + M[3], dr = M[4] * x - M[5] * y + M[6], di = M[4] * y + M[5] * x + M[7], s = dr * dr + di * di; return [(nr * dr + ni * di) / s, (ni * dr - nr * di) / s]; };
  const refl = []; // inversion in edge circle k: z -> (c w - 1)/(w - conj c), w = conj z
  for (let j = 0; j < p; j++) { const a = (2 * j + 1) * Math.PI / p, cx = d * Math.cos(a), cy = d * Math.sin(a); refl.push([cx, cy, -1, 0, 1, 0, -cx, cy]); }
  const tiles = [{ M: [1, 0, 0, 0, 0, 0, 1, 0], f: 0, par: 0 }], seen = new Map(), key = (x, y) => Math.round(x * 2e5) + ',' + Math.round(y * 2e5), lim = Math.tanh(DMAX / 2);
  seen.set(key(0, 0), 0);
  const img = (t, x, y) => ap(t.M, t.f ? x : x, t.f ? -y : y); // tile map: z -> M(z) or M(conj z)
  for (let i = 0; i < tiles.length; i++) for (let j = 0; j < p; j++) {
    const t = tiles[i], S = refl[j]; let M, f;
    if (!t.f) { M = mm(t.M, S); f = 1; } else { M = mm(t.M, [S[0], -S[1], S[2], -S[3], S[4], -S[5], S[6], -S[7]]); f = 0; }
    const c = ap(M, 0, 0); // centre of the neighbour: M(conj 0) = M(0) either way
    if (Math.hypot(c[0], c[1]) > lim) continue; const kk = key(c[0], c[1]);
    if (!seen.has(kk)) { seen.set(kk, tiles.length); tiles.push({ M, f, par: 1 - t.par }); }
  }
  const nT = tiles.length, vk = new Map(), V = [], E = [], ek = new Map(), tv = new Int32Array(nT * p), te = new Int32Array(nT * p), eT = [];
  for (let i = 0; i < nT; i++) for (let j = 0; j < p; j++) {
    const a = 2 * Math.PI * j / p, v = img(tiles[i], r0 * Math.cos(a), r0 * Math.sin(a)), kk = key(v[0], v[1]);
    if (!vk.has(kk)) { vk.set(kk, V.length / 2); V.push(v[0], v[1]); } tv[i * p + j] = vk.get(kk);
  }
  for (let i = 0; i < nT; i++) for (let j = 0; j < p; j++) {
    const a = tv[i * p + j], b = tv[i * p + (j + 1) % p], kk = Math.min(a, b) + ',' + Math.max(a, b);
    if (!ek.has(kk)) { ek.set(kk, E.length / 2); E.push(a, b); eT.push([i]); } else eT[ek.get(kk)].push(i);
    te[i * p + j] = ek.get(kk);
  }
  return (memo[k] = { p, q, Rh, r0, nT, nV: V.length / 2, V: new Float64Array(V), E: new Int32Array(E), tv, te, par: Uint8Array.from(tiles, t => t.par), M: tiles.map(t => t.M), f: Uint8Array.from(tiles, t => t.f), ap });
}
// ---- batched geodesic arcs: one path per alpha bucket. A geodesic through two disc points is the circle orthogonal to |z| = 1 through both.
function Batch(cap) {
  const f = new Float32Array(cap * 7), k = new Uint8Array(cap); let n = 0;
  return {
    get n() { return n; }, reset() { n = 0; },
    add(ax, ay, bx, by, bk) { // store the arc A -> B as start, end and the tangent corner T used by arcTo; R = 0 means a straight chord
      if (n >= cap) return; const o = n * 7, D = ax * by - ay * bx; f[o] = ax; f[o + 1] = ay; f[o + 2] = bx; f[o + 3] = by; k[n++] = bk;
      if (Math.abs(D) < 1e-7) { f[o + 6] = 0; return; }
      const sa = ax * ax + ay * ay + 1, sb = bx * bx + by * by + 1, cx = (sa * by - sb * ay) / (2 * D), cy = (sb * ax - sa * bx) / (2 * D), R2 = cx * cx + cy * cy - 1;
      const mx = (ax + bx) / 2 - cx, my = (ay + by) / 2 - cy, m2 = mx * mx + my * my; if (R2 > 4e4 || m2 < 1e-14) { f[o + 6] = 0; return; }
      f[o + 4] = cx + R2 * mx / m2; f[o + 5] = cy + R2 * my / m2; f[o + 6] = Math.sqrt(R2);
    },
    stroke(ctx, g, w, base, col, sc, rd) { // sc, rd: scale unit-disc coordinates by rd
      for (let b = 0; b < NB; b++) {
        ctx.beginPath(); let any = 0;
        for (let i = 0; i < n; i++) if (k[i] === b) { any = 1; const o = i * 7;
          ctx.moveTo(f[o] * rd, f[o + 1] * rd); if (f[o + 6]) ctx.arcTo(f[o + 4] * rd, f[o + 5] * rd, f[o + 2] * rd, f[o + 3] * rd, f[o + 6] * rd); ctx.lineTo(f[o + 2] * rd, f[o + 3] * rd); }
        if (any) { g.pen(ctx, w, base * (b + 1) / NB, col); ctx.stroke(); }
      }
    },
  };
}
const bk = a => Math.min(NB - 1, Math.floor(a * NB)), sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const EDGE = Batch(6000), HATCH = [Batch(9000), Batch(9000)];
const SCR = { W: null, loc: null };
let TX = 0, TY = 0; // result of ap2: the Mobius map M applied to x + iy, without allocating
function ap2(M, x, y) { const nr = M[0] * x - M[1] * y + M[2], ni = M[0] * y + M[1] * x + M[3], dr = M[4] * x - M[5] * y + M[6], di = M[4] * y + M[5] * x + M[7], s = dr * dr + di * di; TX = (nr * dr + ni * di) / s; TY = (ni * dr - nr * di) / s; }

export function draw(ctx, { seed, g }) {
  const P = g.params, r = g.rng('m06'), pick = SETS[Math.floor(r() * SETS.length)], p = P.p || pick[0], q = P.q || pick[1];
  const D = build(p, q), { nV, V, E, nT, tv, par } = D, rd = Math.min(g.bx, g.by), TAU = 2 * Math.PI;
  // ---- motion: a closed orbit a(theta) for the Mobius shift, and one 2pi/p step of rotation per loop
  const v1 = g.voice(1), v2 = g.voice(2), v3 = g.voice(3), k = P.shift, wob = g.live ? 0.8 + 0.2 * Math.sin(g.drift * 0.05) : 1;
  const ax = k * wob * (0.62 * Math.cos(v1) + 0.38 * Math.cos(-2 * v2 + 1.3)), ay = k * wob * (0.62 * Math.sin(v1) + 0.38 * Math.sin(-2 * v2 + 1.3));
  const phi = g.voice(1) / p, cr = Math.cos(phi), sr = Math.sin(phi);
  // full map z -> (e^{i phi} z + a)/(conj(a) e^{i phi} z + 1) as a matrix
  const MM = [cr, sr, ax, ay, ax * cr + ay * sr, ax * sr - ay * cr, 1, 0];
  const mmul = (A, B) => [A[0] * B[0] - A[1] * B[1] + A[2] * B[4] - A[3] * B[5], A[0] * B[1] + A[1] * B[0] + A[2] * B[5] + A[3] * B[4], A[0] * B[2] - A[1] * B[3] + A[2] * B[6] - A[3] * B[7], A[0] * B[3] + A[1] * B[2] + A[2] * B[7] + A[3] * B[6],
    A[4] * B[0] - A[5] * B[1] + A[6] * B[4] - A[7] * B[5], A[4] * B[1] + A[5] * B[0] + A[6] * B[5] + A[7] * B[4], A[4] * B[2] - A[5] * B[3] + A[6] * B[6] - A[7] * B[7], A[4] * B[3] + A[5] * B[2] + A[6] * B[7] + A[7] * B[6]];
  if (!SCR.W || SCR.W.length < nV * 2) SCR.W = new Float64Array(nV * 2);
  const W = SCR.W;
  for (let i = 0; i < nV; i++) { ap2(MM, V[i * 2], V[i * 2 + 1]); W[i * 2] = TX; W[i * 2 + 1] = TY; }
  // ---- local pattern, identical in every tile: ripples of nested polygons that flow toward the centre; light tiles run half a step out of phase
  const K = 6, rho = s => Math.tanh(s * D.Rh / 2), rip = v3 / TAU;
  if (!SCR.loc) SCR.loc = [new Float64Array(K * p * 2), new Float64Array(K * p * 2)], SCR.lu = [new Float32Array(K), new Float32Array(K)];
  for (let h = 0; h < 2; h++) for (let j = 0; j < K; j++) {
    const u = (((j / K + rip + h * 0.5 / K) % 1) + 1) % 1, s = 1 - u, rr = rho(s), tw = (1 - s) * 0.35 * (TAU / p), L = SCR.loc[h]; SCR.lu[h][j] = Math.sin(Math.PI * u);
    for (let m = 0; m < p; m++) { const a = TAU * m / p + tw; L[(j * p + m) * 2] = rr * Math.cos(a); L[(j * p + m) * 2 + 1] = rr * Math.sin(a); } }
  EDGE.reset(); HATCH[0].reset(); HATCH[1].reset();
  // ---- fills of the dark tiles (tint, one path)
  const polyPath = (i, W2 = W) => { ctx.moveTo(W2[tv[i * p] * 2] * rd, W2[tv[i * p] * 2 + 1] * rd);
    for (let m = 0; m < p; m++) { const a = tv[i * p + m], b = tv[i * p + (m + 1) % p]; arcAdd(ctx, W2[a * 2] * rd, W2[a * 2 + 1] * rd, W2[b * 2] * rd, W2[b * 2 + 1] * rd, rd); } };
  const edgeLen = (i) => Math.hypot(W[tv[i * p] * 2] - W[tv[i * p + 1] * 2], W[tv[i * p] * 2 + 1] - W[tv[i * p + 1] * 2 + 1]) * rd; // in S
  const vis = SCR.vis && SCR.vis.length === nT ? SCR.vis : (SCR.vis = new Float32Array(nT));
  ctx.beginPath();
  for (let i = 0; i < nT; i++) { const L0 = edgeLen(i); vis[i] = L0; if (par[i] === 1 && L0 > MIN * 0.8) { polyPath(i); } }
  ctx.fillStyle = g.c.tint2; ctx.globalAlpha = 0.9; ctx.fill();
  // ---- edges: each geodesic once, alpha by its length on screen
  for (let e = 0; e < D.E.length / 2; e++) {
    const a = E[e * 2], b = E[e * 2 + 1], ln = Math.hypot(W[a * 2] - W[b * 2], W[a * 2 + 1] - W[b * 2 + 1]) * rd, al = sm((ln - MIN) / (MIN * 2.2));
    if (al > 0.06) EDGE.add(W[a * 2], W[a * 2 + 1], W[b * 2], W[b * 2 + 1], bk(al));
  }
  // ---- hatch: the local pattern carried into every tile by (shift . tile map)
  for (let i = 0; i < nT; i++) {
    const L0 = vis[i]; if (L0 < MIN * 2.2) continue;
    const t = mmul(MM, D.M[i]), cj = D.f[i] ? -1 : 1, size = sm((L0 - MIN * 2) / (MIN * 5)), h = par[i], L = SCR.loc[h], lu = SCR.lu[h], base = size * (h ? 1 : 0.6);
    for (let j = 0; j < K; j++) { const al = lu[j] * base; if (al < 0.08) continue;
      const o = (j * p + p - 1) * 2; ap2(t, L[o], cj * L[o + 1]); let px = TX, py = TY;
      for (let m = 0; m < p; m++) { ap2(t, L[(j * p + m) * 2], cj * L[(j * p + m) * 2 + 1]); HATCH[h].add(px, py, TX, TY, bk(al)); px = TX; py = TY; } }
  }
  ctx.globalAlpha = 1;
  EDGE.stroke(ctx, g, 'fine', 0.95, g.c.ink, 1, rd); HATCH[1].stroke(ctx, g, 'hair', 1, g.c.ink, 1, rd); HATCH[0].stroke(ctx, g, 'hair', 1, g.c.cool, 1, rd); // the two colour classes are the two line systems
  g.pen(ctx, 'line', 1, g.c.ink); ctx.beginPath(); ctx.arc(0, 0, rd, 0, TAU); ctx.stroke();
}
// append one geodesic arc A -> B (unit-disc points already scaled by rd) to the current path
function arcAdd(ctx, ax, ay, bx, by, rd) {
  const a = ax / rd, b = ay / rd, c = bx / rd, d = by / rd, D = a * d - b * c;
  if (Math.abs(D) < 1e-7) return ctx.lineTo(bx, by);
  const sa = a * a + b * b + 1, sb = c * c + d * d + 1, ox = (sa * d - sb * b) / (2 * D), oy = (sb * a - sa * c) / (2 * D), R2 = ox * ox + oy * oy - 1;
  const mx = (a + c) / 2 - ox, my = (b + d) / 2 - oy, m2 = mx * mx + my * my; if (R2 > 4e4 || m2 < 1e-14) return ctx.lineTo(bx, by);
  ctx.arcTo((ox + R2 * mx / m2) * rd, (oy + R2 * my / m2) * rd, bx, by, Math.sqrt(R2) * rd); ctx.lineTo(bx, by);
}
