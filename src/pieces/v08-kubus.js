// V08 Kubus (Escher's cube stack, a lozenge tiling that keeps rebuilding itself).
// One rule: the hexagon is tiled by rhombi in three orientations, which is exactly a stack of cubes in a corner (a plane partition); cubes are added and removed at free corners, one flip of three rhombi at a time.
export const meta = {
  id: 'v08-kubus', pencils: true, title: 'Kubus (origineel)', nl: 'Kubusstapeling', T: 16, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'h(i,j) in 0..n, h(i,j) >= h(i+1,j), h(i,j) >= h(i,j+1); the hexagon n x n x n is tiled by 3n^2 rhombi; a flip of three rhombi adds or removes one cube',
  label: 'An isometric stack of cubes in a corner, drawn as a pencil tiling of rhombi in three tones; cubes are added and removed one at a time so the heap grows, collapses and builds towers and canyons.',
  // n: edge of the box in cubes; pitch: hatch spacing of the lightest tone in S
  params: { n: 4, pitch: 0.0078, construction: 0 },
};

const TAU = 2 * Math.PI, C30 = Math.sqrt(3) / 2, MEMO = {}, DUR = 1.35, RISE = 2.2, K = 14, OFF = 0.25;
const hash = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };
const near = (a, b, N) => Math.abs(((a / N) | 0) - ((b / N) | 0)) <= 1 && Math.abs(a % N - b % N) <= 1;
// a cube may be added on a column whose back neighbours are taller, removed from one whose front neighbours are lower
const canAdd = (h, N, c) => { const i = (c / N) | 0, j = c % N; return h[c] < N && (!i || h[c - N] > h[c]) && (!j || h[c - 1] > h[c]); };
const canDel = (h, N, c) => { const i = (c / N) | 0, j = c % N; return h[c] > 0 && (i === N - 1 || h[c + N] < h[c]) && (j === N - 1 || h[c + 1] < h[c]); };
// a random legal column that stays clear of the columns still in flight (so every frame is a tidy stack)
const pick = (h, N, ok, recent, r) => {
  const L = []; for (let c = 0; c < N * N; c++) if (ok(h, N, c)) L.push(c);
  const free = L.filter(c => !recent.some(d => near(c, d, N))), A = free.length ? free : L;
  return A.length ? A[(r() * A.length) | 0] : -1;
};
const step = (h, c, add) => { h = h.slice(); h[c] += add ? 1 : -1; return h; };

// ---- move tables: H[j] = heights after j moves, mv[j] = the j-th move. Pure in (seed, n, mode); never mutated by a frame. ----
function table(g, N, live) {
  const key = g.seed + '|' + N + (live ? 'L' : 'C'); if (MEMO[key]) return MEMO[key];
  const r0 = g.rng('start'); let s0 = new Uint8Array(N * N);
  for (let k = 0; k < 9; k++) { const c = pick(s0, N, canAdd, [], r0); if (c >= 0) s0 = step(s0, c, 1); }
  const tb = { H: [s0], mv: [], ensure: () => {} };
  if (live) { // endless Glauber-like walk; the target volume breathes slowly between a low and a tall heap
    tb.ensure = m => {
      while (tb.mv.length < m) {
        const j = tb.mv.length, h = tb.H[j], V = h.reduce((a, b) => a + b, 0), r = g.rng('L' + j), rec = tb.mv.slice(-3).map(q => q.c);
        const Vt = N ** 3 * (0.4 + 0.2 * Math.sin(j * 0.108 - Math.PI / 2) + 0.05 * Math.sin(j * 0.0431));
        let add = r() < Math.min(0.94, Math.max(0.06, 0.5 + 0.5 * (Vt - V) / 5)), c = pick(h, N, add ? canAdd : canDel, rec, r);
        if (c < 0) { add = !add; c = pick(h, N, add ? canAdd : canDel, rec, r); }
        const h2 = step(h, c, add); tb.mv.push({ c, add, lvl: add ? h2[c] - 1 : h2[c] }); tb.H.push(h2);
      }
    };
  } else { // K cubes arrive in a random order, then the same cubes leave in another order: a closed walk
    const STEP = g.T / (2 * K);
    for (let a = 0; a < 40; a++) {
      const r = g.rng('loop' + a), H = [s0], mv = [], D = new Uint8Array(N * N); let h = s0;
      const go = (ok, add) => { const c = pick(h, N, ok, mv.slice(-3).map(q => q.c), r); h = step(h, c, add); D[c] += add ? 1 : -1; mv.push({ c, add, lvl: add ? h[c] - 1 : h[c] }); H.push(h); };
      for (let j = 0; j < K; j++) go(canAdd, true);
      for (let j = 0; j < K; j++) go((hh, n, c) => D[c] > 0 && canDel(hh, n, c), false);
      tb.H = H; tb.mv = mv;
      let bad = false; // cyclic time: no two near moves in the air together
      for (let i = 0; i < 2 * K && !bad; i++) for (let j = i + 1; j < 2 * K; j++) { const d = (j - i) * STEP; if (Math.min(d, g.T - d) < DUR && near(mv[i].c, mv[j].c, N)) { bad = true; break; } }
      if (!bad) break;
    }
  }
  const ks = Object.keys(MEMO); if (ks.length > 8) delete MEMO[ks[0]];
  return (MEMO[key] = tb);
}

export function draw(ctx, { g }) {
  const P = g.params, N = Math.max(2, Math.min(6, P.n | 0)), live = g.live, T = g.T, tb = table(g, N, live), tr = g.ease;
  const STEP = live ? 0.62 : T / (2 * K), tau = live ? g.drift : g.p * T, sj = j => OFF + j * STEP + (live ? 0.18 * STEP * Math.sin(1.9 * j + 0.7) : 0);
  let m;
  if (live) { m = Math.max(0, Math.floor((tau - OFF) / STEP)); while (sj(m) <= tau) m++; while (m > 0 && sj(m - 1) > tau) m--; tb.ensure(m + 1); }
  else m = Math.max(0, Math.min(2 * K, Math.floor((tau - OFF) / STEP) + 1));
  const fl = [];
  for (let j = m - 3; j < m; j++) { // moves still in the air (the loop wraps: the last moves spill into the next period)
    const jj = j < 0 ? (live ? -1 : j + 2 * K) : j; if (jj < 0) continue;
    const q = (tau - sj(jj) + (j < 0 && !live ? T : 0)) / DUR; if (q >= 0 && q < 1) fl.push({ ...tb.mv[jj], q });
  }
  const Hs = tb.H[m].slice(); fl.forEach(f => { if (f.add) Hs[f.c]--; }); // the flying cube is not yet part of the static heap (or already gone)
  const hh = (i, j) => (i < 0 || j < 0 ? N : i >= N || j >= N ? 0 : Hs[i * N + j]);

  const u = Math.min(g.bx / (N * C30), g.by / N) * 0.93, R = N * u, ink = g.c.ink;
  const nH = [0, 1, 2].map(t => Math.max(2, Math.round(C30 * u / (P.pitch * [1.8, 1.25, 1][t])))), base = [0.7, 0.8, 0.9];
  const c2 = ctx;

  // ---- faces: type 0 top (A = x, B = y), 1 right (A = y, B = z), 2 left (A = x, B = z); tone = type ----
  const ex = [C30 * u, 0.5 * u], ey = [-C30 * u, 0.5 * u], ez = [0, -u], lk = (x, y, z) => (x - y + 8) * 32 + (x + y - 2 * z + 40);
  const mk = () => ({ b: Array.from({ length: 9 }, () => []), em: new Map() });
  const face = (L, ty, x, y, z, dz) => {
    const O = [(x - y) * C30 * u, ((x + y) / 2 - z - dz) * u], A = ty === 1 ? ey : ex, B = ty === 0 ? ey : ez, key = ((ty * 16 + x + 2) * 16 + y + 2) * 16 + z + 2;
    const cr = ty === 0 ? [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]] : ty === 1 ? [[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]] : [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]];
    const pt = [O, [O[0] + A[0], O[1] + A[1]], [O[0] + A[0] + B[0], O[1] + A[1] + B[1]], [O[0] + B[0], O[1] + B[1]]];
    for (let k = 0; k < 4; k++) { const a = lk(...cr[k]), b = lk(...cr[(k + 1) % 4]), e = a < b ? a * 1024 + b : b * 1024 + a; L.em.set(e, [pt[k][0], pt[k][1], pt[(k + 1) % 4][0], pt[(k + 1) % 4][1]]); }
    const n = nH[ty], bk = (i, a) => L.b[ty * 3 + Math.floor(hash(key, i, 5 + a) * 2.999)], ends = (i, a) => [0.04 + 0.07 * hash(key, i, a), 0.96 - 0.07 * hash(key, i, a + 2)];
    const at = (s, t) => [O[0] + s * A[0] + t * B[0], O[1] + s * A[1] + t * B[1]];
    for (let i = 0; i < n; i++) { // ends stop a little short of the edges, like a pencil
      const f = (i + 0.5) / n;
      if (ty !== 1) { const [a, b] = ends(i, 1); bk(i, 1).push(...at(a, f), ...at(b, f)); } // along A
      if (ty) { const [a, b] = ends(i, 0); bk(i, 0).push(...at(f, a), ...at(f, b)); } // along B (upright)
    }
    if (ty === 2) for (let i = 0; i < n; i++) { // dark: plus lines parallel to the third axis, across the face
      const cc = -1 + 2 * (i + 0.5) / n, lo = Math.max(0, -cc), hi = Math.min(1, 1 - cc), [a, b] = ends(i, 3), s0 = lo + (hi - lo) * a, s1 = lo + (hi - lo) * b;
      bk(i, 3).push(...at(s0, s0 + cc), ...at(s1, s1 + cc));
    }
  };
  const strokeL = (L, fade) => {
    L.b.forEach((a, i) => {
      if (!a.length) return; g.pen(c2, 'hair', base[(i / 3) | 0] * (0.6 + 0.2 * (i % 3)) * fade, ink); c2.beginPath();
      for (let k = 0; k < a.length; k += 4) { c2.moveTo(a[k], a[k + 1]); c2.lineTo(a[k + 2], a[k + 3]); } c2.stroke();
    });
    g.pen(c2, 'fine', 0.85 * fade, ink); c2.beginPath(); L.em.forEach(e => { c2.moveTo(e[0], e[1]); c2.lineTo(e[2], e[3]); }); c2.stroke();
  };

  // ---- hand construction: circles through the corners and the edge midpoints, the three axes with unit ticks, the sides run on past the corners ----
  const construct = mul => { if (!g.params.construction) return;
  const br = Math.sin(g.voice(3)), pa = 0.75 + 0.25 * Math.sin(g.voice(2)), ext = 0.2 * R * (1 + 0.3 * Math.sin(g.voice(4)));
  g.pen(c2, 'hair', 0.6 * pa * mul, g.c.tint1); c2.beginPath();
  const rc = R * (1 + 0.012 * br), ri = R * C30 * (1 - 0.01 * br);
  c2.moveTo(rc, 0); c2.arc(0, 0, rc, 0, TAU); c2.moveTo(ri, 0); c2.arc(0, 0, ri, 0, TAU);
  const axes = [ex, ey, ez];
  for (const d of axes) {
    c2.moveTo(-d[0] * R * 1.2, -d[1] * R * 1.2); c2.lineTo(d[0] * R * 1.2, d[1] * R * 1.2);
    for (let k = -N - 1; k <= N + 1; k++) if (k) c2.moveTo(d[0] * k * u - d[1] * 0.1 * u, d[1] * k * u + d[0] * 0.1 * u), c2.lineTo(d[0] * k * u + d[1] * 0.1 * u, d[1] * k * u - d[0] * 0.1 * u);
  }
  for (let i = 0; i < 6; i++) { const a = hv[i], b = hv[(i + 1) % 6], dx = (b[0] - a[0]) / R, dy = (b[1] - a[1]) / R; c2.moveTo(a[0] - dx * ext, a[1] - dy * ext); c2.lineTo(b[0] + dx * ext, b[1] + dy * ext); }
  c2.stroke();
  };
  const hv = [[0, -1], [C30, -0.5], [C30, 0.5], [0, 1], [-C30, 0.5], [-C30, -0.5]].map(v => [v[0] * R, v[1] * R]);

  // ---- the standing heap: every visible face once, 3 n^2 rhombi in all ----
  const S = mk();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) face(S, 0, i, j, hh(i, j), 0);
  for (let i = -1; i < N; i++) for (let j = 0; j < N; j++) for (let k = hh(i + 1, j); k < hh(i, j); k++) face(S, 1, i + 1, j, k, 0);
  for (let i = 0; i < N; i++) for (let j = -1; j < N; j++) for (let k = hh(i, j + 1); k < hh(i, j); k++) face(S, 2, i, j + 1, k, 0);
  const paint = mul => { construct(mul); strokeL(S, mul); g.pen(c2, 'line', 0.9 * mul, ink); c2.beginPath(); hv.forEach((v, i) => i ? c2.lineTo(v[0], v[1]) : c2.moveTo(v[0], v[1])); c2.closePath(); c2.stroke(); };

  // ---- cubes in flight: a whole cube, eased, in front of everything (it lands on, or lifts off, the top of its column).
  // The heap is drawn through a clip that leaves a hole where a cube flies, and inside each hole at (1 - fade), so the cube crosses over from the heap.
  fl.sort((a, b) => ((a.c / N) | 0) + (a.c % N) + a.lvl - ((b.c / N) | 0) - (b.c % N) - b.lvl);
  const hex = (f, k) => { const e = tr.sine(f.q), dz = RISE * (f.add ? 1 - e : e), i = (f.c / N) | 0, j = f.c % N;
    f.dz = dz; f.i = i; f.j = j; f.fade = f.add ? tr.smoother(f.q * 2.2) : 1 - tr.smoother((f.q - 0.45) / 0.55);
    const ox = (i - j) * C30 * u, oy = ((i + j) / 2 - f.lvl - dz) * u; [[0, -1], [C30, -0.5], [C30, 0.5], [0, 1], [-C30, 0.5], [-C30, -0.5]].forEach((v, n) => n ? c2.lineTo(ox + v[0] * u, oy + v[1] * u) : c2.moveTo(ox + v[0] * u, oy + v[1] * u)); c2.closePath(); };
  const cut = (from, own) => { c2.save(); c2.beginPath(); if (own) hex(own); else c2.rect(-3, -3, 6, 6); for (const f of fl.slice(from)) hex(f); c2.clip(own ? 'nonzero' : 'evenodd'); };
  fl.forEach(f => { c2.beginPath(); hex(f); }); // fills each flyer's fade, dz and column
  if (fl.length) cut(0); paint(1); if (fl.length) c2.restore();
  fl.forEach((f, k) => {
    c2.save(); c2.beginPath(); hex(f); c2.clip(); paint(1 - f.fade); c2.restore();
    c2.save(); c2.beginPath(); c2.rect(-3, -3, 6, 6); fl.slice(k + 1).forEach(o => hex(o)); c2.clip('evenodd');
    const F = mk(), z = f.lvl; face(F, 0, f.i, f.j, z + 1, f.dz); face(F, 1, f.i + 1, f.j, z, f.dz); face(F, 2, f.i, f.j + 1, z, f.dz); strokeL(F, f.fade); c2.restore();
  });
}
