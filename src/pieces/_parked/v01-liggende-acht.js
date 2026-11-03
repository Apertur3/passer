// V01 Liggende acht (the lying eight as the side view of a space curve, drawn as a three-pencil ribbon).
// One rule: the closed space curve (cos t, sin t, A sin kt) seen from above is always the same circle, so k can change unseen; tilted toward the side the circle opens into an ellipse and then a lying eight (k = 2), a three-lobed chain (k = 3), and so on, with true depth deciding what passes over and under.
export const meta = {
  id: 'v01-liggende-acht', title: 'Liggende acht', nl: 'Liggende acht', T: 16, still: 0.17, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'C_k(t) = (cos t, sin t, A sin kt), k = 2, 3, 4: seen from above a circle for every k, from the side the Lissajous curve x = cos t, y = A sin kt (k = 2: the lying eight); tilt about the x axis by 0 to 80 degrees, nearer strands pass over',
  label: 'A circle tips over and opens into a lying eight, then closes to a circle again and reopens as a longer chain of loops: one closed space curve drawn as a ribbon of three pencils, with every crossing cut by depth.',
  // d: spacing of the ribbon lines (S); gap: cut either side of an over strand (S); seg: samples at q = 1; cons: faint construction on or off
  params: { d: 0.0125, gap: 0.0045, seg: 520, cons: 1 },
};

const TAU = 2 * Math.PI, KS = [[2, 3, 4], [2, 3, 2, 4, 3, 5]]; // loop mode / live mode sequence of k
const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
// scratch, only grown, never read across frames
const SC = { n: 0, head: new Int32Array(4096) };

export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('eight'), v = g.voice, sd = r() * TAU;
  const N = Math.max(300, Math.round(P.seg * Math.min(1, g.q ?? 1)));
  if (SC.n < N) { SC.n = N; for (const k of ['X', 'Y', 'Z', 'W']) SC[k] = new Float32Array(N * 3); SC.next = new Int32Array(N); SC.W = new Float32Array(N); SC.Z = new Float32Array(N); }
  const { X, Y, Z, W, head, next } = SC;
  // which curve and how far it is tipped over: k changes only when the tilt is zero (the circle seen from above)
  const ks = KS[+g.live], c = g.live ? g.drift / g.T * 2.5 : g.p * 3, ci = Math.floor(c), u = c - ci, k = ks[((ci % ks.length) + ks.length) % ks.length];
  const env = sm(u / 0.2) * (1 - sm((u - 0.8) / 0.2)), phi = env * (1.38 + 0.06 * Math.sin(v(3) + sd));
  const A = 0.62 + 0.08 * Math.sin(v(4) + 1 + g.drift * 0.03), al = 0.3 * Math.sin(v(3) + sd) + 0.12 * Math.sin(g.drift * 0.05) * env; // al: slow turn about the vertical axis of the figure
  const sc = Math.min(g.bx, g.by) * 0.94, cp = Math.cos(phi), sp = Math.sin(phi), ca = Math.cos(al), sa = Math.sin(al), lw = g.lw('line') * 1.3, d0 = P.d * (0.85 + 0.25 * Math.sin(v(5) + g.drift * 0.04));
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU, x0 = Math.cos(t), y0 = Math.sin(t), z0 = A * Math.sin(k * t), x1 = x0 * ca - y0 * sa, y1 = x0 * sa + y0 * ca;
    X[N + i] = x1 * sc; Y[N + i] = (y1 * cp - z0 * sp) * sc; Z[i] = (y1 * sp + z0 * cp) * sc;
  }
  // ribbon: three lines along the screen normal, pinched where the curve bends tighter than the offset
  for (let i = 0; i < N; i++) {
    const a = N + (i + N - 1) % N, b = N + (i + 1) % N, j = N + i, tx = X[b] - X[a], ty = Y[b] - Y[a], tl = Math.hypot(tx, ty) || 1e-9, ax = X[b] - 2 * X[j] + X[a], ay = Y[b] - 2 * Y[j] + Y[a];
    const kap = 4 * Math.abs(tx * ay - ty * ax) / (tl * tl * tl), de = d0 / Math.sqrt(Math.sqrt(1 + Math.pow(d0 * kap / 0.7, 4))), nx = -ty / tl * de, ny = tx / tl * de;
    W[i] = de; X[i] = X[j] - nx; Y[i] = Y[j] - ny; X[2 * N + i] = X[j] + nx; Y[2 * N + i] = Y[j] + ny;
  }
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink] : [g.c.accent, g.c.cool, g.c.third], wj = [1, 0.92, 1.06];
  if (P.cons) { // the circle the curve winds on (an ellipse once tipped) and the axis it tips about
    g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath();
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU; i ? ctx.lineTo(Math.cos(a) * sc, Math.sin(a) * cp * sc) : ctx.moveTo(sc, 0); }
    ctx.moveTo(-sc * 1.06, 0); ctx.lineTo(sc * 1.06, 0); ctx.stroke();
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  const CXa = X.subarray(N, 2 * N), CYa = Y.subarray(N, 2 * N);
  if (typeof document === 'undefined') { // headless motion test: whole ribbons only (cuts change the point count between frames)
    for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(X[l * N], Y[l * N]); for (let i = 1; i < N; i++) ctx.lineTo(X[l * N + i], Y[l * N + i]); ctx.closePath(); ctx.stroke(); }
    return;
  }
  // Over and under: clearance of a ribbon point = distance to the centre line of any nearer part of the curve (not a neighbour along it) minus half a ribbon and the gap; <= 0 is cut
  const cut = d0 + lw + P.gap, ox = -0.6, cell = cut, gl = P.gap + lw, GW = Math.min(63, Math.ceil(1.2 / cell) + 1);
  let len = 0; for (let i = 0; i < N; i++) len += Math.hypot(CXa[(i + 1) % N] - CXa[i], CYa[(i + 1) % N] - CYa[i]);
  const win = Math.ceil(3 * cut / (len / N)) + 2, cl1 = z => Math.min(GW - 1, Math.max(0, z));
  head.fill(-1, 0, GW * GW);
  for (let q = 0; q < N; q++) { const hh = cl1(Math.floor((CYa[q] - ox) / cell)) * GW + cl1(Math.floor((CXa[q] - ox) / cell)); next[q] = head[hh]; head[hh] = q; }
  const clr = (x, y, z, i) => {
    const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - ox) / cell); let best = 1e9;
    for (let yy = Math.max(0, gy - 1); yy <= Math.min(GW - 1, gy + 1); yy++) for (let xx = Math.max(0, gx - 1); xx <= Math.min(GW - 1, gx + 1); xx++) {
      for (let q = head[yy * GW + xx]; q >= 0; q = next[q]) {
        let dq = q - i; dq = dq < 0 ? -dq : dq; if (dq > N - dq) dq = N - dq;
        if (dq <= win || Z[q] <= z) continue;
        const dx = CXa[q] - x, dy = CYa[q] - y, d = Math.sqrt(dx * dx + dy * dy) - W[q]; if (d < best) best = d;
      }
    }
    return best - gl;
  };
  ctx.globalAlpha = 0.94;
  for (let l = 0; l < 3; l++) {
    ctx.strokeStyle = cols[l]; ctx.lineWidth = lw * wj[l]; ctx.beginPath();
    const o = l * N, cl = i => clr(X[o + i], Y[o + i], Z[i], i); let start = -1;
    for (let i = 0; i < N; i++) if (cl(i) <= 0) { start = i; break; }
    if (start < 0) { ctx.moveTo(X[o], Y[o]); for (let i = 1; i < N; i++) ctx.lineTo(X[o + i], Y[o + i]); ctx.closePath(); }
    else {
      let prev = start, cprev = cl(start), vis = false;
      for (let st = 1; st <= N; st++) {
        const i = (start + st) % N, ccur = cl(i);
        if (!vis && ccur > 0) { const t = -cprev / (ccur - cprev); ctx.moveTo(X[o + prev] + t * (X[o + i] - X[o + prev]), Y[o + prev] + t * (Y[o + i] - Y[o + prev])); ctx.lineTo(X[o + i], Y[o + i]); vis = true; }
        else if (vis && ccur > 0) ctx.lineTo(X[o + i], Y[o + i]);
        else if (vis) { const t = cprev / (cprev - ccur); ctx.lineTo(X[o + prev] + t * (X[o + i] - X[o + prev]), Y[o + prev] + t * (Y[o + i] - Y[o + prev])); vis = false; }
        prev = i; cprev = ccur;
      }
    }
    ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.globalAlpha = 1;
}
