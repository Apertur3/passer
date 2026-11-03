// M02 Strange attractors (continuous flows, drawn as a gliding swarm that melts from one filigree into the next).
// One rule: a long trajectory of a chaotic flow is computed once per epoch, thousands of particles ride it at evenly spaced places with a short comet trail, and the parameters (and, every other epoch, the attractor itself) change while two epochs cross-fade.
export const meta = {
  id: 'm02-clifford', title: 'Strange attractors', T: 12, still: 0.1, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  math: "Aizawa: dx/dt = (z - b) x - d y, dy/dt = d x + (z - b) y, dz/dt = c + a z - z^3/3 - (x^2 + y^2)(1 + e z) + f z x^3;  Thomas: dx/dt = sin y - b x (cyclic);  Halvorsen: dx/dt = -a x - 4 y - 4 z - y^2 (cyclic)",
  label: 'A swarm of particles gliding along a strange attractor, each with a short comet trail; the flow slowly changes its parameters and every few epochs the swarm melts into a different attractor.',
  // n: particles; trail: samples behind each particle; epoch: seconds per epoch in live mode; fade: seconds of the cross-fade
  params: { n: 3200, trail: 3, epoch: 20, fade: 4.5 },
};

const TAU = Math.PI * 2, HS = [0.02, 0.1, 0.015], STEP_REL = 2.57; // RK4 step per flow; STEP_REL: distance (in attractor radii) a particle covers per loop
const EP = new Map(), BUF = { n: 0, a: null, f: null, np: null };
const flow = (ty, p, x, y, z, o) => {
  if (ty === 0) { o[0] = (z - p[1]) * x - p[3] * y; o[1] = p[3] * x + (z - p[1]) * y; o[2] = p[2] + p[0] * z - z * z * z / 3 - (x * x + y * y) * (1 + p[4] * z) + p[5] * z * x * x * x; }
  else if (ty === 1) { o[0] = Math.sin(y) - p[0] * x; o[1] = Math.sin(z) - p[0] * y; o[2] = Math.sin(x) - p[0] * z; }
  else { o[0] = -p[0] * x - 4 * y - 4 * z - y * y; o[1] = -p[0] * y - 4 * z - 4 * x - z * z; o[2] = -p[0] * z - 4 * x - 4 * y - x * x; }
};
const typeOf = e => Math.floor(e / 2) % 3; // Aizawa, Thomas, Halvorsen, Aizawa ...; two epochs per attractor, with different parameters
function params(ty, e) { // a few percent of drift along a smooth path
  const s = (k, ph) => Math.sin(e * k + ph);
  if (ty === 0) return [0.95 + 0.02 * s(1.3, 0), 0.7 + 0.015 * s(0.9, 1), 0.6 + 0.015 * s(1.7, 2), 3.5 + 0.1 * s(0.7, 0.5), 0.25 + 0.012 * s(1.1, 3), 0.1 + 0.015 * s(0.8, 0.5)];
  return ty === 1 ? [0.19 + 0.01 * s(1.1, 0)] : [1.4 + 0.06 * s(1.3, 1)];
}
const K1 = [0, 0, 0], K2 = [0, 0, 0], K3 = [0, 0, 0], K4 = [0, 0, 0];
function integrate(ep, steps, out, at = 0) { // RK4; writes samples into out (if any) starting at sample `at`
  let [x, y, z] = ep.s; const h = ep.h, p = ep.p, ty = ep.ty;
  for (let i = 0; i < steps; i++) {
    flow(ty, p, x, y, z, K1); flow(ty, p, x + h / 2 * K1[0], y + h / 2 * K1[1], z + h / 2 * K1[2], K2);
    flow(ty, p, x + h / 2 * K2[0], y + h / 2 * K2[1], z + h / 2 * K2[2], K3); flow(ty, p, x + h * K3[0], y + h * K3[1], z + h * K3[2], K4);
    x += h / 6 * (K1[0] + 2 * K2[0] + 2 * K3[0] + K4[0]); y += h / 6 * (K1[1] + 2 * K2[1] + 2 * K3[1] + K4[1]); z += h / 6 * (K1[2] + 2 * K2[2] + 2 * K3[2] + K4[2]);
    if (out) { out[(at + i) * 3] = x; out[(at + i) * 3 + 1] = y; out[(at + i) * 3 + 2] = z; }
  }
  ep.s = [x, y, z];
}
function stats(a, L) {
  let sx = 0, sy = 0, sz = 0; for (let i = 0; i < L; i++) { sx += a[i * 3]; sy += a[i * 3 + 1]; sz += a[i * 3 + 2]; }
  const c = [sx / L, sy / L, sz / L], d = []; for (let i = 0; i < L; i += 7) d.push(Math.hypot(a[i * 3] - c[0], a[i * 3 + 1] - c[1], a[i * 3 + 2] - c[2]));
  d.sort((p, q) => p - q); return { c, R: d[Math.floor(d.length * 0.92)] * 1.1 };
}
const cells = (a, L) => { // how many of 20^3 boxes the trajectory visits: a handful means a limit cycle, a thousand means a strange attractor
  const lo = [9e9, 9e9, 9e9], hi = [-9e9, -9e9, -9e9], c = new Set();
  for (let i = 0; i < L; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a[i * 3 + k]); hi[k] = Math.max(hi[k], a[i * 3 + k]); }
  for (let i = 0; i < L; i++) c.add(((a[i * 3] - lo[0]) / (hi[0] - lo[0] + 1e-9) * 20 | 0) * 400 + ((a[i * 3 + 1] - lo[1]) / (hi[1] - lo[1] + 1e-9) * 20 | 0) * 20 + ((a[i * 3 + 2] - lo[2]) / (hi[2] - lo[2] + 1e-9) * 20 | 0));
  return c.size;
};
function epoch(g, e, n) { // start an epoch: find parameters that are really chaotic, measure the speed, allocate; the trajectory itself is filled by fill()
  const key = g.seed + ':' + e + ':' + n; if (EP.has(key)) return EP.get(key);
  const ty = typeOf(e), r = g.rng('ep' + e), ep = { ty, h: HS[ty], i: 0, L: 0, A: null, done: false, c: [0, 0, 0], R: 1, X: 1, SP: 45 }, pil = new Float32Array(6000 * 3);
  for (let tr = 0; tr < 14; tr++) { // Aizawa has narrow periodic windows: step the parameter path on until the orbit fills space
    ep.p = params(ty, e + 0.37 * tr);
    ep.s = ty === 2 ? [-1.48 + 0.05 * r(), -1.51 + 0.05 * r(), 2.04 + 0.05 * r()] : [0.1 + 0.05 * r(), 0.02 * r(), 0.02 * r()];
    integrate(ep, 3000, null); integrate(ep, 6000, pil);
    if (cells(pil, 6000) > [900, 380, 600][ty]) break;
  }
  const m = stats(pil, 1500); let st = 0; for (let i = 1; i < 1500; i++) st += Math.hypot(pil[i * 3] - pil[i * 3 - 3], pil[i * 3 + 1] - pil[i * 3 - 2], pil[i * 3 + 2] - pil[i * 3 - 1]);
  ep.SP = Math.max(15, Math.min(120, Math.round(STEP_REL / (st / 1499 / m.R)))); ep.L = n * ep.SP; ep.A = new Float32Array(ep.L * 3);
  EP.set(key, ep); while (EP.size > 5) EP.delete(EP.keys().next().value);
  return ep;
}
function fill(ep, budget) { // advance the trajectory by `budget` samples; when full, measure its centre and radius
  if (ep.done) return;
  const k = Math.min(budget, ep.L - ep.i); integrate(ep, k, ep.A, ep.i); ep.i += k;
  if (ep.i >= ep.L) { const m = stats(ep.A, ep.L); ep.c = m.c; ep.R = m.R; ep.done = true;
    // footprint: the 95th percentile of the projected radius, over two views, so every attractor fills the sheet alike
    const d = [], cp = Math.cos(0.55), sp = Math.sin(0.55); let ex = 0;
    for (const yw of [0, 1.5708]) { d.length = 0; for (let i = 0; i < ep.L; i += 5) { const x = ep.A[i * 3] - m.c[0], y = ep.A[i * 3 + 1] - m.c[1], z = ep.A[i * 3 + 2] - m.c[2], a = x * Math.cos(yw) - y * Math.sin(yw), b = x * Math.sin(yw) + y * Math.cos(yw); d.push(Math.hypot(a, b * cp - z * sp)); } d.sort((u, v) => u - v); ex = Math.max(ex, d[Math.floor(d.length * 0.95)]); }
    ep.X = ex * 1.08; }
}

export function draw(ctx, { g }) {
  const P = g.params, N = P.n, K = P.trail, live = g.live;
  // which two epochs are on screen, and how much of each: loop mode fades epoch 0 to epoch 2 (another attractor) and back; live mode walks on forever
  let ea, eb, wb;
  if (!live) { ea = 0; eb = 2; wb = 0.5 - 0.5 * Math.cos(g.theta); }
  else { const t = g.drift, e = Math.floor(t / P.epoch); ea = e; eb = e + 1; wb = g.ease.smoother((t - e * P.epoch - (P.epoch - P.fade)) / P.fade); }
  const A = epoch(g, ea, N); fill(A, A.L);
  let B = null; if (wb > 0.002) { B = epoch(g, eb, N); fill(B, B.L); }
  if (live) { const nx = epoch(g, ea + 1, N); fill(nx, 9000); if (nx.done) { const n2 = epoch(g, ea + 2, N); fill(n2, 9000); } } // the next epochs are built a slice per frame, ahead of time
  const q = Math.min(1, g.q ?? 1), W = K + 2, stride = W * 2;
  if (BUF.n < N) { BUF.n = N; BUF.a = new Float32Array(N * stride); BUF.f = new Float32Array(N); BUF.np = new Uint8Array(N); }
  const { a: Bf, f: Fd, np } = BUF, r0 = Math.max(0.0016, 1.2 / g.S), F = 3000, aw = Math.min(g.bx, g.by * 0.95);
  // the camera turns slowly (closes over T in loop mode) and never carries the whole motion: the attractor itself is changing
  const yaw = 0.5 * Math.sin(g.voice(1)) + (live ? 0.012 * g.drift : 0), pit = 0.55 + 0.18 * Math.sin(g.voice(2) + 1);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
  const pass = (ep, w) => {
    const Ar = ep.A, c = ep.c, L = ep.L, SPe = ep.SP, sc = aw / ep.X, shift = SPe * (live ? g.drift / g.T * 1.0618 : g.p);
    const proj = (j, o) => { // sample j of the trajectory -> screen units, mild perspective
      j = ((j % L) + L) % L; const x = Ar[j * 3] - c[0], y = Ar[j * 3 + 1] - c[1], z = Ar[j * 3 + 2] - c[2];
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy, y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp, k = 1 / (1 - z2 / ep.R * 0.18);
      Bf[o] = x1 * k * sc; Bf[o + 1] = y2 * k * sc;
    };
    const n = Math.max(1, Math.round(N * q)); let cnt = 0;
    for (let j = 0; j < n; j++) { // evenly spaced particles; the picture at p = 1 is the picture at p = 0 shifted by one particle
      const i = Math.floor(j * N / n), u = ((i * SPe + shift) % L + L) % L, i0 = Math.floor(u), fr = u - i0, f = Math.min(1, u / F, (L - u) / F);
      if (f < 0.04) continue;
      const o = cnt * stride, nk = 2 + Math.round(K * f);
      proj(i0, o + 2); proj(i0 + 1, o + 4); // the head is a lerp of two samples, so the particle glides
      Bf[o] = Bf[o + 2] + (Bf[o + 4] - Bf[o + 2]) * fr; Bf[o + 1] = Bf[o + 3] + (Bf[o + 5] - Bf[o + 3]) * fr;
      for (let k = 2; k < nk; k++) proj(i0 - k + 1, o + k * 2); // slots: 0 head, 1 sample i0, 2 sample i0-1 ...
      Fd[cnt] = f; np[cnt] = nk; cnt++;
    }
    g.pen(ctx, 'fine', 1, g.c.ink); ctx.lineCap = 'butt';
    for (const [s0, s1, al] of [[3, W - 1, 0.16], [1, 3, 0.3], [0, 1, 0.55]]) { // trail by age, oldest first
      ctx.globalAlpha = al * w; ctx.beginPath();
      for (let p = 0; p < cnt; p++) {
        const o = p * stride, e = Math.min(s1, np[p] - 1); if (e <= s0) continue; ctx.moveTo(Bf[o + s0 * 2], Bf[o + s0 * 2 + 1]);
        for (let k = s0 + 1; k <= e; k++) ctx.lineTo(Bf[o + k * 2], Bf[o + k * 2 + 1]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8 * w; ctx.fillStyle = g.c.ink; ctx.beginPath();
    for (let p = 0; p < cnt; p++) { const o = p * stride, r = r0 * (0.45 + 0.55 * Fd[p]); ctx.moveTo(Bf[o] + r, Bf[o + 1]); ctx.arc(Bf[o], Bf[o + 1], r, 0, TAU); }
    ctx.fill();
  };
  if (wb < 0.998) pass(A, 1 - wb);
  if (B && wb > 0.002) pass(B, wb);
}
