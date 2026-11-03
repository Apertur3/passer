// V04 Vlecht (a plait closed into a ring, the circular interlace).
// One rule: n wavy strands run once round a ring, each a sine wave in radius shifted by 1/n of a period from the next, and wherever two cross, the one climbing faster outward passes over and the other is cut either side of it.
export const meta = {
  id: 'v04-vlecht', title: 'Vlecht', nl: 'Vlecht', T: 16, still: 0.2, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'strand k: angle t, radius R + r sin(m(t + 2πk/n) + φ), n strands; over where dρ/dt is larger',
  label: 'Strands in coloured pencil plait themselves round a ring and flow along it; every crossing is cut with the nearer strand over, and the plait fades into the next one, with more strands or more waves.',
  // r: wave height over ring radius; spacing: distance between the lines of a ribbon (S);
  // gap: clear space either side of an over strand (S); seg: samples round the ring at q = 1
  params: { r: 0.3, spacing: 0.0105, gap: 0.0075, seg: 400 },
};

const TAU = 2 * Math.PI;
// the forms shown in turn: [strands n, wave number m (coprime to n)]; each stays pure and keeps flowing, the next fades in as the last fades out
const FORMS = [[3, 2], [5, 2], [5, 3], [7, 2]];
const COL = { 3: [0, 1, 2], 5: [0, 1, 2, 0, 1], 7: [0, 1, 2, 0, 1, 2, 3] }; // pencil per strand: no two neighbours alike
const SC = { n: 0, X: null, Y: null, Z: null, C: null, head: new Int32Array(16384), next: null };

export function draw(ctx, { g }) {
  const P = g.params, rr = g.rng('plait'), a0 = rr() * TAU, off = Math.floor(rr() * FORMS.length), L = FORMS.length;
  const slot = g.live ? 10 : g.T / L, u = g.live ? g.drift / slot : g.p * L, i0 = Math.floor(u), f = u - i0, w = (g.live ? 1.7 : 1.4) / slot, h0 = 1 - 1.55 * w;
  const ea = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  const aOut = f < h0 ? 1 : 1 - ea((f - h0) / w), aIn = ea((f - h0 - 0.55 * w) / w);
  const pick = j => FORMS[(off + j + (g.live ? Math.floor(j / L) : 0)) % L]; // live: every pass through the list skips one form, so the order never repeats
  // the flow: the whole pattern runs round the ring; a slow drift keeps it from ever repeating
  const flow = g.voice(1) + a0 + 1.2 * Math.sin(g.drift * 0.04 + a0), headless = typeof document === 'undefined';
  const U = Math.min(g.bx, g.by), Rm = U / (1 + P.r + 0.04), rad = Rm * P.r; // ring radius and wave height (S)
  g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath(); // faint construction: the circles the waves swing between
  for (const rc of [Rm - rad, Rm, Rm + rad]) { ctx.moveTo(rc, 0); ctx.arc(0, 0, rc, 0, TAU); }
  ctx.stroke();
  if (aOut > 0.003 || headless) form(ctx, g, P, pick(i0), aOut, flow, Rm, rad);
  if (aIn > 0.003 || headless) form(ctx, g, P, pick(i0 + 1), aIn, flow, Rm, rad);
  ctx.globalAlpha = 1;
}

// one plait, complete with its own over and under, at the given opacity
function form(ctx, g, P, [n, m], alpha, flow, Rm, rad) {
  const N = Math.max(200, Math.round(P.seg * Math.min(1, g.q ?? 1))), nl = n >= 7 ? 2 : 3, sp = P.spacing * (n >= 7 ? 0.8 : 1), lwid = g.lw('line') * 1.25;
  if (SC.n < n * N) { SC.n = n * N; SC.X = new Float32Array(n * N * 3); SC.Y = new Float32Array(n * N * 3); SC.Z = new Float32Array(n * N); SC.C = new Float32Array(n * N * 3); SC.next = new Int32Array(n * N); }
  const { X, Y, Z, C, head, next } = SC;
  const colSeq = COL[n], pal = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink, g.c.tint1] : [g.c.accent, g.c.cool, g.c.third, g.c.ink], wj = [1, 0.92, 1.07, 0.96];
  // each strand: centre and line positions, and a depth (how fast the radius is climbing: the faster climber passes over)
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU, ph = m * (t + (TAU * k) / n) + flow;
      const rho = Rm + rad * Math.sin(ph), dr = rad * m * Math.cos(ph);
      const c = Math.cos(t), s = Math.sin(t), tl = Math.hypot(dr, rho), nx = (rho * c + dr * s) / tl, ny = (rho * s - dr * c) / tl; // outward normal of the curve
      Z[k * N + i] = dr; C[(k * N + i) * 2] = rho * c; C[(k * N + i) * 2 + 1] = rho * s;
      for (let l = 0; l < nl; l++) { const o = (l - (nl - 1) / 2) * sp; X[(k * nl + l) * N + i] = rho * c + o * nx; Y[(k * nl + l) * N + i] = rho * s + o * ny; }
    }
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  if (typeof document === 'undefined') { // headless motion test: whole ribbons only
    for (let k = 0; k < n; k++) for (let l = 0; l < nl; l++) { ctx.beginPath(); ctx.moveTo(X[(k * nl + l) * N], Y[(k * nl + l) * N]); for (let i = 1; i < N; i++) ctx.lineTo(X[(k * nl + l) * N + i], Y[(k * nl + l) * N + i]); ctx.closePath(); ctx.stroke(); }
    return;
  }
  // clearance of every line point: distance to the centre line of any strand that is nearer to us here, minus half a ribbon plus the gap. Grid of centre points.
  const dcut = ((nl - 1) * sp + lwid) / 2 + P.gap + lwid / 2, ox = -0.6, cell = dcut, GW = Math.min(127, Math.ceil(1.2 / cell) + 1);
  head.fill(-1, 0, GW * GW);
  for (let q = 0; q < n * N; q++) { const gx = Math.floor((C[q * 2] - ox) / cell), gy = Math.floor((C[q * 2 + 1] - ox) / cell), h = gy * GW + gx; next[q] = head[h]; head[h] = q; }
  const clr = (x, y, z, k) => { // signed clearance (S) of a point of strand k at depth z
    const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - ox) / cell); let best = 1e9;
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
      for (let q = head[yy * GW + xx]; q >= 0; q = next[q]) {
        if (((q / N) | 0) === k || Z[q] <= z) continue;
        const dx = C[q * 2] - x, dy = C[q * 2 + 1] - y, d = dx * dx + dy * dy; if (d < best) best = d;
      }
    }
    return Math.sqrt(best) - dcut;
  };
  ctx.globalAlpha = 0.94 * alpha;
  for (let ci = 0; ci < pal.length; ci++) {
    ctx.strokeStyle = pal[ci]; ctx.lineWidth = lwid * wj[ci]; ctx.beginPath();
    for (let k = 0; k < n; k++) {
      if (colSeq[k] !== ci) continue;
      for (let l = 0; l < nl; l++) {
        const o = (k * nl + l) * N, cl = (i) => clr(X[o + i], Y[o + i], Z[k * N + i], k); let start = -1;
        for (let i = 0; i < N; i++) if (cl(i) <= 0) { start = i; break; }
        if (start < 0) { ctx.moveTo(X[o], Y[o]); for (let i = 1; i < N; i++) ctx.lineTo(X[o + i], Y[o + i]); ctx.closePath(); continue; }
        let prev = start, cprev = cl(start), vis = false;
        for (let s = 1; s <= N; s++) {
          const i = (start + s) % N, ccur = cl(i);
          if (!vis && ccur > 0) { const t = -cprev / (ccur - cprev); ctx.moveTo(X[o + prev] + t * (X[o + i] - X[o + prev]), Y[o + prev] + t * (Y[o + i] - Y[o + prev])); ctx.lineTo(X[o + i], Y[o + i]); vis = true; }
          else if (vis && ccur > 0) ctx.lineTo(X[o + i], Y[o + i]);
          else if (vis) { const t = cprev / (cprev - ccur); ctx.lineTo(X[o + prev] + t * (X[o + i] - X[o + prev]), Y[o + prev] + t * (Y[o + i] - Y[o + prev])); vis = false; }
          prev = i; cprev = ccur;
        }
      }
    }
    ctx.stroke();
  }
}
