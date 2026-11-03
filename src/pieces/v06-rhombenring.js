// V06 Rhombenring (a rhombus ring, hand-drawn construction).
// One rule: a ring of rhombi on the unit vectors u_k is hatched in three pencil tones by tile orientation, so it reads as a twisted band; the tones turn round it and hexagons of three tiles flip.
export const meta = {
  id: 'v06-rhombenring', pencils: true, title: 'Rhombenring', nl: 'Rhombenring', T: 12, still: 0.4, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'tile(a,b) = s u_a + t u_b, u_k = (cos(pi k/n), sin(pi k/n)); ring = Z(2,...,2) minus a centred hole; tone = Lambert shade of the lifted facet E_a x E_b',
  label: 'A ring of rhombi hatched in three pencil tones by tile orientation so it reads as a twisted band; the tones turn round it and hexagons of three tiles flip.',
  // n: the polygon has 2n corners (0 = by seed); pitch: hatch spacing in S
  params: { n: 0, pitch: 0.009 },
};

const TAU = 2 * Math.PI, MEMO = {}, DUR = 1.5, STEP = 0.8, LAG = 1.3;
const uv = (n, d) => [Math.cos(Math.PI * d / n), Math.sin(Math.PI * d / n)];
const key = (x, y) => Math.round(x * 1e3) + ',' + Math.round(y * 1e3);
const hash = (i, l, k) => { const v = Math.sin(i * 12.9898 + l * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
const sm = u => (u = Math.min(1, Math.max(0, u))) * u * (3 - 2 * u);

// ---- tiling: exact cover of the ring by rhombi, backtracking from the most constrained edge ----
const zono = (n, m) => { // CCW boundary, side lengths m[k]; vertices carry the outgoing direction
  const p = []; let x = 0, y = 0;
  for (let d = 0; d < 2 * n; d++) for (let i = 0; i < m[d % n]; i++) { p.push([x, y, d]); const w = uv(n, d); x += w[0]; y += w[1]; }
  const cx = p.reduce((s, v) => s + v[0], 0) / p.length, cy = p.reduce((s, v) => s + v[1], 0) / p.length;
  return p.map(v => [v[0] - cx, v[1] - cy, v[2]]);
};
const overlap = (P, Q) => { // convex polygons share area
  for (const S of [P, Q]) for (let i = 0; i < S.length; i++) {
    const a = S[i], b = S[(i + 1) % S.length], nx = a[1] - b[1], ny = b[0] - a[0], r = Z => { const d = Z.map(v => v[0] * nx + v[1] * ny); return [Math.min(...d), Math.max(...d)]; }, [p0, p1] = r(P), [q0, q1] = r(Q);
    if (p1 <= q0 + 1e-6 || q1 <= p0 + 1e-6) return false;
  }
  return true;
};
function solve(n, rnd, cap) {
  const N2 = 2 * n, U = d => uv(n, d);
  const outer = zono(n, Array(n).fill(2)), hole = zono(n, Array.from({ length: n }, (_, k) => n % 2 ? 1 : k % 2 ? 0 : 2));
  const F = new Map(), tiles = [], polys = [hole.map(v => [v[0], v[1]])]; // frontier edges, free side on the left
  const add = (x, y, d) => F.set(key(x, y) + '>' + d, [x, y, d]);
  outer.forEach(v => add(...v));
  hole.forEach(v => { const u = U(v[2]); add(v[0] + u[0], v[1] + u[1], (v[2] + n) % N2); });
  let nodes = 0;
  const cand = ([x, y, d]) => {
    const u = U(d), out = [];
    for (let s = 1; s < n; s++) {
      const b = (d + s) % N2, w = U(b), P = [[x, y], [x + u[0], y + u[1]], [x + u[0] + w[0], y + u[1] + w[1]], [x + w[0], y + w[1]]];
      if (!P.every(v => outer.every((o, i) => { const q = outer[(i + 1) % outer.length]; return (q[0] - o[0]) * (v[1] - o[1]) - (q[1] - o[1]) * (v[0] - o[0]) > -1e-6; }))) continue;
      const cx = x + (u[0] + w[0]) / 2, cy = y + (u[1] + w[1]) / 2;
      if (!polys.some(Q => (!Q.c || Math.hypot(Q.c[0] - cx, Q.c[1] - cy) < 2) && overlap(P, Q))) out.push([b, P]);
    }
    return out;
  };
  const rec = () => {
    if (!F.size) return true;
    if (++nodes > cap) return false;
    let best, bc;
    for (const e of F.values()) { const c = cand(e); if (!bc || c.length < bc.length) { best = e; bc = c; if (c.length < 2) break; } }
    for (let i = bc.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [bc[i], bc[j]] = [bc[j], bc[i]]; }
    for (const [b, P] of bc) {
      const saved = new Map(F), d = best[2];
      for (const [v, dd] of [[P[0], d], [P[1], b], [P[2], (d + n) % N2], [P[3], (b + n) % N2]]) {
        if (!F.delete(key(v[0], v[1]) + '>' + dd)) { const u = U(dd); add(v[0] + u[0], v[1] + u[1], (dd + n) % N2); }
      }
      tiles.push({ x: best[0], y: best[1], a: d, b }); P.c = [(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2]; polys.push(P);
      if (rec()) return true;
      tiles.pop(); polys.pop(); F.clear(); saved.forEach((v, k) => F.set(k, v));
    }
    return false;
  };
  return rec() ? { tiles, outer, hole } : null;
}

// ---- flips: a vertex with three tile corners filling 2pi centres a hexagon; each tile moves by the third spoke ----
function sites(S, skip) {
  const n = S.n, N2 = 2 * n, V = new Map();
  S.tiles.forEach((t, i) => {
    const s = (t.b - t.a + N2) % N2, ua = uv(n, t.a), ub = uv(n, t.b);
    [[t.x, t.y, t.a, s], [t.x + ua[0], t.y + ua[1], t.b, n - s], [t.x + ua[0] + ub[0], t.y + ua[1] + ub[1], (t.a + n) % N2, s], [t.x + ub[0], t.y + ub[1], (t.b + n) % N2, n - s]]
      .forEach(([x, y, st, w]) => { const k = key(x, y); (V.get(k) || V.set(k, []).get(k)).push([i, st, w]); });
  });
  const out = [];
  V.forEach(c => { if (c.length === 3 && c[0][2] + c[1][2] + c[2][2] === N2 && !c.some(e => skip && skip.includes(e[0]))) out.push(c); });
  return out;
}
function makeFlip(S, i, prev) {
  const n = S.n, c = sites(S, prev && prev.i), pick = c[Math.floor(S.rng(i) * c.length)] || [];
  pick.sort((p, q) => p[1] - q[1]);
  return { i: pick.map(e => e[0]), d: pick.map((e, k) => { const s = pick[(k + 2) % 3][1]; return uv(n, s); }) };
}
const move = (S, r, sg) => r.i.forEach((ti, k) => { S.tiles[ti].x += sg * r.d[k][0]; S.tiles[ti].y += sg * r.d[k][1]; });

function state(g, n) {
  const k = g.seed + '|' + n, m = k + (g.live ? 'L' : 'C');
  if (MEMO[m]) return MEMO[m];
  if (!MEMO[k]) { let sol = null; const R = g.rng('tiling'); while (!sol) sol = solve(n, R, 400); MEMO[k] = sol; }
  const sol = MEMO[k];
  return (MEMO[m] = { n, tiles: sol.tiles.map(t => ({ ...t })), outer: sol.outer, hole: sol.hole, recs: [], m: 0, rng: i => g.rng('flip' + i)() });
}
// apply e events (loop: K flips, then their undos in reverse; live: endless flips)
function goto(S, e, K, live) {
  while (S.m < e) {
    let r = S.recs[S.m];
    if (!r) r = S.recs[S.m] = !live && S.m >= K ? { i: S.recs[2 * K - 1 - S.m].i, d: S.recs[2 * K - 1 - S.m].d.map(v => [-v[0], -v[1]]) } : makeFlip(S, S.m, S.recs[S.m - 1]);
    move(S, r, 1); S.m++;
  }
  while (S.m > e) { S.m--; move(S, S.recs[S.m], -1); }
}

export function draw(ctx, { g }) {
  const P = g.params, n = P.n || [6, 5, 6][Math.floor(g.rng('n')() * 3)], N2 = 2 * n, T = g.T, live = g.live;
  const K = Math.floor(((T - 4.2) / STEP + 1) / 2), tau = i => live ? 0.4 + i * (STEP + 0.05) : 1 + i * STEP + (i >= K ? LAG : 0);
  const S = state(g, n), tt = live ? g.drift : g.p * T; // tt: seconds; live = the unbounded clock, loop = phase within T
  let e = 0; if (live) e = Math.max(0, Math.floor((tt - 0.4) / (STEP + 0.05)) + 1); else while (e < 2 * K && tau(e) <= tt) e++;
  goto(S, e, K, live);
  const fl = []; for (let j = e - 1; j >= 0 && tau(j) + DUR > tt; j--) fl.push([S.recs[j], 1 - g.ease.sine((tt - tau(j)) / DUR)]);
  const Rl = Math.max(...S.outer.map(v => Math.hypot(v[0], v[1]))), R = 0.345, br = 1 + 0.03 * Math.sin(g.voice(3)), sc = R / Rl * br, al = 0.25 * Math.sin(g.voice(2));
  const co = Math.cos(al) * sc, si = Math.sin(al) * sc, X = (x, y) => co * x - si * y, Y = (x, y) => si * x + co * y;
  const pulse = 0.6 + 0.4 * Math.sin(g.voice(4)), psi = g.voice(1);
  const u = d => uv(n, d);
  const cons = g.c.tint1;
  // paper marks: axes, circles
  g.pen(ctx, 'hair', 0.5 * pulse, cons); ctx.beginPath();
  ctx.moveTo(0, -g.by); ctx.lineTo(0, g.by); ctx.moveTo(-g.bx, 0); ctx.lineTo(g.bx, 0);
  for (const r of [Rl, Math.hypot(S.hole[0][0], S.hole[0][1]), Rl * Math.cos(Math.PI / N2)]) { ctx.moveTo(r * sc, 0); ctx.arc(0, 0, r * sc, 0, TAU); }
  ctx.stroke();
  // ---- tiles: a tile in flight is drawn twice, fading out at its old place and in at the new one ----
  const fly = new Map(); for (const [r, k] of fl) r.i.forEach((ti, j) => fly.set(ti, [r.d[j], k]));
  // tone: Lambert shade of each tile's facet on the stepped surface lifted to 3D (E_k = (u_k, +-0.6)), light turning with psi; the three tone classes are the rank thirds, crossfaded at their borders
  const Ez = d => (d < n ? 0.6 : -0.6), Lx = 0.8 * Math.cos(psi), Ly = 0.8 * Math.sin(psi), nt = S.tiles.length, DK = S.dk || (S.dk = new Float64Array(nt)), LV = S.lv || (S.lv = new Float64Array(nt));
  S.tiles.forEach((tl, i) => {
    const A = u(tl.a), B = u(tl.b), za = Ez(tl.a), zb = Ez(tl.b), nx = A[1] * zb - za * B[1], ny = za * B[0] - A[0] * zb, nz = A[0] * B[1] - A[1] * B[0];
    DK[i] = -(nx * Lx + ny * Ly + nz * 0.6) / Math.hypot(nx, ny, nz);
  });
  for (let i = 0; i < nt; i++) { let c = 0; for (let j = 0; j < nt; j++) if (DK[j] < DK[i] - 1e-9) c++; const r = c / nt; LV[i] = sm((r - 1 / 3) / 0.12 + 0.5) + sm((r - 2 / 3) / 0.12 + 0.5); }
  const BK = Array.from({ length: 12 }, () => []), E = new Map(), GE = [[], [], [], []]; // BK: layer*4 + level, segments x1 y1 x2 y2
  const quad = (i, x0, y0, f) => {
    const tl = S.tiles[i], ua = u(tl.a), ub = u(tl.b), c = [[x0, y0], [x0 + ua[0], y0 + ua[1]], [x0 + ua[0] + ub[0], y0 + ua[1] + ub[1]], [x0 + ub[0], y0 + ub[1]]].map(v => [X(v[0], v[1]), Y(v[0], v[1])]);
    const ax = c[1][0] - c[0][0], ay = c[1][1] - c[0][1], bx = c[3][0] - c[0][0], by = c[3][1] - c[0][1], nA = Math.max(1, Math.floor(Math.abs(ax * by - ay * bx) / Math.hypot(ax, ay) / (P.pitch * 1.4)));
    for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; if (f < 1) GE[Math.min(3, Math.floor(f * 4))].push(a[0], a[1], b[0], b[1]); else { const ka = key(a[0], a[1]), kb = key(b[0], b[1]); E.set(ka < kb ? ka + kb : kb + ka, [a[0], a[1], b[0], b[1]]); } }
    const w = [1, Math.min(1, LV[i]), Math.max(0, LV[i] - 1)];
    const nD = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / (P.pitch * 0.8)));
    for (let l = 0; l < 3; l++) for (let k = 0, cnt = l === 2 ? nD : nA; k < cnt; k++) { // tone 0: lines along a; tone 1: the same again, half a step over; tone 2: plus diagonal lines across
      const hs = hash(i, l, k), v = w[l] * f * (0.55 + 0.9 * hs); if (v < 0.2) continue;
      const a0 = 0.02 + 0.05 * hs, a1 = 0.98 - 0.05 * ((hs * 7) % 1), B = BK[l * 4 + Math.min(3, Math.floor(v * 3))];
      let s0, s1, t0, t1;
      if (l === 2) { const cc = -1 + 2 * (k + 0.5) / nD, lo = Math.max(0, -cc), hi = Math.min(1, 1 - cc); s0 = lo + (hi - lo) * a0; s1 = lo + (hi - lo) * a1; t0 = s0 + cc; t1 = s1 + cc; }
      else { const sh = (k + (l ? 0.75 : 0.25)) / nA; s0 = a0; s1 = a1; t0 = t1 = sh; }
      B.push(c[0][0] + s0 * ax + t0 * bx, c[0][1] + s0 * ay + t0 * by, c[0][0] + s1 * ax + t1 * bx, c[0][1] + s1 * ay + t1 * by);
    }
  };
  S.tiles.forEach((tl, i) => { const F = fly.get(i); if (!F) quad(i, tl.x, tl.y, 1); else { quad(i, tl.x - F[0][0], tl.y - F[0][1], F[1]); quad(i, tl.x, tl.y, 1 - F[1]); } });
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.ink, g.c.ink] : [g.c.cool, g.c.third, g.c.ink], base = [0.75, 0.8, 0.85];
  const stroke = (B, w, a, col) => { if (!B.length) return; g.pen(ctx, w, a, col); ctx.beginPath(); for (let i = 0; i < B.length; i += 4) { ctx.moveTo(B[i], B[i + 1]); ctx.lineTo(B[i + 2], B[i + 3]); } ctx.stroke(); };
  BK.forEach((B, b) => stroke(B, 'fine', base[b >> 2] * (0.35 + 0.65 * ((b & 3) + 1) / 4), cols[b >> 2]));
  // ---- ring construction: spokes, side ticks, chords of the hole ----
  g.pen(ctx, 'hair', 0.6 * pulse, cons); ctx.beginPath();
  const ext = 0.08 / sc, seg = (a, b, c, d) => { ctx.moveTo(X(a, b), Y(a, b)); ctx.lineTo(X(c, d), Y(c, d)); };
  for (let k = 0; k < n; k++) { const v = S.outer[2 * k], r = 1 + ext / Math.hypot(v[0], v[1]); seg(v[0] * r, v[1] * r, -v[0] * r, -v[1] * r); }
  for (let k = 0; k < N2; k++) { // at each corner, extend the incoming and the outgoing side
    const v = S.outer[2 * k], ui = u(S.outer[(2 * k + 4 * n - 1) % (4 * n)][2]), uo = u(v[2]), L = 0.9;
    seg(v[0], v[1], v[0] + ui[0] * L, v[1] + ui[1] * L); seg(v[0], v[1], v[0] - uo[0] * L, v[1] - uo[1] * L);
  }
  const hv = S.hole.filter((_, i) => n % 2 || i % 2 === 0);
  for (let i = 0; i < hv.length; i++) for (let j = i + 2; j < hv.length; j++) seg(hv[i][0], hv[i][1], hv[j][0], hv[j][1]);
  ctx.stroke();
  // ---- outlines, every edge once ----
  stroke([...E.values()].flat(), 'line', 0.9, g.c.ink); GE.forEach((B, q) => stroke(B, 'line', 0.9 * (q + 0.5) / 4, g.c.ink));
}
