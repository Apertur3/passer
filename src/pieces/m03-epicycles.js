// M03 Epicycles (a chain of turning circles that draws a closed curve).
// One rule: twelve circles ride on each other, circle k turning k times per revolution, and the last point of the chain draws the curve.
export const meta = {
  id: 'm03-epicycles', title: 'Epicycles', T: 16, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'z(s) = Σ c_k e^(i k s), twelve integer k, |c_k| ~ 1/|k|^1.2',
  label: 'Twelve circles turning on each other: the last point of the chain draws a closed curve, and the circles slowly grow and fade so the curve keeps changing.',
  // terms: circles per chain; decay: exponent of |c_k| ~ 1/|k|^decay; pts: samples of the closed curve at q = 1
  params: { terms: 12, decay: 1.2, pts: 520 },
};

const TAU = 2 * Math.PI, sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };

// One chain: integer frequencies k = 1 + nf*j, so the curve has nf-fold symmetry and the pen needs only 1/nf of a revolution per loop
// (the whole drawing turns back by the same angle). Amplitudes ~ 1/|k|^decay; each circle swells and fades on its own voice.
function chain(ctx, g, r, cx, cy, R, spin) {
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
  const sc = R / (mx * 1.12), M = Math.max(120, Math.round(P.pts * Math.min(1, g.q ?? 1))), sp = spin * g.voice(1) / nf, co = Math.cos(-sp), si = Math.sin(-sp);
  const z = s => { let x = 0, y = 0; for (let j = 0; j < N; j++) { const a = ks[j] * s, c = Math.cos(a), d = Math.sin(a); x += cr[j] * c - ci[j] * d; y += cr[j] * d + ci[j] * c; } return [x, y]; };
  const X = (x, y) => cx + (x * co - y * si) * sc, Y = (x, y) => cy + (x * si + y * co) * sc; // the drawing turns back by the pen's angle
  ctx.beginPath();
  for (let i = 0; i < M; i++) { const [x, y] = z(i / M * TAU); i ? ctx.lineTo(X(x, y), Y(x, y)) : ctx.moveTo(X(x, y), Y(x, y)); }
  ctx.closePath(); g.pen(ctx, 'fine', 0.6, g.c.ink); ctx.stroke(); // the closed curve
  const L = 0.3 * TAU / nf, B = 6; // the part just drawn by the pen, tapering to nothing so it has no visible end
  for (let b = 0; b < B; b++) {
    ctx.beginPath(); const s0 = sp - L * (b + 1) / B, s1 = sp - L * b / B, m = Math.round(M * 0.035);
    for (let i = 0; i <= m; i++) { const [x, y] = z(s0 + (s1 - s0) * i / m); i ? ctx.lineTo(X(x, y), Y(x, y)) : ctx.moveTo(X(x, y), Y(x, y)); }
    g.pen(ctx, 'line', 0.95 * Math.pow(1 - (b + 0.5) / B, 1.4), g.c.ink); ctx.stroke();
  }
  let x = 0, y = 0; // the chain: one circle per term, centred on the sum of the circles before it
  for (let j = 0; j < N; j++) {
    const a = ks[j] * sp, r0 = Math.hypot(cr[j], ci[j]), dx = cr[j] * Math.cos(a) - ci[j] * Math.sin(a), dy = cr[j] * Math.sin(a) + ci[j] * Math.cos(a), al = Math.min(0.8, 0.3 + r0 * 6);
    ctx.beginPath(); ctx.arc(X(x, y), Y(x, y), r0 * sc, 0, TAU); g.pen(ctx, 'hair', al, g.c.ink); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(x, y), Y(x, y)); ctx.lineTo(X(x + dx, y + dy), Y(x + dx, y + dy)); g.pen(ctx, 'hair', al, g.c.ink); ctx.stroke();
    x += dx; y += dy;
  }
  ctx.beginPath(); ctx.arc(X(x, y), Y(x, y), 0.0045, 0, TAU); ctx.fillStyle = g.c.ink; ctx.globalAlpha = 1; ctx.fill();
}

export function draw(ctx, { g }) {
  const wide = g.aspect > 1.3, m = Math.min(g.bx, g.by);
  if (wide) {
    chain(ctx, g, g.rng('a'), -g.bx * 0.22, 0, g.by * 0.98, 1);
    chain(ctx, g, g.rng('b'), g.bx * 0.58, -g.by * 0.42, g.by * 0.46, -1);
    chain(ctx, g, g.rng('c'), g.bx * 0.58, g.by * 0.52, g.by * 0.38, 1);
  } else {
    chain(ctx, g, g.rng('a'), 0, -g.by * 0.22, m * 0.98, 1);
    chain(ctx, g, g.rng('b'), g.bx * 0.5, g.by * 0.58, m * 0.4, -1);
    chain(ctx, g, g.rng('c'), -g.bx * 0.5, g.by * 0.64, m * 0.34, 1);
  }
}
