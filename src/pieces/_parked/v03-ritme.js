// V03 Ritme (the rhythm sheet: a straight line becomes a wave, then a loop, then a tight loop).
// One rule: every row is the trochoid x = t - a sin t, y = a cos t drawn as a ribbon of three pencils, with a growing from 0 at the top row to about 1.8 at the bottom; each loop passes under its own entry.
export const meta = {
  id: 'v03-ritme', pencils: true, title: 'Ritme', nl: 'Ritme', T: 16, still: 0.3, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'x = t - a sin t, y = -a cos t; a = 0 line, a < 1 wave, a = 1 cusp, a > 1 loops (self-crossing at t = +-t*, t* = a sin t*); a grows by row from 0 to 1.8',
  label: 'Rows of one curve, the trochoid, drawn as three-pencil ribbons: a straight line at the top turns into a wave, then a cusp, then loops that tighten row by row, and the whole sheet slowly breathes and flows.',
  // rows: counts at 4:5 (fewer on wide pages); amax: loopiness of the last row; d: ribbon line spacing; ppp: points per period at q = 1
  params: { rows: 9, amax: 1.6, d: 0.0055, ppp: 56 },
};

const TAU = 2 * Math.PI, MAXP = 3000;
let PX = 0, PY = 0;
const SCR = { X: new Float64Array(MAXP), Y: new Float64Array(MAXP), NX: new Float64Array(MAXP), NY: new Float64Array(MAXP), DE: new Float64Array(MAXP), CI: new Float64Array(64) };

export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('rows'), R = Math.max(6, Math.min(10, g.aspect > 1.6 ? P.rows - 2 : g.aspect > 1.1 ? P.rows : P.rows - 1)), v = g.voice;
  const sp = (2 * g.by - 0.09) / (R - 1), k = 0.3 * sp, hw = g.hw + 0.12, q = Math.min(1, g.q ?? 1);
  const ppp = Math.max(30, Math.round(P.ppp * (0.6 + 0.4 * q))), du = TAU / ppp, U = hw / k + TAU, n = Math.min(MAXP - 1, Math.ceil(2 * U / du)), u0 = -U;
  const { X, Y, NX, NY, DE, CI } = SCR, lw = g.lw('line') * 1.15;
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink] : [g.c.accent, g.c.cool, g.c.third];
  const wide = 1 + 0.1 * Math.sin(v(1) + 0.8 + g.drift * 0.04); // the whole sheet breathes
  ctx.lineCap = 'butt';
  const at = (x, o) => { const i = Math.min(n - 1, Math.floor(x)), f = x - i, j = i + 1, dA = o * DE[i], dB = o * DE[j]; PX = X[i] + NX[i] * dA + (X[j] + NX[j] * dB - X[i] - NX[i] * dA) * f; PY = Y[i] + NY[i] * dA + (Y[j] + NY[j] * dB - Y[i] - NY[i] * dA) * f; };
  for (let row = 0; row < R; row++) {
    const yc = -g.by + 0.02 + row * sp, dir = row % 2 ? -1 : 1, ph = r() * TAU;
    // a grows down the page; each row breathes on its own voice, so neighbouring rows drift in and out of step
    const a = Math.abs(P.amax * wide * (row + 0.5 * Math.sin(v(2 + row % 3) + ph + g.drift * 0.05 * (1 + row % 2))) / (R - 1));
    const psi = dir * (v(2 + (row % 3)) + g.drift * 0.12) + ph, tp = ((psi % TAU) + TAU) % TAU;
    const d0 = P.d * (0.85 + 0.3 * Math.sin(v(5) + row * 0.9 + g.drift * 0.03));
    for (let i = 0; i <= n; i++) {
      const u = u0 + i * du, t = u + tp, c = Math.cos(t), s = Math.sin(t), tx = 1 - a * c, ty = -a * s, tl = Math.hypot(tx, ty) || 1e-6, kap = a * Math.abs(a - c) / (k * Math.pow(1 + a * a - 2 * a * c, 1.5) + 1e-9);
      X[i] = k * (u - a * s); Y[i] = yc + k * a * c; NX[i] = -ty / tl; NY[i] = tx / tl; DE[i] = d0 / Math.sqrt(Math.sqrt(1 + Math.pow(d0 * kap / 0.7, 4)));
    }
    // loops: the crossing is at t = +-ts with ts = a sin ts; the second pass (t = ts + 2 pi m) goes under. Each line of the under ribbon is cut where it meets the over ribbon,
    // so the cuts slant like the edge of the over ribbon: centre shifted by o * shi, half length hli (index units)
    let nc = 0, hli = 0, shi = 0;
    if (a > 1.02) {
      let lo = 1e-6, hi = Math.PI; for (let j = 0; j < 30; j++) { const m = (lo + hi) / 2; (m - a * Math.sin(m) < 0 ? lo = m : hi = m); }
      const ts = (lo + hi) / 2, tx = 1 - a * Math.cos(ts), ty = a * Math.sin(ts), vv = tx * tx + ty * ty, sn = -2 * tx * ty / vv, sU = (sn < 0 ? -1 : 1) * Math.max(0.2, Math.abs(sn)), cosT = (tx * tx - ty * ty) / vv, ds = k * Math.sqrt(vv) * du;
      const open = (z => z * z * (3 - 2 * z))(Math.min(1, (a - 1.02) / 0.3));
      hli = open * (d0 + 2.2 * lw) / Math.abs(sU) / ds; shi = -d0 * cosT / sU / ds;
      for (let m = Math.ceil((u0 + tp - ts) / TAU) - 1; nc < 62; m++) { const ci = (ts + TAU * m - tp - u0) / du; if (ci - hli - 2 > n) break; if (ci + hli + 2 > 0) CI[nc++] = ci; }
    }
    // draw: three lines, the cuts left empty
    for (let l = 0; l < 3; l++) {
      const o = l - 1; ctx.strokeStyle = cols[(l + row) % 3]; ctx.lineWidth = lw * (0.9 + 0.2 * r()); ctx.globalAlpha = 0.82 + 0.18 * r(); ctx.beginPath();
      let from = 0;
      for (let c = 0; c <= nc; c++) {
        const to = c < nc ? CI[c] + o * shi - hli : n;
        if (to > from) { const f0 = Math.max(0, Math.ceil(from)), f1 = Math.min(n, Math.floor(to)); at(Math.max(0, from), o); ctx.moveTo(PX, PY); for (let i = f0; i <= f1; i++) ctx.lineTo(X[i] + NX[i] * o * DE[i], Y[i] + NY[i] * o * DE[i]); at(Math.min(n, to), o); ctx.lineTo(PX, PY); }
        if (c < nc) from = CI[c] + o * shi + hli;
      }
      ctx.stroke();
    }
    // faint construction: the baseline and the envelope lines y = +-k a
    g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath(); ctx.moveTo(-hw, yc); ctx.lineTo(hw, yc); ctx.moveTo(-hw, yc - k * a); ctx.lineTo(hw, yc - k * a); ctx.moveTo(-hw, yc + k * a); ctx.lineTo(hw, yc + k * a); ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.globalAlpha = 1;
}
