// F07 Halftone orbs (AM halftone, 45 degree screens, cast shadows on a second, rotated screen).
// One rule: a large halftone sphere and three smaller ones circle it under one drifting light, each printed on its own dot pitch, casting halftone shadows that add up where they overlap.
export const meta = {
  id: 'f07-halftone-sphere', title: 'Halftone orbs', T: 12, start: 0.15, still: 0.3, aspects: ['4:5', '16:9', '1:1'],
  label: 'A large sphere and three smaller ones, all printed as halftone dots of different sizes, circling under a drifting light and casting dotted shadows, while a copper ring slides across them and the dots shrink away from it.',
  // radius: big sphere radius (S); pitch: its dot spacing (S); flat: shadow ellipse squash; shadowPitch: shadow screen spacing (S)
  params: { radius: 0.17, pitch: 0.0095, flat: 0.2, shadowPitch: 0.0085 },
};

const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// hash of a lattice cell to [0,1): static per-dot jitter without consuming a stream
const hs = (s, i, j) => { let h = Math.imul(i * 374761393 ^ j * 668265263 ^ s, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const C45 = Math.SQRT1_2, CAP = 9000;
// orbs: size relative to the big one, dot pitch relative, orbit half-axes (S), phase, spin of the orbit (integer harmonic)
const ORBS = [
  { r: 1, p: 1, ox: 0.02, oy: 0.012, ph: 0, h: 1 },
  { r: 0.5, p: 0.76, ox: 0.24, oy: 0.1, ph: 2.1, h: 1 },
  { r: 0.36, p: 0.58, ox: 0.15, oy: 0.065, ph: 4.4, h: 1 },
  { r: 0.25, p: 0.45, ox: 0.28, oy: 0.12, ph: 0.9, h: -1 },
];
// scratch buffers reused every frame: x, y, r triples in three alpha groups
const BUF = [0, 1, 2, 3, 4, 5].map(() => new Float32Array(CAP * 3)), CNT = new Int32Array(6);

export function draw(ctx, { g }) {
  const P = g.params, th = g.theta, vo = g.voice || (k => k * g.theta), night = g.c.paper < g.c.ink;
  const R0 = Math.min(P.radius, g.by * 0.4), st = Math.min(1.15, g.bx / 0.42), cyB = -g.by * 0.3, G = g.by * 0.48;
  // one light, circling in front of the scene: x swings, height breathes on a detuned voice
  const lv = [0.9 * Math.sin(th), -0.5 - 0.32 * Math.cos(vo(2) + 0.7), 0.75], ln = Math.hypot(...lv), L = lv.map(v => v / ln);
  const salt = (g.rng('dots')() * 1e9) | 0, hover = vo(3);
  const orbs = ORBS.map((o, i) => {
    const a = o.h * th + o.ph, z = Math.sin(a), s = 1 + 0.12 * z, R = R0 * o.r * s;
    return { ...o, i, R, pitch: P.pitch * o.p * s, x: o.ox * st * Math.cos(a) * (i ? 1 : 1), y: cyB + o.oy * Math.sin(a) + 0.012 * Math.sin(hover + i * 2), z };
  }).sort((a, b) => a.z - b.z); // back to front
  CNT.fill(0);
  const put = (b, x, y, r) => { const n = CNT[b]; if (n < CAP * 3) { const a = BUF[b]; a[n] = x; a[n + 1] = y; a[n + 2] = r; CNT[b] = n + 3; } };
  const rad = (pitch, a, h) => pitch * Math.sqrt(Math.min(a, 0.92) / Math.PI) * (1 + 0.06 * (h - 0.5));

  // the accent ring: slides through the whole scene on a figure of eight; dots shrink away from it
  const ax = g.bx * 0.42 * Math.cos(th), ay = cyB + g.by * 0.15 * Math.sin(2 * th + 1), ar = 0.024, hr = ar * 2.4;

  // shadows: one paper-fixed 15 degree screen; every orb adds its soft ellipse on the ground, so overlaps print darker
  const sp = P.shadowPitch, ca = Math.cos(0.26), sa = Math.sin(0.26), sh = orbs.map(o => {
    const h = Math.max(0, G - o.y - o.R), k = Math.max(0.25, -L[1]);
    return { x: o.x - (L[0] / k) * h * 0.45, y: G + 0.6 * o.R * 0.5 * (o.z - 1) * 0.5, rx: o.R * (1.0 + h * 0.12), soft: 0.3 + Math.min(0.6, h * 1.3), o };
  });
  const gy0 = G - 0.14, gy1 = G + 0.1, m = Math.ceil((g.bx + 0.15) / sp);
  for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) {
    const x = (i * ca - j * sa) * sp, y = (i * sa + j * ca) * sp;
    if (y < gy0 || y > gy1 || Math.abs(x) > g.bx + 0.1) continue;
    let k = 0;
    for (const s of sh) {
      const q = Math.hypot((x - s.x) / s.rx, (y - s.y) / (s.rx * P.flat));
      if (q < 1.4) k += 1 - sm(1 - s.soft, 1.05, q);
    }
    if (k < 0.03) continue;
    const dd = Math.hypot(x - ax, y - ay), re = dd < hr ? 0.2 + 0.8 * (dd / hr) ** 2 : 1, h = hs(salt, i, j);
    if (orbs.some(o => Math.hypot(x - o.x, y - o.y) < o.R)) continue;
    put((h * 3) | 0, x, y, rad(sp, (night ? 0.45 : 0.95) * Math.min(1, k) * re, h));
  }

  // spheres: object-fixed 45 degree screens; coverage follows darkness (night: luminance); nearer orbs hide dots behind them
  orbs.forEach((o, oi) => {
    const n = Math.ceil(o.R / o.pitch) + 2, front = orbs.slice(oi + 1);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const x = o.x + (i - j) * o.pitch * C45, y = o.y + (i + j) * o.pitch * C45, ux = (x - o.x) / o.R, uy = (y - o.y) / o.R, d2 = ux * ux + uy * uy;
      if (d2 > 1) continue;
      let hidden = false;
      for (const f of front) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.R * f.R) { hidden = true; break; }
      if (hidden) continue;
      const lum = 0.05 + 0.95 * Math.max(0, ux * L[0] + uy * L[1] + Math.sqrt(1 - d2) * L[2]), h = hs(salt + 7 + o.i, i, j);
      const dd = Math.hypot(x - ax, y - ay), re = dd < hr ? 0.2 + 0.8 * (dd / hr) ** 2 : 1;
      put(3 + ((h * 3) | 0), x, y, rad(o.pitch, (0.04 + 0.86 * (night ? lum : 1 - lum)) * re, h));
    }
  });
  const fill = (b0, col, a0) => {
    ctx.fillStyle = col;
    for (let k = 0; k < 3; k++) {
      const a = BUF[b0 + k], n = CNT[b0 + k]; if (!n) continue;
      ctx.globalAlpha = a0 * [0.93, 0.97, 1][k]; ctx.beginPath();
      for (let q = 0; q < n; q += 3) { ctx.moveTo(a[q] + a[q + 2], a[q + 1]); ctx.arc(a[q], a[q + 1], a[q + 2], 0, 7); }
      ctx.fill();
    }
  };
  fill(0, g.c.cool, night ? 0.9 : 0.95);
  fill(3, g.c.ink, 1);

  // the one deviation: a single ring sliding through the scene
  g.pen(ctx, 'line', 1, g.c.accent); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.stroke();
}
