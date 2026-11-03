// M02 Thomas attractor (one chaotic flow, drawn as silk-like filaments that never leave their attractor).
// One rule: a long trajectory of Thomas' cyclically symmetric flow is resampled at equal steps of on-screen arc length, thousands of filaments ride it at one gentle speed, and the single parameter b drifts slowly through the chaotic window so the filigree changes inside itself.
export const meta = {
  id: 'm02-clifford', title: 'Thomas attractor', T: 12, still: 0.1, start: 0.05, aspects: ['4:5', '16:9', '1:1'],
  math: 'dx/dt = sin y - b x,  dy/dt = sin z - b y,  dz/dt = sin x - b z;  b drifts between 0.1846 and 0.1878',
  label: 'Thousands of hairline filaments flowing along one Thomas strange attractor at a steady, gentle speed, while the damping parameter b drifts slowly so the scroll folds into new shapes inside itself.',
  // n: filaments (at most); epoch: seconds between epochs in live mode; fade: seconds of the overlap between neighbouring epochs
  params: { n: 2400, epoch: 5, fade: 3.5 },
};

const TAU = Math.PI * 2, RL = 240000, H = 0.1, DSN = 0.0174, SP = 100, TK = 10, ST = 3, CP = Math.cos(0.55), SPN = Math.sin(0.55); // RL raw RK4 steps; DSN resample step (in attractor radii); SP samples between neighbours; trail of TK slots, ST samples apart
const EP = new Map(), POOL = [], BUF = { n: 0, a: null, f: null, np: null };
const bOf = e => 0.1862 + 0.0010 * Math.sin(0.3 * e) + 0.0006 * Math.sin(0.17 * e + 1); // the slow path of b, inside one chaotic window (0.1846 to 0.1878; long runs show periodic windows just outside)
const K1 = [0, 0, 0], K2 = [0, 0, 0], K3 = [0, 0, 0], K4 = [0, 0, 0];
const th = (x, y, z, b, o) => { o[0] = Math.sin(y) - b * x; o[1] = Math.sin(z) - b * y; o[2] = Math.sin(x) - b * z; };
function integrate(ep, steps, out, at = 0) { // RK4; samples go into out (if any) from index `at`
  let [x, y, z] = ep.s; const h = H, b = ep.b;
  for (let i = 0; i < steps; i++) {
    th(x, y, z, b, K1); th(x + h / 2 * K1[0], y + h / 2 * K1[1], z + h / 2 * K1[2], b, K2); th(x + h / 2 * K2[0], y + h / 2 * K2[1], z + h / 2 * K2[2], b, K3); th(x + h * K3[0], y + h * K3[1], z + h * K3[2], b, K4);
    x += h / 6 * (K1[0] + 2 * K2[0] + 2 * K3[0] + K4[0]); y += h / 6 * (K1[1] + 2 * K2[1] + 2 * K3[1] + K4[1]); z += h / 6 * (K1[2] + 2 * K2[2] + 2 * K3[2] + K4[2]);
    if (out) { out[(at + i) * 3] = x; out[(at + i) * 3 + 1] = y; out[(at + i) * 3 + 2] = z; }
  }
  ep.s = [x, y, z];
}
const cells = (a, L, st = 1) => { // how many of 20^3 boxes the orbit visits: a few hundred is a limit cycle, a thousand is chaos
  const lo = [9e9, 9e9, 9e9], hi = [-9e9, -9e9, -9e9], c = new Set();
  for (let i = 0; i < L; i += st) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a[i * 3 + k]); hi[k] = Math.max(hi[k], a[i * 3 + k]); }
  for (let i = 0; i < L; i += st) c.add(((a[i * 3] - lo[0]) / (hi[0] - lo[0] + 1e-9) * 20 | 0) * 400 + ((a[i * 3 + 1] - lo[1]) / (hi[1] - lo[1] + 1e-9) * 20 | 0) * 20 + ((a[i * 3 + 2] - lo[2]) / (hi[2] - lo[2] + 1e-9) * 20 | 0));
  return c.size;
};
function epoch(g, key, b) { // a new epoch: work() builds the trajectory a slice per frame and steers b off any periodic window
  if (EP.has(key)) return EP.get(key);
  const r = g.rng('ep' + key), ep = { b, b0: b, tries: 0, s: null, stage: 0, i: 0, raw: null, res: null, M: 0, L: 0, Np: 0, c: null, R: 1, X: 1, done: false };
  ep.s = [0.1 + 0.05 * r(), 0.02 * r(), 0.02 * r()]; integrate(ep, 3000, null);
  const bf = POOL.pop() || { raw: new Float32Array(RL * 3), res: new Float32Array(RL * 3 * 2) }; ep.raw = bf.raw; ep.res = bf.res; // big arrays are recycled, so no garbage-collection pause
  EP.set(key, ep); while (EP.size > 5) { const k = EP.keys().next().value, o = EP.get(k); EP.delete(k); POOL.push({ raw: o.raw, res: o.res }); }
  return ep;
}
function work(ep, budget) { // advance the epoch by about `budget` samples: raw trajectory first, then resampling at equal projected arc length
  if (ep.done) return;
  const A = ep.raw;
  if (ep.stage === 0) {
    const k = Math.min(budget, RL - ep.i); integrate(ep, k, A, ep.i); ep.i += k; budget -= k; if (ep.i < RL) return;
    ep.stage = 0.5; return; // the heavy steps below each get a frame of their own, so no single frame stutters
  }
  if (ep.stage === 0.5) {
    if (cells(A.subarray((RL - 60000) * 3), 60000, 3) < 450 && ep.tries < 8) { // a periodic window the short test missed: nudge b a hair and rebuild this epoch
      ep.tries++; ep.b = Math.min(0.1878, Math.max(0.1846, ep.b0 + 0.0005 * ((ep.tries + 1) >> 1) * (ep.tries % 2 ? 1 : -1))); ep.s = [0.1, 0.02, 0.02]; integrate(ep, 3000, null); ep.i = 0; ep.stage = 0; return;
    }
    ep.stage = 0.7; return;
  }
  if (ep.stage === 0.7) {
    let sx = 0, sy = 0, sz = 0; for (let i = 0; i < RL; i++) { sx += A[i * 3]; sy += A[i * 3 + 1]; sz += A[i * 3 + 2]; }
    const c = [sx / RL, sy / RL, sz / RL], d = []; let X = 0; ep.c = c;
    for (let i = 0; i < RL; i += 29) d.push(Math.hypot(A[i * 3] - c[0], A[i * 3 + 1] - c[1], A[i * 3 + 2] - c[2])); d.sort((p, q) => p - q); ep.R = d[Math.floor(d.length * 0.92)];
    for (const yw of [0, 1.5708]) { d.length = 0; for (let i = 0; i < RL; i += 17) { const x = A[i * 3] - c[0], y = A[i * 3 + 1] - c[1], z = A[i * 3 + 2] - c[2], u = x * Math.cos(yw) - y * Math.sin(yw), v = x * Math.sin(yw) + y * Math.cos(yw); d.push(Math.hypot(u, v * CP - z * SPN)); } d.sort((p, q) => p - q); X = Math.max(X, d[Math.floor(d.length * 0.95)]); }
    ep.X = X * 1.08; ep.stage = 1; ep.j = 1; ep.cum = 0; ep.nxt = 0;
    ep.px = (A[0] - c[0]) / ep.X; ep.py = ((A[1] - c[1]) * CP - (A[2] - c[2]) * SPN) / ep.X; ep.res.set(A.subarray(0, 3), 0); ep.M = 1; ep.nxt = 1;
  }
  const c = ep.c, X = ep.X, cap = ep.res.length / 3 - 1, R = ep.res; let { px, py, cum, nxt, M } = ep; const end = Math.min(RL, ep.j + budget);
  for (let j = ep.j; j < end; j++) { // equal steps of arc length in the reference view (yaw 0, mean pitch), measured in attractor radii
    const x = A[j * 3], y = A[j * 3 + 1], z = A[j * 3 + 2], qx = (x - c[0]) / X, qy = ((y - c[1]) * CP - (z - c[2]) * SPN) / X, l = Math.hypot(qx - px, qy - py);
    while (nxt * DSN <= cum + l && M < cap) { const t = (nxt * DSN - cum) / l; R[M * 3] = A[j * 3 - 3] + t * (x - A[j * 3 - 3]); R[M * 3 + 1] = A[j * 3 - 2] + t * (y - A[j * 3 - 2]); R[M * 3 + 2] = A[j * 3 - 1] + t * (z - A[j * 3 - 1]); M++; nxt++; }
    cum += l; px = qx; py = qy;
  }
  Object.assign(ep, { px, py, cum, nxt, M, j: end });
  if (end >= RL) { ep.Np = Math.max(1, Math.floor(M / SP)); ep.L = ep.Np * SP; ep.done = true; }
}

const finish = ep => { while (!ep.done) work(ep, 1e9); }; // build a whole epoch now (a rebuild after a periodic window loops once more)
export function draw(ctx, { g }) {
  const P = g.params, live = g.live, q = Math.min(1, g.q ?? 1);
  // epochs: loop mode cross-fades two nearby values of b and back (closed orbit); live mode walks b along its slow path, one epoch per few seconds, two overlapping at a time
  let ea, eb, wb;
  if (!live) { ea = epoch(g, 'A', 0.185); eb = epoch(g, 'B', 0.1875); wb = 0.5 - 0.5 * Math.cos(g.theta); finish(ea); finish(eb); }
  else {
    const t = g.drift, e = Math.floor(t / P.epoch); wb = g.ease.smoother((t - e * P.epoch - (P.epoch - P.fade)) / P.fade);
    ea = epoch(g, 'e' + e, bOf(e)); finish(ea); eb = epoch(g, 'e' + (e + 1), bOf(e + 1)); if (wb > 0) finish(eb); else work(eb, 12000);
    const e3 = epoch(g, 'e' + (e + 2), bOf(e + 2)); if (eb.done) work(e3, 12000); // the next epochs are built a slice per frame, ahead of time
  }
  const W = TK + 1, stride = W * 2, N0 = P.n;
  if (BUF.n < N0) { BUF.n = N0; BUF.a = new Float32Array(N0 * stride); BUF.f = new Float32Array(N0); BUF.np = new Uint8Array(N0); }
  const { a: Bf, np } = BUF, aw = Math.min(g.bx, g.by * 0.95), F = 1500;
  // the camera only breathes: a few degrees back and forth, far slower than the filaments
  const yaw = live ? 0.06 * Math.sin(g.drift * TAU / 45) : 0.05 * Math.sin(g.theta), pit = 0.55 + (live ? 0.05 * Math.sin(g.drift * TAU / 60 + 1) : 0.04 * Math.sin(2 * g.theta + 1));
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
  const pass = (ep, w) => {
    const Ar = ep.res, c = ep.c, L = ep.L, sc = aw / ep.X, shift = SP * (live ? g.drift / g.T : g.p);
    const proj = (j, o) => { // resampled point j -> screen units, mild perspective
      j = ((j % L) + L) % L; const x = Ar[j * 3] - c[0], y = Ar[j * 3 + 1] - c[1], z = Ar[j * 3 + 2] - c[2];
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy, y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp, k = 1 / (1 - z2 / ep.R * 0.18);
      Bf[o] = x1 * k * sc; Bf[o + 1] = y2 * k * sc;
    };
    const Nn = ep.Np, n = Math.max(1, Math.round(Math.min(Nn, N0) * q)); let cnt = 0;
    for (let j = 0; j < n; j++) { // evenly spaced filaments: the picture at p = 1 is the picture at p = 0 shifted by one filament
      const i = Math.floor(j * Nn / n), u = ((i * SP + shift) % L + L) % L, i0 = Math.floor(u), fr = u - i0, f = Math.min(1, u / F, (L - u) / F);
      if (f < 0.04) continue;
      const o = cnt * stride, nk = 2 + Math.round((TK - 1) * f);
      proj(i0, o + 2); proj(i0 + 1, o + 0); // slot 1 = sample i0, slot 0 = head (lerp towards i0 + 1: the filament glides)
      Bf[o] = Bf[o + 2] + (Bf[o] - Bf[o + 2]) * fr; Bf[o + 1] = Bf[o + 3] + (Bf[o + 1] - Bf[o + 3]) * fr;
      for (let k = 2; k < nk; k++) proj(i0 - ST * (k - 1), o + k * 2);
      np[cnt] = nk; cnt++;
    }
    g.pen(ctx, 'hair', 1, g.c.ink); ctx.lineCap = 'butt';
    for (const [s0, s1, al] of [[6, TK, 0.09], [3, 6, 0.18], [0, 3, 0.36]]) { // hairlines by age: the alpha rises towards the head
      ctx.globalAlpha = al * w; ctx.beginPath();
      for (let p = 0; p < cnt; p++) {
        const o = p * stride, e = Math.min(s1, np[p] - 1); if (e <= s0) continue; ctx.moveTo(Bf[o + s0 * 2], Bf[o + s0 * 2 + 1]);
        for (let k = s0 + 1; k <= e; k++) ctx.lineTo(Bf[o + k * 2], Bf[o + k * 2 + 1]);
      }
      ctx.stroke();
    }
  };
  if (wb < 0.998) pass(ea, 1 - wb);
  if (wb > 0.002) pass(eb, wb);
}
