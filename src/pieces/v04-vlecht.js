// V04 Vlecht (a plait closed into a ring, the circular interlace).
// One rule: n wavy strands run once round a ring, each a sine wave in radius shifted by 1/n of a period from the next, and wherever two cross, the one climbing faster outward passes over and the other is cut either side of it.
export const meta = {
  id: 'v04-vlecht', pencils: true, title: 'Vlecht', nl: 'Vlecht', T: 16, still: 0.2, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'strand k: angle t, radius R + r sin(m(t + 2πk/n) + φ), n strands; over where dρ/dt is larger',
  label: 'Strands in coloured pencil plait themselves round a ring; the waves drift between two numbers of humps, so the weave keeps changing its pattern while every crossing is cut with the nearer strand over.',
  // n: strands (3 to 7; 0 = chosen from the seed); r: wave height over ring radius; spacing: distance between the lines of a ribbon (S);
  // gap: clear space either side of an over strand (S); seg: samples round the ring at q = 1
  params: { n: 0, r: 0.3, spacing: 0.0105, gap: 0.0075, seg: 400 },
};

const TAU = 2 * Math.PI;
// [strands, wave numbers m1 and m2 (coprime to n) the weave drifts between]
const SETS = [[3, 2, 4], [4, 3, 5], [5, 2, 3], [5, 2, 3], [7, 2, 3]];
const COL = { 3: [0, 1, 2], 4: [0, 1, 2, 1], 5: [0, 1, 2, 0, 1], 6: [0, 1, 2, 0, 1, 2], 7: [0, 1, 2, 0, 1, 2, 3] }; // pencil per strand: no two neighbours alike
const SC = { n: 0, X: null, Y: null, Z: null, C: null, head: new Int32Array(4096), next: null };

export function draw(ctx, { g }) {
  const P = g.params, rr = g.rng('plait'), pick = SETS[Math.floor(rr() * SETS.length)], a0 = rr() * TAU;
  const n = P.n ? Math.round(P.n) : pick[0], m1 = P.n ? 2 : pick[1], m2 = P.n ? 3 : pick[2];
  const N = Math.max(200, Math.round(P.seg * Math.min(1, g.q ?? 1))), nl = n >= 7 ? 2 : 3, sp = P.spacing * (n >= 7 ? 0.8 : 1), lwid = g.lw('line') * 1.25;
  if (SC.n < n * N) { SC.n = n * N; SC.X = new Float32Array(n * N * 3); SC.Y = new Float32Array(n * N * 3); SC.Z = new Float32Array(n * N); SC.C = new Float32Array(n * N * 3); SC.next = new Int32Array(n * N); }
  const { X, Y, Z, C, head, next } = SC;
  const U = Math.min(g.bx, g.by), Rr = P.r, Rm = U / (1 + Rr + 0.04), rad = Rm * Rr; // ring radius and wave height (S)
  // the flow: the whole pattern runs round the ring; the wave number slides between m1 and m2 and back; a slow drift keeps both from ever repeating
  const flow = g.voice(1) + a0 + 1.2 * Math.sin(g.drift * 0.04 + a0), mix = 0.5 - 0.5 * Math.cos(g.voice(2) + 0.7 * Math.sin(g.drift * 0.05)), wa = 1 - mix, wb = mix;
  const colSeq = COL[n], pal = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink, g.c.tint1] : [g.c.accent, g.c.cool, g.c.third, g.c.ink], wj = [1, 0.92, 1.07, 0.96];
  // each strand: centre and line positions, and a depth (how fast the radius is climbing: the faster climber passes over)
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU, ph1 = m1 * (t + (TAU * k) / n) + flow, ph2 = m2 * (t + (TAU * k) / n) + flow;
      const rho = Rm + rad * (wa * Math.sin(ph1) + wb * Math.sin(ph2)), dr = rad * (wa * m1 * Math.cos(ph1) + wb * m2 * Math.cos(ph2));
      const c = Math.cos(t), s = Math.sin(t), tl = Math.hypot(dr, rho), nx = (rho * c + dr * s) / tl, ny = (rho * s - dr * c) / tl; // outward normal of the curve
      Z[k * N + i] = dr; C[(k * N + i) * 2] = rho * c; C[(k * N + i) * 2 + 1] = rho * s;
      for (let l = 0; l < nl; l++) { const o = (l - (nl - 1) / 2) * sp; X[(k * nl + l) * N + i] = rho * c + o * nx; Y[(k * nl + l) * N + i] = rho * s + o * ny; }
    }
  }
  // faint construction: the circles the waves swing between
  g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath();
  for (const rc of [Rm - rad, Rm, Rm + rad]) { ctx.moveTo(rc, 0); ctx.arc(0, 0, rc, 0, TAU); }
  ctx.stroke();
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  if (typeof document === 'undefined') { // headless motion test: whole ribbons only (the cuts change the point count between frames)
    for (let k = 0; k < n; k++) for (let l = 0; l < nl; l++) { ctx.beginPath(); ctx.moveTo(X[(k * nl + l) * N], Y[(k * nl + l) * N]); for (let i = 1; i < N; i++) ctx.lineTo(X[(k * nl + l) * N + i], Y[(k * nl + l) * N + i]); ctx.closePath(); ctx.stroke(); }
    return;
  }
  // clearance of every line point: distance to the centre line of any strand that is nearer to us here, minus half a ribbon plus the gap. Grid of centre points.
  const dcut = ((nl - 1) * sp + lwid) / 2 + P.gap + lwid / 2, ox = -0.6, cell = dcut, GW = Math.min(63, Math.ceil(1.2 / cell) + 1);
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
  ctx.globalAlpha = 0.94;
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
  ctx.globalAlpha = 1;
}
