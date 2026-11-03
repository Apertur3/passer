// V08 Kubus (Escher's cube world: a heap of cubes that only ever grows).
// One rule: a heap of isometric cubes is a plane partition (heights fall away from the corner); cubes are only added, one whole cube at a time at a free corner, and the view slowly pulls back so the heap always fits the page.
export const meta = {
  id: 'v08-kubus', pencils: true, title: 'Kubus', nl: 'Kubusstapeling', T: 64, still: 0.6, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'h(i,j) in 0..24, h(i,j) >= h(i+1,j), h(i,j) >= h(i,j+1); each visible face is a rhombus of the lozenge tiling; a flip of three rhombi adds one cube; hatching is dyadic, level l adds the lines at odd multiples of 2^-(l+1)',
  label: 'A heap of isometric cubes drawn in pencil, three tones of hatching on the three face directions; cubes are only added, one at a time, and the view pulls back so the growing heap, with its terraces and towers, stays in frame.',
  // construction: 1 draws the faint circle and axes behind the heap
  params: { construction: 0 },
};

const TAU = 2 * Math.PI, C30 = Math.sqrt(3) / 2, MEMO = {}, DUR = 1.35, RISE = 2.2, M = 24, KMAX = 700, SEAM = 28, OFF = 0.25, TC = 6, STEP = 0.7;
const near = (a, b) => Math.abs(((a / M) | 0) - ((b / M) | 0)) <= 1 && Math.abs(a % M - b % M) <= 1;
const canAdd = (h, c) => { const i = (c / M) | 0, j = c % M; return h[c] < M && (!i || h[c - M] > h[c]) && (!j || h[c - 1] > h[c]); };
// bounding box of the heap in units of a cube edge: centre, half width, half height
const bbox = h => {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (let k = 0; k < M * M; k++) if (h[k]) { const i = (k / M) | 0, j = k % M; a = Math.min(a, i - j - 1); b = Math.max(b, i + 1 - j); c = Math.min(c, (i + j) / 2 - h[k]); d = Math.max(d, (i + j + 2) / 2); }
  return a > b ? [0, 0, 1, 1] : [(a + b) / 2 * C30, (c + d) / 2, (b - a) / 2 * C30 + 0.3, (d - c) / 2 + 0.8];
};
// a pile that tends to a terraced pyramid: free corners near the back corner and low down are likelier; now and then a tower
function grow(h, j, r, rec) {
  const lam = 1.6 + 0.9 * Math.cbrt(j + 10), C = [], W = []; let tot = 0, tall = -1;
  for (let c = 0; c < M * M; c++) if (canAdd(h, c)) { const w = Math.exp(-(((c / M) | 0) + c % M + 1.7 * h[c] + 0.8 * Math.abs(((c / M) | 0) - c % M)) / lam) * (rec.some(d => near(c, d)) ? 0.02 : 1); C.push(c); W.push(w); tot += w; if (h[c] < 5 && h[c] > (tall < 0 ? -1 : h[C[tall]])) tall = C.length - 1; }
  if (r() < 0.06 && tall >= 0 && W[tall] > 0.2 * tot / C.length) return C[tall];
  let x = r() * tot, k = 0; while (k < C.length - 1 && (x -= W[k]) > 0) k++; return C[k];
}
// move tables, pure in (seed, epoch): H[j] = heights after j moves, mv[j] = the j-th move, B[j] = its bounding box
function table(g, e, K) {
  const key = g.seed + '|' + e + '|' + K; if (MEMO[key]) return MEMO[key];
  let h = new Uint8Array(M * M); const r0 = g.rng('s' + e), tb = { H: [h], mv: [], B: [], K };
  for (let k = 0; k < 6; k++) { h = h.slice(); h[grow(h, 0, r0, [])]++; } tb.H[0] = h; tb.B[0] = bbox(h);
  tb.ensure = m => { m = Math.min(m, K); while (tb.mv.length < m) { const j = tb.mv.length, h = tb.H[j], c = grow(h, j, g.rng('g' + e + ',' + j), tb.mv.slice(-4).map(q => q.c)), h2 = h.slice(); h2[c]++; tb.mv.push({ c, lvl: h2[c] - 1 }); tb.H.push(h2); tb.B.push(bbox(h2)); } };
  const ks = Object.keys(MEMO); if (ks.length > 6) delete MEMO[ks[0]];
  return (MEMO[key] = tb);
}

// one epoch of the heap at time tau (seconds since its start), drawn at global alpha ga
function pile(g, c, tb, tau, ga, live) {
  const sj = j => OFF + j * STEP + (live ? 0.18 * STEP * Math.sin(1.9 * j + 0.7) : 0), K = tb.K, sm = g.ease.smoother;
  let m = Math.max(0, Math.floor((tau - OFF) / STEP)); while (sj(m) <= tau) m++; while (m > 0 && sj(m - 1) > tau) m--; m = Math.min(m, K); tb.ensure(m + 6);
  const fl = []; for (let j = m - 4; j < m; j++) if (j >= 0) { const q = (tau - sj(j)) / DUR; if (q < 1) fl.push({ ...tb.mv[j], q }); }
  const Hs = tb.H[m].slice(); fl.forEach(f => Hs[f.c]--);
  // the camera: a box filter over the heap's size nine moves wide, so the pull-back is smooth
  const cam = j => { let a = 0, b = 0, d = 0, n = 0; for (let k = Math.max(0, j - 4); k <= Math.min(tb.mv.length, j + 4); k++) { const B = tb.B[k]; a += Math.log(Math.min(g.bx / B[2], g.by / B[3])); b += B[0]; d += B[1]; n++; } return [a / n, b / n, d / n]; };
  const mu = Math.min(K, Math.max(0, (tau - OFF) / STEP + 1)), j0 = Math.floor(mu), f0 = mu - j0, c0 = cam(j0), c1 = cam(Math.min(K, j0 + 1));
  const u = Math.min(0.17, Math.exp(c0[0] + (c1[0] - c0[0]) * f0) * 0.92), cx = c0[1] + (c1[1] - c0[1]) * f0, cy = c0[2] + (c1[2] - c0[2]) * f0, ink = g.c.ink;
  const px = C30 * u * g.S, fade = l => sm((px / 2 ** (l + 1) - 2.6) / 1.6), FL = [0, 1, 2, 3].map(fade); // hatch level l is drawn once its own spacing passes about 3 px
  const flat = Math.max(0, 1 - FL[1]), fe = sm((u * g.S - 2) / 5); // below that the faces turn into tone fills; cube edges fade out last
  const ex = [C30 * u, 0.5 * u], ey = [-C30 * u, 0.5 * u], ez = [0, -u], lk = (x, y, z) => (x - y + 64) * 256 + (x + y - 2 * z + 64), CAP = [2, 3, 3];
  const mkL = () => ({ b: Array.from({ length: 12 }, () => []), p: [[], [], []], em: new Map() });
  const face = (L, ty, x, y, z, dz) => {
    const O = [((x - y) * C30 - cx) * u, ((x + y) / 2 - z - dz - cy) * u], A = ty === 1 ? ey : ex, B = ty === 0 ? ey : ez, at = (s, t) => [O[0] + s * A[0] + t * B[0], O[1] + s * A[1] + t * B[1]];
    const cr = ty === 0 ? [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]] : ty === 1 ? [[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]] : [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], P = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
    for (let k = 0; k < 4; k++) { const a = lk(...cr[k]), b = lk(...cr[(k + 1) % 4]), q = P[(k + 1) % 4]; L.em.set(a < b ? a * 32768 + b : b * 32768 + a, [P[k][0], P[k][1], q[0], q[1]]); }
    if (flat > 0.01) L.p[ty].push(P);
    for (let l = 0; l <= CAP[ty]; l++) if (FL[l] > 0.01) for (let k = 0; k < 2 ** l; k++) { // dyadic hatching: level l adds the odd multiples of 2^-(l+1), so lines never creep
      const f = (2 * k + 1) / 2 ** (l + 1), bk = L.b[ty * 4 + l], s0 = 0.05, s1 = 0.95;
      if (ty === 0) bk.push(...at(s0, f), ...at(s1, f)); else bk.push(...at(f, s0), ...at(f, s1));
      if (ty === 2 && l < 3) { const cc = -1 + 2 * f, lo = Math.max(0, -cc), hi = Math.min(1, 1 - cc); bk.push(...at(lo + (hi - lo) * s0, lo + (hi - lo) * s0 + cc), ...at(lo + (hi - lo) * s1, lo + (hi - lo) * s1 + cc)); }
    }
  };
  const strokeL = (L, mul) => {
    const base = [0.75, 0.85, 0.95];
    L.b.forEach((a, i) => { const ty = i >> 2, l = i & 3; if (!a.length) return; g.pen(c, 'hair', base[ty] * FL[l] * mul * ga, ink); c.beginPath(); for (let k = 0; k < a.length; k += 4) { c.moveTo(a[k], a[k + 1]); c.lineTo(a[k + 2], a[k + 3]); } c.stroke(); });
    if (flat > 0.01) L.p.forEach((ps, ty) => { if (!ps.length) return; c.globalAlpha = [0.07, 0.16, 0.28][ty] * flat * mul * ga; c.fillStyle = ink; c.beginPath(); ps.forEach(P => { c.moveTo(...P[0]); for (let k = 1; k < 4; k++) c.lineTo(...P[k]); c.closePath(); }); c.fill(); });
    g.pen(c, 'fine', 0.9 * fe * mul * ga, ink); c.beginPath(); L.em.forEach(e => { c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]); }); c.stroke();
  };
  const hh = (i, j) => (i >= M || j >= M ? 0 : Hs[i * M + j]), S = mkL();
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) { const h = hh(i, j); if (h) face(S, 0, i, j, h, 0); for (let k = hh(i + 1, j); k < h; k++) face(S, 1, i + 1, j, k, 0); for (let k = hh(i, j + 1); k < h; k++) face(S, 2, i, j + 1, k, 0); }
  const paint = mul => { if (g.params.construction) { g.pen(c, 'hair', 0.5 * mul * ga, g.c.tint1); c.beginPath(); c.arc(0, 0, 0.45 * Math.min(g.bx, g.by) * 2, 0, TAU); for (const d of [ex, ey, ez]) { c.moveTo(-d[0] * 30, -d[1] * 30); c.lineTo(d[0] * 30, d[1] * 30); } c.stroke(); } strokeL(S, mul); };
  // cubes in flight: whole cubes, eased down from above, in front of everything; the heap is drawn through a hole where one flies
  const HX = [[0, -1], [C30, -0.5], [C30, 0.5], [0, 1], [-C30, 0.5], [-C30, -0.5]];
  fl.forEach(f => { const e = g.ease.sine(f.q), i = (f.c / M) | 0, j = f.c % M; f.dz = RISE * (1 - e); f.i = i; f.j = j; f.fade = sm(f.q * 3.3); f.ox = ((i - j) * C30 - cx) * u; f.oy = ((i + j) / 2 - f.lvl - f.dz - cy) * u; });
  const hex = f => { HX.forEach((v, k) => k ? c.lineTo(f.ox + v[0] * u, f.oy + v[1] * u) : c.moveTo(f.ox + v[0] * u, f.oy + v[1] * u)); c.closePath(); };
  if (fl.length) { c.save(); c.beginPath(); c.rect(-3, -3, 6, 6); fl.forEach(hex); c.clip('evenodd'); } paint(1); if (fl.length) c.restore();
  fl.forEach((f, k) => {
    c.save(); c.beginPath(); hex(f); c.clip(); paint(1 - f.fade); c.restore();
    c.save(); c.beginPath(); c.rect(-3, -3, 6, 6); fl.slice(k + 1).forEach(hex); c.clip('evenodd');
    const F = mkL(); face(F, 0, f.i, f.j, f.lvl + 1, f.dz); face(F, 1, f.i + 1, f.j, f.lvl, f.dz); face(F, 2, f.i, f.j + 1, f.lvl, f.dz); strokeL(F, f.fade); c.restore();
  });
  c.globalAlpha = 1;
}

export function draw(ctx, { g }) {
  const T = g.T, live = g.live, sm = g.ease.smoother;
  if (!live) { // loop: the heap grows for T - TC seconds, then the last frame dissolves into the first (frame(T) = frame(0))
    const tau = g.p * T, K = Math.floor((T - TC - OFF - DUR) / STEP), tb = table(g, 0, K), a = tau > T - TC ? sm((tau - (T - TC)) / TC) : 0;
    pile(g, ctx, tb, Math.min(tau, T - TC), 1 - a, false); if (a > 0) pile(g, ctx, tb, 0, a, false); return;
  }
  // live: epoch k lasts L moves, then the next heap (a fresh seed at the large scale of a beginner's heap) dissolves in under a long seam; the old one dissolves out
  const L = KMAX - SEAM, per = L * STEP, t = g.drift, k = Math.floor(t / per), a = k ? sm((t - k * per) / (SEAM * STEP)) : 1;
  if (a < 1) pile(g, ctx, table(g, k - 1, KMAX), t - (k - 1) * per, 1 - a, true);
  pile(g, ctx, table(g, k, KMAX), t - k * per, a, true);
}
