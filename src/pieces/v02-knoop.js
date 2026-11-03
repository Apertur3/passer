// V02 Knoop (an interlaced torus knot, turning in space, with true over and under).
// One rule: a torus knot is drawn as a ribbon of three coloured pencil lines, rotated slowly in 3D, and wherever two parts of the ribbon cross, the part nearer to us is unbroken and the part behind it is cut.
export const meta = {
  id: 'v02-knoop', pencils: true, title: 'Knoop', nl: 'Knoop', T: 16, still: 0.51, start: 0.01, aspects: ['4:5', '16:9', '1:1'],
  math: 'x = (R + r cos qt) cos pt,  y = (R + r cos qt) sin pt,  z = r sin qt  (torus knot T(p,q); the trefoil is T(2,3))',
  label: 'A torus knot drawn as a ribbon of three pencil lines turns slowly in space and melts from the trefoil into five-crossing and larger knots, with every crossing cut so the nearer strand passes over.',
  // r: tube radius over core radius; spacing: distance between the three lines (S); gap: cut either side of an over strand (S);
  // twist: how much the ribbon turns edge-on in 3D (0 = flat ribbon facing us); seg: samples around the knot at q = 1
  params: { pitch: 0.3, r: 0.5, spacing: 0.0125, gap: 0.0045, twist: 0.3, seg: 520 },
};

const TAU = 2 * Math.PI, KN = [[2, 3], [2, 5], [3, 5], [3, 4]]; // the metamorphosis cycle
const SEG = [0, 0.17, 0.5, 0.67, 1]; // loop fraction at which each knot of KN is reached
const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
// scratch, only grown, never read across frames
const SC = { n: 0, X: null, Y: null, Z: null, mp: null, mu: null, next: null, head: new Int32Array(4096) };

export function draw(ctx, { g }) {
  const P = g.params, rr = g.rng('knot'), a0 = rr() * TAU, a1 = rr() * TAU, a2 = rr() * TAU;
  const N = Math.max(320, Math.round(P.seg * Math.min(1, g.q ?? 1))), sp = P.spacing, lwid = g.lw('line') * 1.3;
  if (SC.n < N) { SC.n = N; SC.X = new Float32Array(N * 3); SC.Y = new Float32Array(N * 3); SC.Z = new Float32Array(N); SC.W = new Float32Array(N); SC.next = new Int32Array(N); }
  const { X, Y, Z, W, head, next } = SC;
  // which knot, and how far it has melted into the next one (a short hold, then a smooth blend)
  // (a change of q only slides the tube, a change of p moves the whole knot round the axis, so p changes get twice the time)
  const F0 = g.voice(1) / TAU, F = F0 - Math.floor(F0); let i0 = 0; while (i0 < 3 && F >= SEG[i0 + 1]) i0++;
  const f = (F - SEG[i0]) / (SEG[i0 + 1] - SEG[i0]), b = sm((f - 0.18) / 0.64);
  const A = KN[i0], B = KN[(i0 + 1) % 4], R = 1, r = P.r;
  // rotation: a steady spin about the torus axis (a third of a turn per loop: the trefoil looks the same after that, so the loop closes),
  // plus a pitch that tips the torus toward us and a yaw, each on its own slowly detuned voice
  const spin = g.voice(1) / KN[0][1], pitch = P.pitch + 0.12 * Math.sin(g.voice(2) + a1) + 0.08 * Math.sin(g.drift * 0.11), yaw = 0.14 * Math.sin(g.voice(3) + a2) + 0.06 * Math.sin(g.drift * 0.07 + a0);
  const cs = Math.cos(spin), ss = Math.sin(spin), cp = Math.cos(pitch), sP = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  // M = Ry * Rx * Rz applied to a model vector (x, y, z); rows give screen x, screen y, depth (toward us)
  const m00 = cy * cs + sy * sP * ss, m01 = -cy * ss + sy * sP * cs, m02 = sy * cp;
  const m10 = cp * ss, m11 = cp * cs, m12 = -sP;
  const m20 = -sy * cs + cy * sP * ss, m21 = sy * ss + cy * sP * cs, m22 = cy * cp;
  const sc = Math.min(g.bx, g.by) / (R + r) * 0.97, tw = P.twist;

  // sample the blended knot: position, ribbon direction in the surface (tangent x torus normal), all in model space first
  if (!SC.mp || SC.mp.length < 3 * N) { SC.mp = new Float32Array(3 * N); SC.mu = new Float32Array(3 * N); }
  const mp = SC.mp, mu = SC.mu;
  for (let i = 0; i < N; i++) {
    const s = (i / N) * TAU; let x = 0, y = 0, z = 0, ux = 0, uy = 0, uz = 0, rho = 0;
    for (let e = 0; e < 2; e++) {
      const [p, q] = e ? B : A, wgt = e ? b : 1 - b, c = q * s, a = p * s, ca = Math.cos(a), sa = Math.sin(a), cc = Math.cos(c), sc2 = Math.sin(c);
      x += wgt * ca; y += wgt * sa; rho += wgt * (R + r * cc); z += wgt * r * sc2; ux += wgt * cc * ca; uy += wgt * cc * sa; uz += wgt * sc2;
    }
    const dl = Math.hypot(x, y) || 1, k = rho / Math.sqrt(dl); x *= k; y *= k; // half-way between a plain blend and one that keeps the radius: a strand dips toward the axis but never pops across it
    mp[i * 3] = x; mp[i * 3 + 1] = y; mp[i * 3 + 2] = z; mu[i * 3] = ux; mu[i * 3 + 1] = uy; mu[i * 3 + 2] = uz;
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
  // the construction: the torus's core circle, faint, in the same view
  g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath();
  for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU, x = Math.cos(a), y = Math.sin(a), px = (m00 * x + m01 * y) * sc, py = (m10 * x + m11 * y) * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink] : [g.c.accent, g.c.cool, g.c.third], wj = [1, 0.9, 1.07];
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  if (typeof document === 'undefined') { // headless motion test: whole ribbons only (the cuts change the point count between frames)
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
  ctx.globalAlpha = 0.94;
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
  ctx.globalAlpha = 1;
}
