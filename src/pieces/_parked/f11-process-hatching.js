// F11 Process hatching (gesture strokes in clusters, in the spirit of Sougwen Chung's hand drawing).
// One rule: dry-brush strokes sweep out in clusters, each a bundle of hairlines that swells and thins with pressure, then fade, each stroke on its own phase, so the sheet never stops drawing and erasing.
export const meta = {
  id: 'f11-process-hatching', title: 'Process hatching', T: 12, start: 0.4, still: 0.55, aspects: ['4:5', '16:9', '1:1'],
  label: 'Dry-brush gesture strokes drawn slowly in clusters, each stroke a bundle of hairlines that swells and thins like pressure, then fading, each on its own phase so some stroke is always being drawn.',
  // clusters: number of stroke clusters (16:9 adds two); strokes: strokes in the largest cluster (others scale down);
  // bristles: hairlines per stroke; width: half width of a full-pressure stroke (S); jitter: hand wobble (rad)
  params: { clusters: 5, strokes: 20, bristles: 7, width: 0.017, jitter: 0.16 },
};

const N = 30, MEMO = new Map(); // samples along a stroke; static geometry per (seed, box, params)
const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };

// all strokes as bristle polylines, built once; timing fields are fractions of the loop
function build(g) {
  const P = g.params, key = [g.seed, g.bx.toFixed(4), g.by.toFixed(4), P.clusters, P.strokes, P.bristles, P.width, P.jitter].join('|');
  if (MEMO.has(key)) return MEMO.get(key);
  const r = g.rng('hand'), nc = P.clusters + (g.aspect > 1.5 ? 2 : 0), size = [1, 0.62, 0.45, 0.33, 0.3, 0.28], cs = [];
  for (let k = 0; k < nc; k++) { // best-candidate placement keeps clusters apart, large ones first
    let best, bd = -1;
    for (let c = 0; c < 14; c++) {
      const q = [(r() * 2 - 1) * g.bx * (k ? 0.62 : 0.2), (r() * 2 - 1) * g.by * (k ? 0.62 : 0.2)], d = Math.min(9, ...cs.map(o => Math.hypot(o.c[0] - q[0], o.c[1] - q[1]) / (o.sz + size[k])));
      if (d > bd) { bd = d; best = q; }
    }
    cs.push({ c: best, sz: size[k] });
  }
  const rank = cs.map(a => cs.filter(b => b.c[0] < a.c[0]).length); // clusters start left to right: one sweep per loop
  const strokes = [];
  cs.forEach((cl, ci) => {
    const alpha = -0.5 + (r() - 0.5) * 1.7, curv = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.6), L = 0.3 * Math.pow(cl.sz, 0.6);
    const n = Math.max(3, Math.round(P.strokes * cl.sz)), dur = L / (0.08 * g.T), t0 = (0.6 * rank[ci]) / nc; // tip near 0.08 S/s on average; clusters start in a sweep, left to right
    for (let m = 0; m < n; m++) {
      const u = n > 1 ? m / (n - 1) : 0.5, len = L * (0.65 + 0.6 * r()), perp = (u - 0.5) * 0.17 * Math.pow(cl.sz, 0.5) + (r() - 0.5) * 0.015, slide = (r() - 0.5) * 0.09 * cl.sz + 0.05 * (u - 0.5) ** 2;
      const dir = alpha + (u - 0.5) * 0.3 + (r() - 0.5) * 0.12, pk = curv * (0.8 + 0.4 * r()), nz = r() * 50;
      let x = cl.c[0] + Math.cos(dir) * (slide - len / 2) - Math.sin(dir) * perp, y = cl.c[1] + Math.sin(dir) * (slide - len / 2) + Math.cos(dir) * perp;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1), flick = 0.9 * sm((s - 0.86) / 0.14) * (curv > 0 ? 1 : -1); // the hand overshoots and turns at the end
        const h = dir + pk * (s - 0.5) + P.jitter * g.noise4(ci * 3.1 + u * 1.6, s * 1.4, nz, 0.5) + flick * 0.5;
        pts.push([x, y, h]); x += Math.cos(h) * len / (N - 1); y += Math.sin(h) * len / (N - 1);
      }
      const bs = [], B = P.bristles;
      for (let b = 0; b < B; b++) {
        const o = ((b + 0.5) / B * 2 - 1) * (0.85 + 0.3 * r()) + (r() - 0.5) * 0.15, a = 0.3 + 0.45 * r(), lo = 0.05 * r() * r(), hi = 1 - 0.14 * r() * r() - 0.01, np = r() * 90;
        const line = pts.map(([px, py, h], i) => {
          const s = i / (N - 1), w = P.width * Math.pow(cl.sz, 0.3) * Math.pow(Math.sin(Math.PI * Math.min(0.97, Math.max(0.03, s))), 0.55) * (0.88 + 0.24 * g.noise4(b * 1.3, s * 2, np, 1.5));
          return [px - Math.sin(h) * o * w, py + Math.cos(h) * o * w];
        });
        bs.push({ line, a, lo, hi, c: (b * 7) % 3 });
      }
      const st = (t0 + 0.3 * u + 0.012 * r()) % 1; // each stroke lives one loop on its own phase (draw, hold, fade, blank)
      strokes.push({ ci, mid: pts[N >> 1], ph: r(), bs, st, dur: dur * (0.9 + 0.2 * r()), fade: 0 });
    }
  });
  strokes.slice().sort((a, b) => a.st - b.st).forEach((s, i) => (s.fade = 0.84 + 0.1 * (i / (strokes.length - 1)))); // erased in the order they were drawn
  // the one deviation: a single bold counter-stroke across the largest cluster, drawn late
  const c0 = cs[0], dir = r() * 6.28, len = 0.34, acc = [];
  for (let i = 0; i < N; i++) { const s = i / (N - 1) - 0.5; acc.push([c0.c[0] + Math.cos(dir) * len * s + 0.02 * Math.sin(s * 6), c0.c[1] + Math.sin(dir) * len * s]); }
  const out = { strokes, acc };
  if (MEMO.size > 8) MEMO.delete(MEMO.keys().next().value);
  MEMO.set(key, out); return out;
}

const LEV = new Uint8Array(4096), HEAD = new Float32Array(256), ALPHA = new Float32Array(256); // per-frame scratch: bristle alpha level, stroke head and alpha

export function draw(ctx, { g }) {
  const { strokes, acc } = build(g), p = g.p, W = [0.45, 0.65, 0.85], vo = g.voice || (k => k * g.theta), q = g.q ?? 1, DR = 0.06;
  const aage = (((p - 0.35) % 1) + 1) % 1, ahead = g.ease.sine(aage / 0.3), hp = acc[Math.min(N - 1, Math.floor(ahead * (N - 1)))], live = ahead > 0 && ahead < 1;
  const press = 0.9 + 0.2 * (0.5 + 0.5 * Math.cos(vo(2))); // pressure swell on its own voice; a drifting subset of strokes is active per pass
  // pass 0: head, alpha and alpha level of every visible bristle (strokes near the accent's pen darken)
  let nb = 0;
  strokes.forEach((s, si) => {
    const age = (((p - s.st) % 1) + 1) % 1, head = g.ease.sine(age / s.dur), a = (1 - g.ease.sine((age - 0.82) / 0.16)) * sm((Math.cos(vo(4) + s.ph * 6.283) + 1.2) / 0.5);
    HEAD[si] = head; ALPHA[si] = a;
    const boost = live ? 1 + 1.2 * Math.exp(-(((s.mid[0] - hp[0]) ** 2 + (s.mid[1] - hp[1]) ** 2) / 0.012)) : 1;
    for (const b of s.bs) LEV[nb++] = head > 0 && a > 0 ? Math.min(7, Math.floor(Math.min(1, W[b.c] * a * boost * press) * 8)) : 255;
  });
  g.pen(ctx, 'fine', 1, g.c.ink); const lw = ctx.lineWidth * 1.35; ctx.lineCap = 'butt'; ctx.lineJoin = 'bevel'; // cheaper to rasterise than the engine's round joins
  for (let lv = 0; lv < 8; lv++) { // one stroke per alpha level
    ctx.beginPath(); let any = 0, bi = 0;
    strokes.forEach((s, si) => {
      const head = HEAD[si], dx = DR * Math.cos(vo(2) + s.ci * 1.3), dy = DR * Math.sin(vo(3) + s.ci * 1.3); // each cluster floats on a small Lissajous figure
      for (let k = 0; k < s.bs.length; k++, bi++) {
        if (LEV[bi] !== lv || k >= Math.ceil(s.bs.length * q)) continue;
        const b = s.bs[k], e = Math.min(head, b.hi) * (N - 1), s0 = b.lo * (N - 1);
        if (e <= s0 + 0.2) continue;
        const L = b.line, i0 = Math.floor(s0), i1 = Math.floor(e), f = e - i1; any = 1;
        ctx.moveTo(L[i0][0] + dx, L[i0][1] + dy);
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(L[i][0] + dx, L[i][1] + dy);
        if (i1 < N - 1 && f > 0) ctx.lineTo(L[i1][0] + (L[i1 + 1][0] - L[i1][0]) * f + dx, L[i1][1] + (L[i1 + 1][1] - L[i1][1]) * f + dy);
      }
    });
    if (any) { ctx.globalAlpha = (lv + 0.5) / 8; ctx.lineWidth = lw; ctx.stroke(); }
  }
  const aa = 1 - g.ease.sine((aage - 0.82) / 0.16); // the accent stroke, same life cycle, with a pressure swell by chunks
  if (ahead > 0 && aa > 0) {
    const e = ahead * (N - 1), dx = DR * Math.cos(vo(2)), dy = DR * Math.sin(vo(3));
    for (let i = 0; i < Math.floor(e); i++) {
      g.pen(ctx, 'line', aa, g.c.accent); ctx.lineWidth *= 0.3 + 0.9 * Math.sin(Math.PI * (i + 0.5) / (N - 1));
      ctx.beginPath(); ctx.moveTo(acc[i][0] + dx, acc[i][1] + dy); ctx.lineTo(acc[i + 1][0] + dx, acc[i + 1][1] + dy); ctx.stroke();
    }
  }
}
