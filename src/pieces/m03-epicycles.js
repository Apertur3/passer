// M03 Epicycles (a chain of turning circles that draws a closed curve).
// One rule: twelve circles ride on each other, circle k turning k times per revolution, and the last point of the chain draws the curve.
export const meta = {
  id: 'm03-epicycles', title: 'Epicycles', T: 16, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'z(s) = Σ c_k e^(i k s), twelve integer k, |c_k| ~ 1/|k|^1.2',
  label: 'A field of epicycle machines of many sizes: each chain of turning circles draws its own closed curve, and the circles slowly swell and fade so the curves keep changing.',
  // terms: circles per chain; decay: exponent of |c_k| ~ 1/|k|^decay; pts: samples of the closed curve at q = 1
  params: { terms: 12, decay: 1.2, pts: 520 },
};

const TAU = 2 * Math.PI, sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };

// One chain: integer frequencies k = 1 + nf*j, so the curve has nf-fold symmetry and the pen needs only 1/nf of a revolution per loop
// (the whole drawing turns back by the same angle). Amplitudes ~ 1/|k|^decay; each circle swells and fades on its own voice.
function chain(ctx, g, r, cx, cy, R, spin, k1) {
  const P = g.params, N = P.terms, nf = 3 + ((r() * 4) | 0), ks = [1];
  for (let j = 1; ks.length < N; j++) { ks.push(1 - nf * j); if (ks.length < N) ks.push(1 + nf * j); }
  const base = ks.map((k, i) => i === 0 ? 1 : (0.5 / Math.pow(Math.ceil(i / 2), P.decay)) * (i % 2 ? 1 : 0.55) * (0.8 + 0.4 * r()));
  const psi = ks.map(() => r() * TAU), vk = ks.map(() => 1 + ((r() * 3) | 0)), wph = ks.map(() => r() * TAU);
  const live = g.drift * 0.12, cr = [], ci = [];
  ks.forEach((k, i) => {
    const e = i === 0 ? 1 : sm(0.5 + 0.95 * Math.sin(g.voice(vk[i]) + wph[i] + live * (1 + i * 0.37))), a = base[i] * e;
    cr.push(a * Math.cos(psi[i])); ci.push(a * Math.sin(psi[i]));
  });
  let mx = 0; for (let j = 0; j < 90; j++) { let x = 0, y = 0; const s = j / 90 * TAU; ks.forEach((k, i) => { x += base[i] * Math.cos(k * s + psi[i]); y += base[i] * Math.sin(k * s + psi[i]); }); mx = Math.max(mx, Math.hypot(x, y)); }
  const sc = R / (mx * 1.12), M = Math.max(100, Math.round(P.pts * Math.min(1, g.q ?? 1) * Math.min(1, 0.35 + R * 1.6))), sp = spin * g.voice(k1) / nf, co = Math.cos(-sp), si = Math.sin(-sp);
  const z = s => { let x = 0, y = 0; for (let j = 0; j < N; j++) { const a = ks[j] * s, c = Math.cos(a), d = Math.sin(a); x += cr[j] * c - ci[j] * d; y += cr[j] * d + ci[j] * c; } return [x, y]; };
  const X = (x, y) => cx + (x * co - y * si) * sc, Y = (x, y) => cy + (x * si + y * co) * sc; // the drawing turns back by the pen's angle
  ctx.beginPath();
  for (let i = 0; i < M; i++) { const [x, y] = z(i / M * TAU); i ? ctx.lineTo(X(x, y), Y(x, y)) : ctx.moveTo(X(x, y), Y(x, y)); }
  ctx.closePath(); g.pen(ctx, 'fine', 0.6, g.c.ink); ctx.stroke(); // the closed curve
  const L = 0.3 * TAU / nf, B = 6; // the part just drawn by the pen, tapering to nothing so it has no visible end
  for (let b = 0; b < B; b++) {
    ctx.beginPath(); const s0 = sp - L * (b + 1) / B, s1 = sp - L * b / B, m = Math.max(8, Math.round(M * 0.035));
    for (let i = 0; i <= m; i++) { const [x, y] = z(s0 + (s1 - s0) * i / m); i ? ctx.lineTo(X(x, y), Y(x, y)) : ctx.moveTo(X(x, y), Y(x, y)); }
    g.pen(ctx, R > 0.12 ? 'line' : 'fine', 0.95 * Math.pow(1 - (b + 0.5) / B, 1.4), g.c.ink); ctx.stroke();
  }
  let x = 0, y = 0; // the chain: one circle per term, centred on the sum of the circles before it
  for (let j = 0; j < N; j++) {
    const a = ks[j] * sp, r0 = Math.hypot(cr[j], ci[j]), dx = cr[j] * Math.cos(a) - ci[j] * Math.sin(a), dy = cr[j] * Math.sin(a) + ci[j] * Math.cos(a), al = Math.min(0.8, 0.3 + r0 * 6);
    ctx.beginPath(); ctx.arc(X(x, y), Y(x, y), r0 * sc, 0, TAU); g.pen(ctx, 'hair', al, g.c.ink); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(x, y), Y(x, y)); ctx.lineTo(X(x + dx, y + dy), Y(x + dx, y + dy)); g.pen(ctx, 'hair', al, g.c.ink); ctx.stroke();
    x += dx; y += dy;
  }
  ctx.beginPath(); ctx.arc(X(x, y), Y(x, y), 0.0025 + 0.002 * Math.min(1, R / 0.3), 0, TAU); ctx.fillStyle = g.c.ink; ctx.globalAlpha = 1; ctx.fill();
}

// Poisson-disk style placement: seeded dart throwing, largest systems first, no two systems overlap where it can be avoided.
function place(g, n) {
  const r = g.rng('field'), m = Math.min(g.bx, g.by), out = [];
  for (let i = 0; i < n; i++) {
    let R = m * (i < 2 ? 0.62 - 0.17 * i : 0.34 * Math.pow(0.84, i - 2)) * (0.9 + 0.2 * r()), best = null;
    for (let tries = 0; tries < 160 && !best; tries++) {
      if (tries % 40 === 39) R *= 0.9; // no room: try a smaller system
      const x = (r() * 2 - 1) * (g.bx - R), y = (r() * 2 - 1) * (g.by - R);
      if (out.every(o => Math.hypot(o.x - x, o.y - y) > o.R + R + 0.012)) best = { x, y, R };
    }
    if (best) out.push(best);
  }
  return out;
}

export function draw(ctx, { g }) {
  const sys = place(g, 12), r = g.rng('mix');
  sys.forEach((o, i) => chain(ctx, g, g.rng('c' + i), o.x, o.y, o.R, r() < 0.5 ? 1 : -1, o.R < 0.14 * Math.min(g.bx, g.by) ? 3 : o.R < 0.3 * Math.min(g.bx, g.by) ? 2 : 1));
}
