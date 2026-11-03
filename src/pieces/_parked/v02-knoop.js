// V02 Knoop (an interlaced torus knot, turning in space, with true over and under).
// One rule: a torus knot is drawn as a ribbon of three coloured pencil lines, rotated slowly in 3D, and wherever two parts of the ribbon cross, the part nearer to us is unbroken and the part behind it is cut; knots change by crossfade.
export const meta = {
  id: 'v02-knoop', title: 'Knoop', nl: 'Knoop', T: 16, still: 0.51, start: 0.01, aspects: ['4:5', '16:9', '1:1'],
  math: 'x = (R + r cos qt) cos pt,  y = (R + r cos qt) sin pt,  z = r sin qt  (torus knot T(p,q); the trefoil is T(2,3))',
  label: 'A torus knot drawn as a ribbon of three pencil lines turns slowly in space; every crossing is cut so the nearer strand passes over, and the trefoil fades into the five-lobed star, then the larger knots, one at a time.',
  // r: tube radius over core radius; spacing: distance between the three lines (S); gap: cut either side of an over strand (S);
  // twist: how much the ribbon turns edge-on in 3D (0 = flat ribbon facing us); seg: samples around the knot at q = 1
  params: { pitch: 0.3, r: 0.5, spacing: 0.0125, gap: 0.0045, twist: 0.3, seg: 520 },
};

const TAU = 2 * Math.PI, KN = [[2, 3], [2, 5], [3, 4], [3, 5]]; // the cycle of knots
// scratch, only grown, never read across frames
const SC = { M: new Float64Array(9), n: 0, X: null, Y: null, Z: null, mp: null, mu: null, next: null, head: new Int32Array(4096) };

export function draw(ctx, { g }) {
  const P = g.params, rr = g.rng('knot'), a0 = rr() * TAU, a1 = rr() * TAU, a2 = rr() * TAU, N = Math.max(320, Math.round(P.seg * Math.min(1, g.q ?? 1)));
  if (SC.n < N) { SC.n = N; SC.X = new Float32Array(N * 3); SC.Y = new Float32Array(N * 3); SC.Z = new Float32Array(N); SC.W = new Float32Array(N); SC.next = new Int32Array(N); SC.mp = new Float32Array(3 * N); SC.mu = new Float32Array(3 * N); }
  // the knot shown: each form stays pure and keeps turning; the next one fades in only once the last has mostly faded out (a crossfade, never a blend of two shapes)
  const slot = g.live ? 10 : g.T / KN.length, u = g.live ? g.drift / slot : g.p * KN.length, i0 = Math.floor(u), f = u - i0, w = (g.live ? 1.7 : 1.4) / slot, h0 = 1 - 1.55 * w;
  const ea = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  const aOut = f < h0 ? 1 : 1 - ea((f - h0) / w), aIn = ea((f - h0 - 0.55 * w) / w), k0 = ((i0 % KN.length) + KN.length) % KN.length;
  // rotation: a steady spin about the torus axis (a third of a turn per loop: the trefoil looks the same after that, so the loop closes),
  // plus a pitch that tips the torus toward us and a yaw, each on its own slowly detuned voice
  const spin = g.voice(1) / KN[0][1], pitch = P.pitch + 0.12 * Math.sin(g.voice(2) + a1) + 0.08 * Math.sin(g.drift * 0.11), yaw = 0.14 * Math.sin(g.voice(3) + a2) + 0.06 * Math.sin(g.drift * 0.07 + a0);
  const cs = Math.cos(spin), ss = Math.sin(spin), cp = Math.cos(pitch), sP = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  // M = Ry * Rx * Rz applied to a model vector (x, y, z); rows give screen x, screen y, depth (toward us)
  const M = SC.M, sc = Math.min(g.bx, g.by) / (1 + P.r) * 0.97;
  M[0] = cy * cs + sy * sP * ss; M[1] = -cy * ss + sy * sP * cs; M[2] = sy * cp; M[3] = cp * ss; M[4] = cp * cs; M[5] = -sP; M[6] = -sy * cs + cy * sP * ss; M[7] = sy * ss + cy * sP * cs; M[8] = cy * cp;
  // the construction: the torus's core circle, faint, in the same view
  g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath();
  for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU, x = Math.cos(a), y = Math.sin(a), px = (M[0] * x + M[1] * y) * sc, py = (M[3] * x + M[4] * y) * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  const headless = typeof document === 'undefined'; // headless motion test: both forms always, whole ribbons (the cuts change the point count between frames)
  if (aOut > 0.003 || headless) form(ctx, g, P, KN[k0], aOut, N, sc);
  if (aIn > 0.003 || headless) form(ctx, g, P, KN[(k0 + 1) % KN.length], aIn, N, sc);
  ctx.globalAlpha = 1;
}

// one knot T(p,q), complete with its own over and under, at the given opacity
function form(ctx, g, P, [p, q], alpha, N, sc) {
  const { X, Y, Z, W, head, next, mp, mu, M } = SC, sp = P.spacing, lwid = g.lw('line') * 1.3, R = 1, r = P.r, tw = P.twist;
  const m00 = M[0], m01 = M[1], m02 = M[2], m10 = M[3], m11 = M[4], m12 = M[5], m20 = M[6], m21 = M[7], m22 = M[8];
  // sample the knot: position and the torus normal, in model space
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU, c = q * t, a = p * t, cc = Math.cos(c);
    mp[i * 3] = (R + r * cc) * Math.cos(a); mp[i * 3 + 1] = (R + r * cc) * Math.sin(a); mp[i * 3 + 2] = r * Math.sin(c);
    mu[i * 3] = cc * Math.cos(a); mu[i * 3 + 1] = cc * Math.sin(a); mu[i * 3 + 2] = Math.sin(c);
  }
  const o = P.spacing;
  for (let i = 0; i < N; i++) {
    const a = ((i + N - 1) % N) * 3, c = ((i + 1) % N) * 3, k = i * 3;
    const tx = mp[c] - mp[a], ty = mp[c + 1] - mp[a + 1], tz = mp[c + 2] - mp[a + 2];
    // ribbon direction bn = t x u, normalised; rotated into the view
    let bx = ty * mu[k + 2] - tz * mu[k + 1], by = tz * mu[k] - tx * mu[k + 2], bz = tx * mu[k + 1] - ty * mu[k];
    const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;
    const sx = m00 * mp[k] + m01 * mp[k + 1] + m02 * mp[k + 2], sY = m10 * mp[k] + m11 * mp[k + 1] + m12 * mp[k + 2];
    const dx = (m00 * mp[c] + m01 * mp[c + 1] + m02 * mp[c + 2]) - (m00 * mp[a] + m01 * mp[a + 1] + m02 * mp[a + 2]);
    const dy = (m10 * mp[c] + m11 * mp[c + 1] + m12 * mp[c + 2]) - (m10 * mp[a] + m11 * mp[a + 1] + m12 * mp[a + 2]);
    const dl = Math.hypot(dx, dy) || 1e-9, nx = -dy / dl, ny = dx / dl;
    const pbx = m00 * bx + m01 * by + m02 * bz, pby = m10 * bx + m11 * by + m12 * bz; // ribbon direction as seen on screen
    let vx = nx * (1 - tw) + pbx * tw, vy = ny * (1 - tw) + pby * tw; // blend of screen normal and the 3D ribbon direction
    if (vx * nx + vy * ny < 0) { vx = -vx; vy = -vy; } // keep the line order (never swap lines mid-ribbon)
    W[i] = Math.hypot(vx, vy) * o; // half the ribbon width here (it narrows where the ribbon turns edge-on)
    vx *= o; vy *= o;
    const X0 = sx * sc, Y0 = sY * sc; Z[i] = (m20 * mp[k] + m21 * mp[k + 1] + m22 * mp[k + 2]) * sc;
    for (let l = 0; l < 3; l++) { X[l * N + i] = X0 + (l - 1) * vx; Y[l * N + i] = Y0 + (l - 1) * vy; }
  }
  const CX = X.subarray(N, 2 * N), CY = Y.subarray(N, 2 * N); // centre line = middle line of the ribbon
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink] : [g.c.accent, g.c.cool, g.c.third], wj = [1, 0.9, 1.07];
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  if (typeof document === 'undefined') {
    for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(X[l * N], Y[l * N]); for (let i = 1; i < N; i++) ctx.lineTo(X[l * N + i], Y[l * N + i]); ctx.closePath(); ctx.stroke(); }
    return;
  }
  // Over and under. Clearance of a point of the ribbon = its distance to the centre line of any part of the knot that is nearer to us here
  // (not a neighbour along the same curve), minus half a ribbon and the gap. Clearance <= 0 means "behind something": the line is cut there.
  const cut = sp + lwid + P.gap, ox = -0.6, cell = cut, gl = P.gap + lwid, GW = Math.min(63, Math.ceil(1.2 / cell) + 1);
  let len = 0; for (let i = 0; i < N; i++) len += Math.hypot(CX[(i + 1) % N] - CX[i], CY[(i + 1) % N] - CY[i]);
  const win = Math.ceil(3 * cut / (len / N)) + 2; // samples along the same curve that never count as another part of the knot
  head.fill(-1, 0, GW * GW);
  for (let q = 0; q < N; q++) { const gx = Math.floor((CX[q] - ox) / cell), gy = Math.floor((CY[q] - ox) / cell), hh = gy * GW + gx; next[q] = head[hh]; head[hh] = q; }
  const clr = (x, y, z, i) => {
    const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - ox) / cell); let best = 1e9;
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
      for (let q = head[yy * GW + xx]; q >= 0; q = next[q]) {
        let dq = q - i; dq = dq < 0 ? -dq : dq; if (dq > N - dq) dq = N - dq;
        if (dq <= win || Z[q] <= z) continue;
        const dx = CX[q] - x, dy = CY[q] - y, d = Math.sqrt(dx * dx + dy * dy) - W[q]; if (d < best) best = d;
      }
    }
    return best - gl;
  };
  ctx.globalAlpha = 0.94 * alpha;
  for (let l = 0; l < 3; l++) {
    ctx.strokeStyle = cols[l]; ctx.lineWidth = lwid * wj[l]; ctx.beginPath();
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
}
