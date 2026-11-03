// M02 Aizawa attractor (a continuous-time strange attractor, drawn as a gliding swarm).
// One rule: one long trajectory of the Aizawa flow is computed once, and thousands of particles ride it at evenly spaced places, each trailing a short comet, so the swarm streams along a folded filigree.
export const meta = {
  id: 'm02-clifford', title: 'Aizawa attractor', T: 12, still: 0.1, start: 0.25, aspects: ['4:5', '16:9', '1:1'],
  math: "dx/dt = (z - b) x - d y,  dy/dt = d x + (z - b) y,  dz/dt = c + a z - z^3/3 - (x^2 + y^2)(1 + e z) + f z x^3;  a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1",
  label: 'A swarm of particles gliding along the Aizawa strange attractor, each with a short comet trail, seen from a slowly turning viewpoint; the density of the swarm draws the folded filigree of the flow.',
  // n: particles on the big attractor; trail: samples behind each particle
  params: { n: 3200, trail: 3 },
};

const TAU = Math.PI * 2, SP = 45, H = 0.02; // SP: trajectory samples between neighbouring particles; H: RK4 step
const TR = { key: '', xyz: null, c: [0, 0, 0], R: 1, L: 0 }, BUF = { n: 0, a: null };
const flow = (x, y, z, o) => {
  o[0] = (z - 0.7) * x - 3.5 * y; o[1] = 3.5 * x + (z - 0.7) * y;
  o[2] = 0.6 + 0.95 * z - z * z * z / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x;
};
function trajectory(L, seed, rng) { // L samples of the flow, one RK4 step apart; built once per (L, seed)
  const key = L + ':' + seed; if (TR.key === key) return;
  const a = new Float32Array(L * 3), k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0];
  let x = 0.1 + 0.02 * rng(), y = 0.02 * rng(), z = 0.02 * rng();
  for (let i = -3000; i < L; i++) {
    flow(x, y, z, k1); flow(x + H / 2 * k1[0], y + H / 2 * k1[1], z + H / 2 * k1[2], k2);
    flow(x + H / 2 * k2[0], y + H / 2 * k2[1], z + H / 2 * k2[2], k3); flow(x + H * k3[0], y + H * k3[1], z + H * k3[2], k4);
    x += H / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += H / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); z += H / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    if (i >= 0) { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; }
  }
  let sx = 0, sy = 0, sz = 0; for (let i = 0; i < L; i++) { sx += a[i * 3]; sy += a[i * 3 + 1]; sz += a[i * 3 + 2]; }
  const c = [sx / L, sy / L, sz / L], d = []; for (let i = 0; i < L; i += 37) d.push(Math.hypot(a[i * 3] - c[0], a[i * 3 + 1] - c[1], a[i * 3 + 2] - c[2]));
  d.sort((p, q) => p - q); Object.assign(TR, { key, xyz: a, c, R: d[Math.floor(d.length * 0.995)], L });
}

export function draw(ctx, { g }) {
  const P = g.params, N0 = P.n, L = N0 * SP, K = P.trail, q = Math.min(1, g.q ?? 1), live = g.live;
  trajectory(L, g.seed, g.rng('aizawa'));
  const A = TR.xyz, c = TR.c, W = K + 2, stride = W * 2;
  if (BUF.n < N0) { BUF.n = N0; BUF.a = new Float32Array(N0 * stride); BUF.f = new Float32Array(N0); BUF.np = new Uint8Array(N0); }
  const { a: B, f: Fd, np } = BUF, r0 = Math.max(0.0016, 1.2 / g.S), F = 3000; // F: samples over which a particle fades in and out at the wrap of the trajectory
  // the particles flow by one spacing per loop; live, the rate is detuned so the swarm never lines up with itself again
  const shift = SP * (live ? g.drift / g.T * 1.0618 : g.p);
  const layers = [[1, 0, -0.06, 1, 0, 1], [0.32, 0.5, 0.62, 0.22, Math.floor(L / 3), -1]]; // scale, x, y (in bx, by), share of particles, trajectory offset, yaw sign
  const aw = Math.min(g.bx, g.by * 0.92);
  for (const [sc0, lx, ly, share, off, ys] of layers) {
    const yaw = ys * (0.5 * Math.sin(g.voice(1)) + (live ? 0.25 * g.drift * 0.05 : 0)), pit = 0.55 + 0.18 * Math.sin(g.voice(2) + 1) + 0.0;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), sc = sc0 * aw / TR.R * 0.98, ox = lx * g.bx, oy = ly * g.by;
    const proj = (j, o) => { // sample j of the trajectory -> screen (unit coordinates), mild perspective
      j = ((j % L) + L) % L; const x = A[j * 3] - c[0], y = A[j * 3 + 1] - c[1], z = A[j * 3 + 2] - c[2];
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy, y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp, k = 1 / (1 - z2 / TR.R * 0.18);
      B[o] = x1 * k * sc + ox; B[o + 1] = y2 * k * sc + oy;
    };
    const Nn = Math.round(N0 * share), Ls = Nn * SP, n = Math.max(1, Math.round(Nn * q)); let cnt = 0; // a layer is a segment of the trajectory Ls samples long
    for (let j = 0; j < n; j++) {
      const i = Math.floor(j * Nn / n), u = ((i * SP + shift) % Ls + Ls) % Ls, i0 = off + Math.floor(u), fr = u - Math.floor(u), f = Math.min(1, u / F, (Ls - u) / F);
      if (f < 0.04) continue;
      const o = cnt * stride, nk = 2 + Math.round(K * f);
      proj(i0, o + 2); proj(i0 + 1, o + 4); // head = lerp of these two, so the particle glides between samples
      B[o] = B[o + 2] + (B[o + 4] - B[o + 2]) * fr; B[o + 1] = B[o + 3] + (B[o + 5] - B[o + 3]) * fr;
      for (let k = 2; k < nk; k++) proj(i0 - k + 1, o + k * 2); // slots: 0 head, 1 sample i0, 2 sample i0-1 ...
      Fd[cnt] = f; np[cnt] = nk; cnt++;
    }
    g.pen(ctx, 'fine', 1, g.c.ink); ctx.lineCap = 'butt';
    const passes = [[3, W - 1, 0.16], [1, 3, 0.3], [0, 1, 0.55]]; // slot ranges by age, oldest first
    for (const [s0, s1, al] of passes) {
      ctx.globalAlpha = al; ctx.beginPath();
      for (let p = 0; p < cnt; p++) {
        const o = p * stride, e = Math.min(s1, np[p] - 1); if (e <= s0) continue; ctx.moveTo(B[o + s0 * 2], B[o + s0 * 2 + 1]);
        for (let k = s0 + 1; k <= e; k++) ctx.lineTo(B[o + k * 2], B[o + k * 2 + 1]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8; ctx.fillStyle = g.c.ink; ctx.beginPath(); const rr = r0 * (sc0 < 1 ? 0.8 : 1);
    for (let p = 0; p < cnt; p++) { const o = p * stride, r = rr * (0.45 + 0.55 * Fd[p]); ctx.moveTo(B[o] + r, B[o + 1]); ctx.arc(B[o], B[o + 1], r, 0, TAU); }
    ctx.fill();
  }
}
