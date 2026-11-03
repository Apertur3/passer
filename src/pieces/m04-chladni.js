// M04 Chladni figure (a vibrating square plate, sand on its nodal lines).
// One rule: two standing-wave modes of a square plate are mixed with cos and sin of one angle; sand collects where the plate does not move, and that set drifts and reconnects as the mix turns.
export const meta = {
  id: 'm04-chladni', title: 'Chladni figure', T: 12, still: 0.12, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'u = cos t (cos n pi x cos m pi y - cos m pi x cos n pi y) + sin t (same with n\', m\');  sand on u = 0, contours at u = +-0.15, +-0.3',
  label: 'The standing-wave pattern of a square plate drawn as contours of the displacement, with sand collecting on the lines where the plate stays still while two vibration modes cross-fade.',
  // grain: sand grains; cell: grid cell in px at 700 px width (floor 4); stage: seconds a live cross-fade takes
  params: { grain: 9000, cell: 5.5, stage: 6.5 },
};

const TAU = Math.PI * 2;
const SEG = [null, [3, 0], [0, 1], [3, 1], [1, 2], 0, [0, 2], [3, 2], [3, 2], [0, 2], 0, [1, 2], [3, 1], [0, 1], [3, 0]]; // marching squares: edge pairs (0 top, 1 right, 2 bottom, 3 left)
const LV = [[0, 'line', 1, 0], [0.15, 'fine', 0.6, 1], [-0.15, 'fine', 0.6, 2], [0.3, 'hair', 0.65, 1], [-0.3, 'hair', 0.65, 2]]; // level, weight, alpha, colour (0 ink, 1 ink, 2 cool: negative lobes)
const SC = { e: new Float64Array(8), E: 0, G: 0, u: null, c: null, gx: null, gy: null, ox: null, oy: null, N: 0 };
const SADDLE = [[3, 2, 0, 1], [3, 0, 1, 2]]; // the two ways to join the four crossings of an ambiguous cell
const mode = (g, k) => { // mode pair k of the plate, seeded: 3 <= n < m <= 8
  const r = g.rng('mode' + k), n = 4 + Math.floor(r() * 4);
  return [n, n + 1 + Math.floor(r() * (10 - n))];
};
export function draw(ctx, { g, seed }) {
  const P = g.params, H = Math.min(g.bx, g.by), qq = g.q ?? 1, qs = qq > 0.8 ? 1 : qq > 0.5 ? 0.78 : 0.6; // under load: a coarser grid (in three steps, so it never reallocates every frame) and fewer grains and levels
  const G = Math.max(40, Math.min(150, Math.round(2 * H * g.S / Math.max(4, P.cell * g.S / 700) * qs))), h = 2 * H / G;
  if (SC.G !== G) { SC.G = G; SC.u = new Float32Array((G + 1) * (G + 1)); SC.c = new Float32Array(4 * (G + 1)); }
  const U = SC.u, C = SC.c, W = G + 1;
  // the two modes and their weights: loop mode turns one pair through a full angle, live mode walks along a chain of pairs
  let ma, mb, ca, sb;
  if (g.live) { const s = g.drift / P.stage, k = Math.floor(s), f = s - k; ma = mode(g, k); mb = mode(g, k + 1); ca = Math.cos(f * Math.PI / 2); sb = Math.sin(f * Math.PI / 2); }
  else { ma = mode(g, 0); mb = mode(g, 1); ca = Math.cos(g.theta); sb = Math.sin(g.theta); }
  if (ma[0] === mb[0] && ma[1] === mb[1]) mb = [mb[1], mb[0] === 2 ? 3 : 2]; // never the same mode twice
  const ks = [ma[0], ma[1], mb[0], mb[1]];
  for (let q = 0; q < 4; q++) for (let i = 0; i < W; i++) C[q * W + i] = Math.cos(ks[q] * Math.PI * i / G);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++)
    U[j * W + i] = ca * (C[i] * C[W + j] - C[W + i] * C[j]) + sb * (C[2 * W + i] * C[3 * W + j] - C[3 * W + i] * C[2 * W + j]);
  const px = (i) => -H + i * h; // plate coordinate of node i
  // contours: marching squares with linear interpolation; the cell segments are chained into polylines (one subpath per line, not one per cell), one path per level
  const E = 2 * W * G, HN = W * G, e = SC.e;
  if (SC.E !== E) { SC.E = E; SC.n1 = new Int32Array(E); SC.n2 = new Int32Array(E); SC.ex = new Float32Array(E); SC.ey = new Float32Array(E); SC.vis = new Uint8Array(E); SC.used = new Int32Array(E); }
  const { n1, n2, ex, ey, vis, used } = SC;
  for (const [lv, wt, al, col] of LV) {
    if (qq < 0.6 && wt === 'hair') continue;
    g.pen(ctx, wt, al, col === 2 ? g.c.cool : g.c.ink); n1.fill(-1); n2.fill(-1); vis.fill(0); let nu = 0;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const a = U[j * W + i] - lv, b = U[j * W + i + 1] - lv, c = U[(j + 1) * W + i + 1] - lv, d = U[(j + 1) * W + i] - lv;
      const m = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0); if (m === 0 || m === 15) continue;
      const x0 = px(i), y0 = px(j);
      e[0] = x0 + h * a / (a - b); e[1] = y0; e[2] = x0 + h; e[3] = y0 + h * b / (b - c); e[4] = x0 + h * d / (d - c); e[5] = y0 + h; e[6] = x0; e[7] = y0 + h * a / (a - d);
      const id0 = j * G + i, id1 = HN + j * W + i + 1, id2 = (j + 1) * G + i, id3 = HN + j * W + i; // edge ids: top, right, bottom, left
      let s = SEG[m];
      if (s === 0) { const mid = a + b + c + d > 0; s = m === 5 ? (mid ? SADDLE[0] : SADDLE[1]) : (mid ? SADDLE[1] : SADDLE[0]); }
      for (let k = 0; k < s.length; k += 2) {
        const p = s[k] === 0 ? id0 : s[k] === 1 ? id1 : s[k] === 2 ? id2 : id3, q = s[k + 1] === 0 ? id0 : s[k + 1] === 1 ? id1 : s[k + 1] === 2 ? id2 : id3;
        ex[p] = e[s[k] * 2]; ey[p] = e[s[k] * 2 + 1]; ex[q] = e[s[k + 1] * 2]; ey[q] = e[s[k + 1] * 2 + 1];
        if (n1[p] < 0) { n1[p] = q; used[nu++] = p; } else n2[p] = q;
        if (n1[q] < 0) { n1[q] = p; used[nu++] = q; } else n2[q] = p;
      }
    }
    ctx.beginPath();
    for (let pass = 0; pass < 2; pass++) for (let u = 0; u < nu; u++) { // open lines first (they start at an end), then the closed loops
      let cur = used[u]; if (vis[cur] || (pass === 0 && n2[cur] >= 0)) continue;
      let prev = -1; ctx.moveTo(ex[cur], ey[cur]);
      for (;;) { vis[cur] = 1; const nx = n1[cur] !== prev ? n1[cur] : n2[cur]; if (nx < 0) break; ctx.lineTo(ex[nx], ey[nx]); if (vis[nx]) break; prev = cur; cur = nx; }
    }
    ctx.stroke();
  }
  // sand: grains start at seeded places and slide to the nearest nodal line (a few damped Newton steps on the same grid), then keep their seeded sideways scatter
  const N = P.grain, Nq = Math.max(1, Math.round(N * Math.min(1, g.q ?? 1))); // fewer grains when the governor asks for it
  if (SC.N !== N || SC.seed !== seed) { const r = g.rng('sand'); SC.N = N; SC.seed = seed; SC.gx = new Float32Array(N); SC.gy = new Float32Array(N); SC.ox = new Float32Array(N); SC.oy = new Float32Array(N);
    for (let n = 0; n < N; n++) { SC.gx[n] = r(); SC.gy[n] = r(); const a = r() * TAU, d = 0.0016 * (r() + r() + r()) / 1.5; SC.ox[n] = d * Math.cos(a); SC.oy[n] = d * Math.sin(a); } }
  ctx.fillStyle = g.c.ink; ctx.globalAlpha = 0.85; ctx.beginPath(); const spx = Math.max(1, Math.round(0.0019 * g.S)), sz = spx / g.S, cx = g.w / 2, cy = g.h / 2; // grains snap to whole device pixels: axis-aligned pixel rects are the fast path of every rasteriser
  for (let n = 0; n < Nq; n++) {
    let x = SC.gx[n] * G, y = SC.gy[n] * G;
    for (let it = 0; it < 3; it++) {
      const i = Math.min(G - 1, x | 0), j = Math.min(G - 1, y | 0), fx = x - i, fy = y - j, o = j * W + i;
      const a = U[o], b = U[o + 1], c = U[o + W + 1], d = U[o + W];
      const u = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * fx * fy + d * (1 - fx) * fy;
      const gx = (b - a) * (1 - fy) + (c - d) * fy, gy = (d - a) * (1 - fx) + (c - b) * fx, gg = gx * gx + gy * gy + 1e-4;
      let dx = -u * gx / gg, dy = -u * gy / gg; const L = Math.hypot(dx, dy); if (L > 2.5) { dx *= 2.5 / L; dy *= 2.5 / L; }
      x = Math.min(G, Math.max(0, x + dx)); y = Math.min(G, Math.max(0, y + dy));
    }
    const X = -H + x * h + SC.ox[n], Y = -H + y * h + SC.oy[n];
    if (X > -H && X < H && Y > -H && Y < H) ctx.rect((Math.round(cx + X * g.S) - cx) / g.S, (Math.round(cy + Y * g.S) - cy) / g.S, sz, sz);
  }
  ctx.fill();
  g.pen(ctx, 'hair', 0.7, g.c.tint1); ctx.strokeRect(-H, -H, 2 * H, 2 * H);
}
