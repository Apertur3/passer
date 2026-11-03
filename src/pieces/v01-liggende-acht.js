// V01 Liggende acht (the lying eight and its metamorphosis, drawn as a three-pencil ribbon).
// One rule: a closed Lissajous curve whose ratio a:b walks 1:1, 1:2, 2:3, 3:4 and back, blended in its Fourier description so it stays one closed line, drawn as a ribbon whose strands go over and under alternately at every crossing.
export const meta = {
  id: 'v01-liggende-acht', pencils: true, title: 'Liggende acht', nl: 'Liggende acht', T: 16, still: 0.5, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'x = sin(a t + phi), y = sin(b t), a:b = 1:1, 1:2, 2:3, 3:4; neighbours blended coefficient by coefficient so the curve stays closed; ribbon = 3 copies offset by d along the normal, over/under alternating at the 2ab-a-b crossings',
  label: 'The lying eight opens into a double loop, then a triple-loop knot and back: one closed Lissajous line drawn as a ribbon of three pencils that passes over and under itself at every crossing.',
  // d: spacing of the ribbon lines (units of S); seg: points on the closed curve at q = 1; cons: faint construction on or off
  params: { d: 0.0135, seg: 440, cons: 1 },
};

const TAU = 2 * Math.PI;
// States: a, b, phase, y amplitude. The cycle walks through them and back through the same forms.
const ST = [[1, 1, Math.PI / 2, 0.55], [1, 2, 0, 0.64], [2, 3, 1.2, 0.8], [3, 4, 0.9, 0.88]], SEQ = [[1, 2, 3, 2], [0, 1, 2, 3, 2, 1]]; // loop mode: the lying eight, 2:3, 3:4 and back; live mode also opens the ellipse
// Alignment of each state's curve parameter to the previous one: [shift, direction, flip x, flip y]. Found offline by maximising the slowest point speed
// along the blend (no pinch), with s = 0 on a lobe tip of every state, where no crossing can be, so the over/under count starts at a fixed place.
const AL = [[0, 1, 1, 1], [1.5708, -1, 1, -1], [0.1854, -1, -1, -1], [1.2708, -1, -1, -1]];

const SCR = { M: 0 };
let PX = 0, PY = 0; // scratch result of ribbon's point lookup
const alloc = M => { // scratch buffers, grown only, never read across frames
  if (SCR.M >= M) return SCR; SCR.M = M;
  for (const k of ['X', 'Y', 'NX', 'NY', 'DE', 'DS']) SCR[k] = new Float64Array(M);
  SCR.head = new Int32Array(96 * 96); SCR.es = new Int32Array(M * 6); SCR.en = new Int32Array(M * 6);
  SCR.vp = new Float64Array(160); SCR.vc = new Int32Array(160); SCR.vf = new Uint8Array(160);
  for (const k of ['cutC', 'cutH', 'cutS', 'IA', 'IB']) SCR[k] = new Float64Array(80);
  SCR.cx = new Float64Array(80); SCR.cy = new Float64Array(80); SCR.cs = new Float64Array(80); SCR.cc = new Float64Array(80);
  return SCR;
};

// Self-crossings of the closed polyline (cs, cc: signed sin and cos of the angle between the two passes) by a grid hash. Fills S.cx (param on first pass), S.cy (param on second), S.cs (signed sin of the angle), S.cc (cos); returns the count.
function crossings(S, M, cell) {
  const { X, Y, head, es, en } = S; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < M; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
  const gw = Math.min(95, Math.ceil((x1 - x0) / cell) + 1), gh = Math.min(95, Math.ceil((y1 - y0) / cell) + 1), cl = (v, o, n) => Math.min(n - 1, Math.floor((v - o) / cell));
  head.fill(-1, 0, 96 * 96); let ne = 0;
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % M, ax = cl(Math.min(X[i], X[j]), x0, gw), bx = cl(Math.max(X[i], X[j]), x0, gw), ay = cl(Math.min(Y[i], Y[j]), y0, gh), by = cl(Math.max(Y[i], Y[j]), y0, gh);
    for (let cy = ay; cy <= by; cy++) for (let cx = ax; cx <= bx; cx++) { if (ne >= es.length) break; es[ne] = i; en[ne] = head[cy * 96 + cx]; head[cy * 96 + cx] = ne++; }
  }
  let K = 0;
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) for (let p = head[cy * 96 + cx]; p >= 0; p = en[p]) for (let q = en[p]; q >= 0; q = en[q]) {
    const a = Math.min(es[p], es[q]), b = Math.max(es[p], es[q]); if (b - a < 2 || (a === 0 && b === M - 1)) continue;
    const a1 = (a + 1) % M, b1 = (b + 1) % M, rx = X[a1] - X[a], ry = Y[a1] - Y[a], sx = X[b1] - X[b], sy = Y[b1] - Y[b], den = rx * sy - ry * sx; if (Math.abs(den) < 1e-14) continue;
    const qx = X[b] - X[a], qy = Y[b] - Y[a], t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den; if (t < 0 || t >= 1 || u < 0 || u >= 1) continue;
    if (cl(X[a] + t * rx, x0, gw) !== cx || cl(Y[a] + t * ry, y0, gh) !== cy || K >= 78) continue;
    const l = Math.hypot(rx, ry) * Math.hypot(sx, sy); S.cx[K] = a + t; S.cy[K] = b + u; S.cs[K] = den / l; S.cc[K] = (rx * sx + ry * sy) / l; K++;
  }
  return K;
}

export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('lissa'), q = Math.min(1, g.q ?? 1), M = Math.max(220, Math.round(P.seg * Math.min(1, Math.max(0.6, g.S / 1000)) * (0.7 + 0.3 * q))), S = alloc(M), { X, Y, NX, NY, DE, DS } = S;
  const v = g.voice, sd = r() * TAU, sg = r() < 0.5 ? 1 : -1;
  // where we are on the cycle of forms: four passes per loop (live: three per T of the unbounded clock, plus a slow warp so the passes differ and the long cycle never repeats in step with the wobble)
  const sq = SEQ[+g.live], nq = sq.length, pos = (((g.live ? g.drift / g.T * 3 + 0.3 * Math.sin(v(3) + 1 + g.drift * 0.02) : g.p * 4) % nq) + nq) % nq, i0 = Math.floor(pos), fr = pos - i0;
  const j0 = sq[i0], j1 = sq[(i0 + 1) % nq], fx = fr - Math.sin(TAU * fr) / (2 * TAU), fy = fx, // tempo curve: the pass is slowest at each form (half speed), quickest between them
    wob0 = 0.14 * Math.sin(v(2) + sd + 1.7 * i0), wob1 = 0.14 * Math.sin(v(2) + sd + 1.7 * (i0 + 1));
  const ay = (1 - fy) * ST[j0][3] + fy * ST[j1][3], sx = Math.min(g.bx * 0.93, g.by * 0.93 / ay, g.by * 2.1), ky = Math.min(1.25, g.by * 0.92 / (sx * ay)) * (1 + 0.04 * Math.sin(v(4) + g.drift * 0.03)); // portrait pages stretch the figure a little taller
  const A0 = AL[j0], A1 = AL[j1], a0 = ST[j0], a1 = ST[j1];
  for (let i = 0; i < M; i++) {
    const s = sg * TAU * i / M, u0 = A0[1] * s + A0[0], u1 = A1[1] * s + A1[0];
    X[i] = sx * ((1 - fx) * A0[2] * Math.sin(a0[0] * u0 + a0[2] + wob0) + fx * A1[2] * Math.sin(a1[0] * u1 + a1[2] + wob1));
    Y[i] = sx * ky * ((1 - fy) * A0[3] * a0[3] * Math.sin(a0[1] * u0) + fy * A1[3] * a1[3] * Math.sin(a1[1] * u1));
  }
  const d0 = P.d * (0.8 + 0.4 * Math.sin(v(5) + 1 + g.drift * 0.05)), lw = g.lw('line') * 1.3, N = 3;
  for (let i = 0; i < M; i++) { // tangent, normal, ribbon half spread (pinched where the curve bends tighter than the offset)
    const p = (i + M - 1) % M, n = (i + 1) % M, tx = X[n] - X[p], ty = Y[n] - Y[p], tl = Math.hypot(tx, ty) || 1, ax = X[n] - 2 * X[i] + X[p], ay2 = Y[n] - 2 * Y[i] + Y[p];
    NX[i] = -ty / tl; NY[i] = tx / tl; DS[i] = Math.hypot(X[n] - X[i], Y[n] - Y[i]) || 1e-6;
    const kap = 4 * Math.abs(tx * ay2 - ty * ax) / (tl * tl * tl); // curvature from central differences
    DE[i] = d0 / Math.sqrt(Math.sqrt(1 + Math.pow(d0 * kap / 0.7, 4)));
  }
  // over/under: visits along the curve alternate over, under, over ...; the under pass is cut either side of the over ribbon
  const K = crossings(S, M, 0.05), V = 2 * K; let nc = 0;
  for (let k = 0; k < K; k++) { S.vp[2 * k] = S.cx[k]; S.vc[2 * k] = k; S.vf[2 * k] = 0; S.vp[2 * k + 1] = S.cy[k]; S.vc[2 * k + 1] = k; S.vf[2 * k + 1] = 1; }
  for (let i = 1; i < V; i++) { const p = S.vp[i], c = S.vc[i], f = S.vf[i]; let j = i - 1; while (j >= 0 && S.vp[j] > p) { S.vp[j + 1] = S.vp[j]; S.vc[j + 1] = S.vc[j]; S.vf[j + 1] = S.vf[j]; j--; } S.vp[j + 1] = p; S.vc[j + 1] = c; S.vf[j + 1] = f; }
  // the count of over/under visits starts at s = 0; when a crossing passes s = 0 the whole weave would swap, so the gaps close for that moment and reopen swapped
  let near = M; for (let i = 0; i < V; i++) near = Math.min(near, S.vp[i], M - S.vp[i]);
  const open = (u => u * u * (3 - 2 * u))(Math.min(1, near / 9));
  if (open > 0.02) for (let i = 1; i < V; i += 2) { // odd visits are the under passes; each line of the under ribbon is cut where it meets the over ribbon (band half width h plus a gap)
    const c = S.vc[i], ii = Math.floor(S.vp[i]) % M, sn = S.vf[i] ? S.cs[c] : -S.cs[c], sU = (sn < 0 ? -1 : 1) * Math.max(0.2, Math.abs(sn)), h = DE[ii] + lw * 2.2;
    S.cutC[nc] = S.vp[i]; S.cutH[nc] = open * h / Math.abs(sU) / DS[ii]; S.cutS[nc++] = -DE[ii] * S.cc[c] / sU / DS[ii];
  }
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink] : [g.c.accent, g.c.cool, g.c.third];
  if (P.cons) { // faint construction: the bounding box, the axes, the circle the figure turns in
    const hx = sx, hy = sx * ky * ay; ctx.lineCap = 'butt'; g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath();
    ctx.rect(-hx, -hy, 2 * hx, 2 * hy); ctx.moveTo(-hx * 1.06, 0); ctx.lineTo(hx * 1.06, 0); ctx.moveTo(0, -hy * 1.06); ctx.lineTo(0, hy * 1.06); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, hx, hy, 0, 0, TAU); ctx.stroke();
  }
  ribbon(ctx, S, M, N, cols, lw, nc, r);
}

// Strokes the N ribbon lines of the closed centreline, one path per line, leaving the cut intervals (index units) empty. Each line has its own cuts: they slant like the edge of the over ribbon.
function ribbon(ctx, S, M, N, cols, lw, nc, r) {
  const { X, Y, NX, NY, DE, cutC, cutH, cutS, IA, IB } = S; ctx.lineCap = 'butt';
  const at = (x, o) => { const i = Math.floor(x), f = x - i, a = ((i % M) + M) % M, b = (a + 1) % M, dA = o * DE[a], dB = o * DE[b]; PX = X[a] + NX[a] * dA + (X[b] + NX[b] * dB - X[a] - NX[a] * dA) * f; PY = Y[a] + NY[a] * dA + (Y[b] + NY[b] * dB - Y[a] - NY[a] * dA) * f; };
  for (let k = 0; k < N; k++) {
    const o = k - (N - 1) / 2; let n = 0;
    for (let j = 0; j < nc; j++) { const h = cutH[j], a = (((cutC[j] + o * cutS[j] - h) % M) + M) % M; let p = n++; while (p > 0 && IA[p - 1] > a) { IA[p] = IA[p - 1]; IB[p] = IB[p - 1]; p--; } IA[p] = a; IB[p] = a + 2 * h; }
    let w = 0; for (let j = 0; j < n; j++) { if (w && IA[j] <= IB[w - 1]) IB[w - 1] = Math.max(IB[w - 1], IB[j]); else { IA[w] = IA[j]; IB[w] = IB[j]; w++; } } n = w; // merge overlaps
    while (n > 1 && IB[n - 1] - M >= IA[0]) { IA[0] = IA[n - 1] - M; IB[0] = Math.max(IB[0], IB[n - 1] - M); n--; } // a cut that wraps past M swallows the first
    ctx.strokeStyle = cols[k]; ctx.lineWidth = lw * (0.9 + 0.2 * r()); ctx.globalAlpha = 0.82 + 0.18 * r(); ctx.beginPath();
    if (!n) { for (let i = 0; i < M; i++) { const dd = o * DE[i]; i ? ctx.lineTo(X[i] + NX[i] * dd, Y[i] + NY[i] * dd) : ctx.moveTo(X[0] + NX[0] * dd, Y[0] + NY[0] * dd); } ctx.closePath(); }
    else for (let m = 0; m < n; m++) { // run from the end of cut m to the start of cut m+1
      const e = IB[m], s = m + 1 < n ? IA[m + 1] : IA[0] + M; if (s <= e) continue;
      at(e, o); ctx.moveTo(PX, PY); for (let i = Math.floor(e) + 1; i < s; i++) { at(i, o); ctx.lineTo(PX, PY); } at(s, o); ctx.lineTo(PX, PY);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.globalAlpha = 1;
}
