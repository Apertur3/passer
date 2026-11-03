// F02 Ruled disorder (after Vera Molnar's Interruptions and Frieder Nake's band compositions).
// One rule: horizontal bands of short strokes slide past one another, each band choosing its stroke direction from a probability table that slowly morphs between strict order and decay, while a travelling gap parts the strokes around it.
export const meta = {
  id: 'f02-ruled-disorder', title: 'Ruled disorder', T: 12, still: 0.3, start: 0.27, aspects: ['4:5', '16:9', '1:1'],
  label: 'Bands of short strokes slide past one another, each band drifting between one strict direction and a mix of verticals and diagonals, while a travelling gap parts the strokes around a moving point.',
  // rows, rowsWide: grid rows (portrait/square and 16:9); bands: number of bands; decay: how much removal a fully decayed band shows;
  // len: stroke length in pitches; travel: how far a band slides per loop (S); gap: radius of the travelling gap (S); bold: share of bold long strokes
  params: { rows: 27, rowsWide: 15, bands: 5, decay: 0.32, len: 0.92, travel: 0.7, gap: 0.1, bold: 0.07 },
};

const D2R = Math.PI / 180;
const pace = p => p + (0.15 * Math.sin(2 * Math.PI * p)) / (2 * Math.PI); // loop phase whose tempo swells (0.85x to 1.15x) but never stops; exact at 0 and 1
const voice = (g, k) => (g.voice ? g.voice(k) : g.theta * k); // independent phase k: detuned in live mode, integer harmonic in loop mode
const sm = (g, u) => g.ease.smoother(u);

export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('cells');
  const wide = g.aspect > 1.5, rows = wide ? P.rowsWide : P.rows, pitch = (2 * g.by) / rows, cols = Math.floor((2 * g.bx) / pitch);
  const K = Math.round(P.travel / pitch), x0 = -((cols - 1) * pitch) / 2, y0 = -((rows - 1) * pitch) / 2, B = P.bands, pp = pace(g.p);
  // split the rows into bands of random height separated by one empty row
  const wt = Array.from({ length: B }, () => 0.6 + r()), sum = wt.reduce((a, b) => a + b, 0), free = rows - (B - 1), band = [];
  for (let b = 0; b < B; b++) {
    const n = b === B - 1 ? free - band.filter(v => v >= 0).length : Math.max(2, Math.round((wt[b] / sum) * free));
    for (let k = 0; k < n; k++) band.push(b);
    if (b < B - 1) band.push(-1);
  }
  // per band: a dominant direction, a probability table over four directions (vertical, diagonal, horizontal, other diagonal), a level of order; all drift on their own voices
  const bd = Array.from({ length: B }, (_, b) => ({ dom: Math.floor(r() * 4), ph: [r() * 6.3, r() * 6.3, r() * 6.3, r() * 6.3, r() * 6.3], k: 2 + (b % 3), dir: b % 2 ? -1 : 1 }));
  const tab = bd.map((q, b) => {
    const order = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(voice(g, 2 + ((b + 1) % 3)) + q.ph[4]), 1.2), w = [0, 1, 2, 3].map(o => 0.1 + Math.pow(0.5 + 0.5 * Math.sin(voice(g, q.k) * (1 + (o % 2)) * 0.5 + voice(g, 3) * 0.2 + q.ph[o]), 2) + (o === q.dom ? 3 * order : 0));
    const s = w.reduce((a, c) => a + c, 0); let acc = 0; return { order, cum: w.slice(0, 3).map(v => (acc += v / s)) };
  });
  // per-cell attributes repeat every K columns, so a slide of K columns per loop returns exactly
  const cell = Array.from({ length: rows * K }, () => ({ u: r(), v: r(), ja: r() * 2 - 1, jx: r() * 2 - 1, jy: r() * 2 - 1, bold: r() < P.bold }));
  // the travelling gap sweeps the sheet once per loop and wanders vertically
  const RG = P.gap, gx = -g.bx + 2 * g.bx * ((g.p + 0.15) % 1), gy = g.by * 0.55 * Math.sin(0.1 * (g.drift || 0) + 1.3) + 0.06 * Math.sin(voice(g, 3));
  const paths = [new Path2D(), new Path2D()]; // fine, bold
  for (let j = 0; j < rows; j++) {
    const b = band[j] ?? -1; if (b < 0) continue;
    const q = bd[b], t = tab[b], dis = 1 - t.order;
    for (let i = 0; i < cols + K; i++) {
      const c = cell[j * K + (i % K)], X = x0 + (i - q.dir * K * pp - (q.dir < 0 ? K : 0)) * pitch;
      const xn = (X + g.bx) / (2 * g.bx), edge = Math.min(1, Math.min(X + g.bx, g.bx - X) / (1.6 * pitch)); if (edge <= 0) continue;
      let a = (90 - 45 * (sm(g, (c.u - t.cum[0]) / 0.12 + 0.5) + sm(g, (c.u - t.cum[1]) / 0.12 + 0.5) + sm(g, (c.u - t.cum[2]) / 0.12 + 0.5))) * D2R + c.ja * 0.35 * dis;
      const lvl = P.decay * dis + 0.22 * (0.5 - 0.5 * Math.cos(2 * Math.PI * (0.9 * xn - pp) + 0.6 * j / rows)) * (0.3 + dis); // removal level: decay of the band plus a travelling wave
      let s = sm(g, (c.v - lvl) / 0.2 + 0.5) * sm(g, edge);
      const cx = X + c.jx * 0.2 * pitch * dis, cy = y0 + j * pitch + c.jy * 0.2 * pitch * dis, dx = cx - gx, dy = cy - gy, d = Math.hypot(dx, dy);
      if (d < 2 * RG) { // parting: strokes inside vanish, the ring around turns to follow the gap's outline
        const w = sm(g, 1 - (d - 0.6 * RG) / (1.4 * RG)), tg = Math.atan2(dy, dx) + Math.PI / 2;
        a += w * (tg - a + Math.PI * Math.round((a - tg) / Math.PI)); s *= sm(g, (d - 0.6 * RG) / (0.4 * RG));
      }
      const L = P.len * pitch * s * (c.bold ? 1.5 : 1) / 2; if (s < 0.06) continue;
      const p = paths[c.bold ? 1 : 0]; p.moveTo(cx - Math.cos(a) * L, cy - Math.sin(a) * L); p.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    }
  }
  g.pen(ctx, 'fine', 0.86, g.c.ink); ctx.stroke(paths[0]);
  g.pen(ctx, 'line', 0.8, g.c.ink); ctx.stroke(paths[1]);
}
